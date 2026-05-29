import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { getSession, updateSession, clearSession } from "@/lib/bot-sessions";

// Demo clients for matching
const CLIENTS = [
  { name: "Fam. Smit", address: "Brinkstraat 15, Hengelo" },
  { name: "Kantoor De Brinck", address: "Marktstraat 8, Hengelo" },
  { name: "Fam. De Groot", address: "Deldenerstraat 42, Hengelo" },
];

export async function POST(request: NextRequest) {
  const update = await request.json();

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text?.trim().toLowerCase() ?? "";
  const photo = message.photo;
  const session = getSession(chatId);

  // /start command
  if (text === "/start") {
    await sendMessage(
      chatId,
      "🌿 <b>GreenSnap Bot</b>\n\n" +
        "Stuur een foto en ik maak er een voor/na-rapportage van.\n\n" +
        "Zo werkt het:\n" +
        "1. Stuur een foto\n" +
        "2. Kies: voor-foto of na-foto\n" +
        "3. Kies de klant\n" +
        "4. Klaar!\n\n" +
        "De eigenaar ziet alles in het dashboard."
    );
    clearSession(chatId);
    return NextResponse.json({ ok: true });
  }

  // Photo received
  if (photo && session.step === "idle") {
    const largestPhoto = photo[photo.length - 1];
    updateSession(chatId, {
      step: "waiting_type",
      photoFileId: largestPhoto.file_id,
    });

    await sendMessage(chatId, "📸 Foto ontvangen! Is dit een <b>voor</b>-foto of een <b>na</b>-foto?", {
      reply_markup: {
        keyboard: [
          [{ text: "🟠 Voor-foto" }, { text: "🟢 Na-foto" }],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Type selection
  if (session.step === "waiting_type") {
    const isBefore = text.includes("voor");
    const isAfter = text.includes("na");

    if (!isBefore && !isAfter) {
      await sendMessage(chatId, "Kies alsjeblieft: voor-foto of na-foto?");
      return NextResponse.json({ ok: true });
    }

    updateSession(chatId, {
      step: "waiting_client",
      photoType: isBefore ? "before" : "after",
    });

    const clientButtons = CLIENTS.map((c) => [{ text: c.name }]);
    await sendMessage(
      chatId,
      `${isBefore ? "🟠" : "🟢"} ${isBefore ? "Voor" : "Na"}-foto. Voor welke klant?`,
      {
        reply_markup: {
          keyboard: clientButtons,
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      }
    );
    return NextResponse.json({ ok: true });
  }

  // Client selection
  if (session.step === "waiting_client") {
    const matchedClient = CLIENTS.find(
      (c) => c.name.toLowerCase() === text || text.includes(c.name.toLowerCase().split(".")[1]?.trim() ?? "___")
    );

    if (!matchedClient) {
      await sendMessage(chatId, "Ik ken die klant niet. Kies een van de opties, of typ de naam precies.");
      return NextResponse.json({ ok: true });
    }

    // TODO: save to Supabase (photo file, type, client, user chat ID)
    const typeLabel = session.photoType === "before" ? "voor" : "na";
    await sendMessage(
      chatId,
      `✅ ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}-foto opgeslagen voor <b>${matchedClient.name}</b>!\n` +
        `📍 ${matchedClient.address}\n\n` +
        "Stuur nog een foto, of je bent klaar voor nu.",
      {
        reply_markup: { remove_keyboard: true },
      }
    );

    console.log("[GreenSnap Bot] Photo saved:", {
      chatId,
      photoFileId: session.photoFileId,
      type: session.photoType,
      client: matchedClient.name,
      timestamp: new Date().toISOString(),
    });

    clearSession(chatId);
    return NextResponse.json({ ok: true });
  }

  // Fallback
  if (!photo) {
    await sendMessage(
      chatId,
      "Stuur een foto om te beginnen! 📸\nOf typ /start voor uitleg."
    );
  }

  return NextResponse.json({ ok: true });
}
