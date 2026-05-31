import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  PHOTOS_BUCKET,
} from "@/lib/constants";

export async function POST(request: NextRequest) {
  const supabase = getServerClient();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const jobId = formData.get("jobId") as string | null;
  const tenantId = formData.get("tenantId") as string;
  const userId = formData.get("userId") as string;
  const type = formData.get("type") as "before" | "after";
  const caption = formData.get("caption") as string | null;

  if (!file || !tenantId || !userId || !type) {
    return NextResponse.json(
      { error: "file, tenantId, userId en type zijn verplicht" },
      { status: 400 }
    );
  }

  if (type !== "before" && type !== "after") {
    return NextResponse.json(
      { error: "type moet 'before' of 'after' zijn" },
      { status: 400 }
    );
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      {
        error: `Foto te groot (max ${Math.floor(MAX_PHOTO_BYTES / 1024 / 1024)} MB)`,
      },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Foto is leeg" }, { status: 400 });
  }

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Bestandstype niet toegestaan (${file.type}). Sta toe: ${ALLOWED_PHOTO_TYPES.join(", ")}`,
      },
      { status: 415 }
    );
  }

  // Unieke filename: timestamp + random suffix om collisions te vermijden
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const ext = (file.name.split(".").pop() ?? "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const storagePath = `${tenantId}/${jobId ?? "unsorted"}/${type}-${timestamp}-${randomSuffix}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload mislukt", details: uploadError.message },
      { status: 500 }
    );
  }

  const { data: photo, error: insertError } = await supabase
    .from("photos")
    .insert({
      job_id: jobId || null,
      tenant_id: tenantId,
      user_id: userId,
      type,
      storage_path: storagePath,
      caption: caption || null,
      source: "pwa",
      matched: !!jobId,
    })
    .select()
    .single();

  if (insertError) {
    // Cleanup uploaded file als DB insert faalt (geen weeskinderen)
    await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Database insert mislukt", details: insertError.message },
      { status: 500 }
    );
  }

  if (jobId) {
    const newStatus = type === "before" ? "before_done" : "photos_complete";
    await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
  }

  return NextResponse.json({ photo });
}
