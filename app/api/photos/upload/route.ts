import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
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

  const timestamp = Date.now();
  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${tenantId}/${jobId ?? "unsorted"}/${type}-${timestamp}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("photos")
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
    return NextResponse.json(
      { error: "Database insert mislukt", details: insertError.message },
      { status: 500 }
    );
  }

  if (jobId) {
    const newStatus = type === "before" ? "before_done" : "photos_complete";
    await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", jobId);
  }

  const { data: urlData } = supabase.storage
    .from("photos")
    .getPublicUrl(storagePath);

  return NextResponse.json({
    photo,
    publicUrl: urlData.publicUrl,
  });
}
