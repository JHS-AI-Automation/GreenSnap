import { NextRequest, NextResponse } from "next/server";
import { findNearestClient, isWithinTimeWindow } from "@/lib/matching";
import type { Client, Photo } from "@/types/database";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lat, lng, userId, type, takenAt } = body as {
    lat: number | null;
    lng: number | null;
    userId: string;
    type: "before" | "after";
    takenAt: string;
  };

  // TODO: replace with Supabase queries
  const demoClients: Client[] = [
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      tenant_id: "11111111-1111-1111-1111-111111111111",
      name: "Fam. Smit",
      address: "Brinkstraat 15, Hengelo",
      lat: 52.266,
      lng: 6.793,
      notes: null,
      created_at: new Date().toISOString(),
    },
  ];

  const result: {
    matched: boolean;
    clientId: string | null;
    jobId: string | null;
    method: string;
  } = {
    matched: false,
    clientId: null,
    jobId: null,
    method: "none",
  };

  // Step 1: GPS match
  if (lat !== null && lng !== null) {
    const nearestClient = findNearestClient(lat, lng, demoClients);
    if (nearestClient) {
      result.matched = true;
      result.clientId = nearestClient.id;
      result.method = "gps";
    }
  }

  // Step 2: time window check for after-photos
  if (result.matched && type === "after") {
    // TODO: query Supabase for before-photos of this user today
    const demoBeforePhotos: Photo[] = [];
    const matchingBefore = demoBeforePhotos.find(
      (p) =>
        p.user_id === userId &&
        p.type === "before" &&
        isWithinTimeWindow(p.taken_at, takenAt)
    );
    if (matchingBefore?.job_id) {
      result.jobId = matchingBefore.job_id;
    }
  }

  return NextResponse.json(result);
}
