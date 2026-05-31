import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { password, accessToken, refreshToken } = await request.json();

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Wachtwoord moet minimaal 8 tekens zijn" },
      { status: 400 }
    );
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Geen geldige token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Set session using the recovery tokens
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });

  if (sessionError) {
    return NextResponse.json(
      { error: "Token ongeldig of verlopen. Vraag een nieuwe reset-link aan." },
      { status: 401 }
    );
  }

  // Now update the password
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
