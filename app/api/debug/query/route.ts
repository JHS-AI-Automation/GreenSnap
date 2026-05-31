import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Initialize inline (not at module level)
  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error, count } = await supabase
    .from("clients")
    .select("id, name", { count: "exact" });

  return NextResponse.json({
    success: !error,
    error: error?.message ?? null,
    count,
    sample: data?.slice(0, 3) ?? [],
  });
}
