import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.BACKUP_API_KEY;

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerClient();
  const tables = ["tenants", "users", "clients", "jobs", "photos", "reports"];
  const backup: Record<string, unknown[]> = {};

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      backup[table] = [{ error: error.message }];
    } else {
      backup[table] = data ?? [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="greensnap-backup-${timestamp}.json"`,
    },
  });
}
