import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { DEMO_TENANT_ID } from "@/lib/constants";

export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, role")
    .eq("tenant_id", DEMO_TENANT_ID)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
