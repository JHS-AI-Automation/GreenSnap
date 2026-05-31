import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";

export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, role")
    .eq("tenant_id", DEMO_TENANT)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
