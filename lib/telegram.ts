const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(chatId: number, text: string, options?: {
  reply_markup?: object;
}) {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options,
    }),
  });
  return res.json();
}

export async function getFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const data = await res.json();
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const url = await getFileUrl(fileId);
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const res = await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    }),
  });
  return res.json();
}

export async function setWebhook(webhookUrl: string) {
  const res = await fetch(`${API_BASE}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      // Zonder deze lijst stuurt Telegram geen callback-knoppen of live-locatie-updates
      allowed_updates: ["message", "edited_message", "callback_query"],
    }),
  });
  return res.json();
}
