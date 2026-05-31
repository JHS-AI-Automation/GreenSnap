import { NextRequest, NextResponse } from "next/server";
import { findNearestClient, isWithinTimeWindow } from "@/lib/matching";
import { getServerClient } from "@/lib/supabase";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lat, lng, userId, type, takenAt } = body as {
    lat: number | null;
    lng: number | null;
    userId: string;
    type: "before" | "after";
    takenAt: string;
  };

  const supabase = getServerClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, address, lat, lng")
    .eq("tenant_id", DEMO_TENANT);

  const result = {
    matched: false,
    clientId: null as string | null,
    jobId: null as string | null,
    method: "none",
  };

  if (lat !== null && lng !== null && clients) {
    const nearestClient = findNearestClient(lat, lng, clients);
    if (nearestClient) {
      result.matched = true;
      result.clientId = nearestClient.id;
      result.method = "gps";
    }
  }

  if (result.matched && type === "after") {
    const today = new Date().toISOString().split("T")[0];
    const { data: beforePhotos } = await supabase
      .from("photos")
      .select("id, user_id, job_id, taken_at, type")
      .eq("tenant_id", DEMO_TENANT)
      .eq("user_id", userId)
      .eq("type", "before")
      .gte("taken_at", `${today}T00:00:00`);

    const matchingBefore = beforePhotos?.find(
      (p) => isWithinTimeWindow(p.taken_at, takenAt)
    );

    if (matchingBefore?.job_id) {
      result.jobId = matchingBefore.job_id;
    }
  }

  return NextResponse.json(result);
}
