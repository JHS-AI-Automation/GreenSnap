import { NextRequest, NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      {
        error: "Geef ?url=https://jouw-domein.com/api/telegram mee",
        hint: "Gebruik ngrok of Vercel preview URL voor lokaal testen",
      },
      { status: 400 }
    );
  }

  const result = await setWebhook(url);
  return NextResponse.json({
    message: "Webhook ingesteld",
    webhookUrl: url,
    telegramResponse: result,
  });
}
