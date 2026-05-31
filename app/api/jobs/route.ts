import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";

export async function GET(request: NextRequest) {
  const supabase = getServerClient();
  const date = request.nextUrl.searchParams.get("date");

  let query = supabase
    .from("jobs")
    .select("id, status, scheduled_date, notes, client:clients(id, name, address), user:users(id, name)")
    .eq("tenant_id", DEMO_TENANT)
    .order("scheduled_date", { ascending: false });

  if (date) {
    query = query.eq("scheduled_date", date);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientId, userId, scheduledDate, notes } = body as {
    clientId: string;
    userId: string;
    scheduledDate: string;
    notes?: string;
  };

  if (!clientId || !userId || !scheduledDate) {
    return NextResponse.json(
      { error: "Klant, medewerker en datum zijn verplicht" },
      { status: 400 }
    );
  }

  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      tenant_id: DEMO_TENANT,
      client_id: clientId,
      user_id: userId,
      status: "open",
      scheduled_date: scheduledDate,
      notes: notes || null,
    })
    .select("id, status, scheduled_date, notes, client:clients(id, name, address), user:users(id, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
