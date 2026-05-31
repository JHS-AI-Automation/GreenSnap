import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocoding";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";

interface ImportRow {
  name: string;
  address: string;
  notes?: string;
}

interface ImportResult {
  row: number;
  name: string;
  address: string;
  status: "success" | "geocode_failed" | "duplicate" | "error";
  lat?: number;
  lng?: number;
  error?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { rows, dryRun } = body as {
    rows: ImportRow[];
    dryRun?: boolean;
  };

  if (!rows?.length) {
    return NextResponse.json({ error: "Geen rijen om te importeren" }, { status: 400 });
  }

  if (rows.length > 200) {
    return NextResponse.json({ error: "Maximum 200 klanten per import" }, { status: 400 });
  }

  const supabase = getServerClient();
  const results: ImportResult[] = [];

  const { data: existing } = await supabase
    .from("clients")
    .select("name, address")
    .eq("tenant_id", DEMO_TENANT);

  const existingSet = new Set(
    (existing ?? []).map((c) => `${c.name.toLowerCase()}|${c.address.toLowerCase()}`)
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.name || !row.address) {
      results.push({
        row: i + 1,
        name: row.name || "(leeg)",
        address: row.address || "(leeg)",
        status: "error",
        error: "Naam en adres zijn verplicht",
      });
      continue;
    }

    const key = `${row.name.toLowerCase()}|${row.address.toLowerCase()}`;
    if (existingSet.has(key)) {
      results.push({
        row: i + 1,
        name: row.name,
        address: row.address,
        status: "duplicate",
      });
      continue;
    }

    // Rate limit: 1 request per seconde voor Nominatim
    if (i > 0) await sleep(1100);

    const geo = await geocodeAddress(row.address);
    if (!geo) {
      results.push({
        row: i + 1,
        name: row.name,
        address: row.address,
        status: "geocode_failed",
      });
      continue;
    }

    if (!dryRun) {
      const { error } = await supabase.from("clients").insert({
        tenant_id: DEMO_TENANT,
        name: row.name,
        address: row.address,
        lat: geo.lat,
        lng: geo.lng,
        notes: row.notes || null,
      });

      if (error) {
        results.push({
          row: i + 1,
          name: row.name,
          address: row.address,
          status: "error",
          error: error.message,
        });
        continue;
      }
    }

    existingSet.add(key);
    results.push({
      row: i + 1,
      name: row.name,
      address: row.address,
      status: "success",
      lat: geo.lat,
      lng: geo.lng,
    });
  }

  const summary = {
    total: rows.length,
    success: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "geocode_failed").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    errors: results.filter((r) => r.status === "error").length,
    dryRun: !!dryRun,
  };

  return NextResponse.json({ summary, results });
}
