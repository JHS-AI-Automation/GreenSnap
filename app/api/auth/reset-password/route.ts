import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "E-mailadres is verplicht" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Build redirect URL based on request origin
  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const redirectTo = `${origin}/reset-password/confirm`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // Bewust generieke melding terug (security: niet onthullen of email bestaat)
  if (error) {
    console.error("[Reset Password] Error:", error.message);
  }

  return NextResponse.json({ ok: true });
}
