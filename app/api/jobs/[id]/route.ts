import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, status, scheduled_date, notes, client:clients(id, name, address), user:users(id, name)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Fetch photos for this job
  const { data: photos } = await supabase
    .from("photos")
    .select("id, type, storage_path, taken_at, caption, source")
    .eq("job_id", id)
    .order("taken_at", { ascending: true });

  // Generate signed URLs (private bucket)
  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data: signedUrl } = await supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, 3600);
      return { ...p, url: signedUrl?.signedUrl ?? null };
    })
  );

  return NextResponse.json({
    ...data,
    photos: photosWithUrls,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServerClient();

  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const supabase = getServerClient();

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
