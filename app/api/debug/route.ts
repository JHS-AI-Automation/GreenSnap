import { NextResponse } from "next/server";

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

  let serviceKeyRole: string | null = null;
  if (serviceKey) {
    try {
      const payload = JSON.parse(
        Buffer.from(serviceKey.split(".")[1], "base64").toString()
      );
      serviceKeyRole = payload.role ?? "unknown";
    } catch {
      serviceKeyRole = "parse_error";
    }
  }

  return NextResponse.json({
    deployed_at: new Date().toISOString(),
    env: {
      SUPABASE_URL_set: !!url,
      SUPABASE_URL_prefix: url?.substring(0, 30) ?? null,
      ANON_KEY_set: !!anonKey,
      ANON_KEY_prefix: anonKey?.substring(0, 10) ?? null,
      SERVICE_ROLE_KEY_set: !!serviceKey,
      SERVICE_ROLE_KEY_prefix: serviceKey?.substring(0, 10) ?? null,
      SERVICE_ROLE_KEY_length: serviceKey?.length ?? 0,
      SERVICE_ROLE_KEY_decoded_role: serviceKeyRole,
      TELEGRAM_BOT_TOKEN_set: !!telegramToken,
    },
  });
}
