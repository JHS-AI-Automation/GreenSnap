import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { DEMO_TENANT_ID } from "@/lib/constants";
import { isoDateOrNull } from "@/lib/date-utils";

const JOB_SELECT =
  "id, status, scheduled_date, notes, client:clients(id, name, address), user:users(id, name)";

export async function GET(request: NextRequest) {
  const supabase = getServerClient();
  const date = request.nextUrl.searchParams.get("date");

  let query = supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("tenant_id", DEMO_TENANT_ID)
    .order("scheduled_date", { ascending: false });

  if (date) {
    const validDate = isoDateOrNull(date);
    if (!validDate) {
      return NextResponse.json(
        { error: "Ongeldige datum (verwacht YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    query = query.eq("scheduled_date", validDate);
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
    clientId?: string;
    userId?: string;
    scheduledDate?: string;
    notes?: string;
  };

  if (!clientId || !userId || !scheduledDate) {
    return NextResponse.json(
      { error: "Klant, medewerker en datum zijn verplicht" },
      { status: 400 }
    );
  }

  const validDate = isoDateOrNull(scheduledDate);
  if (!validDate) {
    return NextResponse.json(
      { error: "Ongeldige datum (verwacht YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const supabase = getServerClient();

  // Voorkom FK error met duidelijker bericht: check eerst dat klant + user bestaan
  const [{ data: client }, { data: user }] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("tenant_id", DEMO_TENANT_ID)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("tenant_id", DEMO_TENANT_ID)
      .maybeSingle(),
  ]);

  if (!client) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }
  if (!user) {
    return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      tenant_id: DEMO_TENANT_ID,
      client_id: clientId,
      user_id: userId,
      status: "open",
      scheduled_date: validDate,
      notes: notes?.trim() || null,
    })
    .select(JOB_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
