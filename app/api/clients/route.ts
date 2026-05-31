import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocoding";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";

export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, address, lat, lng, notes, created_at")
    .eq("tenant_id", DEMO_TENANT)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, address, notes } = body as {
    name: string;
    address: string;
    notes?: string;
  };

  if (!name || !address) {
    return NextResponse.json(
      { error: "Naam en adres zijn verplicht" },
      { status: 400 }
    );
  }

  const geo = await geocodeAddress(address);
  if (!geo) {
    return NextResponse.json(
      { error: "Adres niet gevonden. Controleer het adres en probeer opnieuw." },
      { status: 422 }
    );
  }

  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      tenant_id: DEMO_TENANT,
      name,
      address,
      lat: geo.lat,
      lng: geo.lng,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    client: data,
    geocoded: {
      lat: geo.lat,
      lng: geo.lng,
      displayName: geo.displayName,
    },
  });
}
