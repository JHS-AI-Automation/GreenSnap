import { NextRequest, NextResponse } from "next/server";
import { sendMessage, downloadFile } from "@/lib/telegram";
import { getSession, updateSession, clearSession } from "@/lib/bot-sessions";
import { supabase } from "@/lib/supabase";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";
const DEMO_USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

async function getClients() {
  const { data } = await supabase
    .from("clients")
    .select("id, name, address")
    .eq("tenant_id", DEMO_TENANT);
  return data ?? [];
}

async function findJobForClient(clientId: string) {
  const { data } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("scheduled_date", new Date().toISOString().split("T")[0])
    .limit(1)
    .single();
  return data;
}

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
      "📸 <b>Foto-rapportage Bot</b>\n\n" +
        "Stuur een foto en ik sla hem op als voor- of na-foto.\n\n" +
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

    const clients = await getClients();
    const clientButtons = clients.map((c) => [{ text: c.name }]);

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

  // Client selection - download photo, upload to Supabase, save record
  if (session.step === "waiting_client" && session.photoFileId) {
    const clients = await getClients();
    const matchedClient = clients.find(
      (c) =>
        c.name.toLowerCase() === text ||
        text.includes(c.name.toLowerCase().split(".")[1]?.trim() ?? "___")
    );

    if (!matchedClient) {
      await sendMessage(chatId, "Ik ken die klant niet. Kies een van de opties.");
      return NextResponse.json({ ok: true });
    }

    // Download photo from Telegram
    const photoBuffer = await downloadFile(session.photoFileId);
    const timestamp = Date.now();
    const storagePath = `${DEMO_TENANT}/${matchedClient.id}/${session.photoType}-${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, photoBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Bot] Upload error:", uploadError);
      await sendMessage(chatId, "❌ Fout bij uploaden. Probeer opnieuw.");
      clearSession(chatId);
      return NextResponse.json({ ok: true });
    }

    // Find today's job for this client
    const job = await findJobForClient(matchedClient.id);

    // Save photo record in database
    const { error: insertError } = await supabase.from("photos").insert({
      job_id: job?.id ?? null,
      tenant_id: DEMO_TENANT,
      user_id: DEMO_USER,
      type: session.photoType,
      storage_path: storagePath,
      source: "telegram",
      matched: !!job,
    });

    if (insertError) {
      console.error("[Bot] Insert error:", insertError);
    }

    // Update job status
    if (job) {
      const newStatus = session.photoType === "before" ? "before_done" : "photos_complete";
      await supabase.from("jobs").update({ status: newStatus }).eq("id", job.id);
    }

    const typeLabel = session.photoType === "before" ? "Voor" : "Na";
    await sendMessage(
      chatId,
      `✅ ${typeLabel}-foto opgeslagen voor <b>${matchedClient.name}</b>!\n` +
        `📍 ${matchedClient.address}\n` +
        (job ? `📋 Gekoppeld aan opdracht van vandaag\n` : `📋 Opgeslagen als losse foto\n`) +
        "\nStuur nog een foto, of je bent klaar voor nu.",
      { reply_markup: { remove_keyboard: true } }
    );

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
