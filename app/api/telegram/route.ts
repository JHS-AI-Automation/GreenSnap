import { NextRequest, NextResponse } from "next/server";
import { sendMessage, downloadFile } from "@/lib/telegram";
import { getSession, updateSession, clearSession } from "@/lib/bot-sessions";
import { supabase } from "@/lib/supabase";
import { findNearestClient } from "@/lib/matching";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";
const DEMO_USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

interface ClientRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

async function getClients(): Promise<ClientRow[]> {
  const { data } = await supabase
    .from("clients")
    .select("id, name, address, lat, lng")
    .eq("tenant_id", DEMO_TENANT);
  return (data as ClientRow[]) ?? [];
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

async function savePhotos(
  fileIds: string[],
  photoType: "before" | "after",
  clientId: string,
  clientName: string,
  clientAddress: string
) {
  const job = await findJobForClient(clientId);
  let savedCount = 0;

  for (const fileId of fileIds) {
    const photoBuffer = await downloadFile(fileId);
    const timestamp = Date.now();
    const storagePath = `${DEMO_TENANT}/${clientId}/${photoType}-${timestamp}-${savedCount}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, photoBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Bot] Upload error:", uploadError);
      continue;
    }

    await supabase.from("photos").insert({
      job_id: job?.id ?? null,
      tenant_id: DEMO_TENANT,
      user_id: DEMO_USER,
      type: photoType,
      storage_path: storagePath,
      source: "telegram",
      matched: !!job,
    });

    savedCount++;
  }

  if (job) {
    const newStatus = photoType === "before" ? "before_done" : "photos_complete";
    await supabase.from("jobs").update({ status: newStatus }).eq("id", job.id);
  }

  return { savedCount, jobLinked: !!job, clientName, clientAddress };
}

export async function POST(request: NextRequest) {
  const update = await request.json();
  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text?.trim().toLowerCase() ?? "";
  const photo = message.photo;
  const voice = message.voice;
  const location = message.location;
  const session = getSession(chatId);

  // === /start ===
  if (text === "/start") {
    await sendMessage(
      chatId,
      "📸 <b>Foto-rapportage Bot</b>\n\n" +
        "Stuur foto's en ik maak er een voor/na-rapport van.\n\n" +
        "<b>Zo werkt het:</b>\n" +
        "1. Kies: stuur je <b>VOOR</b>-foto's of <b>NA</b>-foto's?\n" +
        "2. Stuur 1 of meer foto's\n" +
        "3. Kies de klant (of stuur je locatie 📍)\n" +
        "4. Klaar! Stuur meer foto's of begin opnieuw\n\n" +
        "💡 <i>Tip: stuur eerst alle VOOR-foto's bij aankomst, dan alle NA-foto's bij vertrek.</i>\n" +
        "🎤 <i>Je kunt ook een spraakbericht sturen als opmerking bij je foto's.</i>"
    );
    clearSession(chatId);
    return NextResponse.json({ ok: true });
  }

  // === VOICE MESSAGE: save as audio note ===
  if (voice) {
    const voiceBuffer = await downloadFile(voice.file_id);
    const timestamp = Date.now();
    const storagePath = `${DEMO_TENANT}/voice-notes/opmerking-${timestamp}.ogg`;

    const { error } = await supabase.storage
      .from("photos")
      .upload(storagePath, voiceBuffer, {
        contentType: "audio/ogg",
        upsert: false,
      });

    if (error) {
      console.error("[Bot] Voice upload error:", error);
      await sendMessage(chatId, "❌ Kon spraakbericht niet opslaan. Probeer opnieuw.");
      return NextResponse.json({ ok: true });
    }

    const { data: urlData } = supabase.storage.from("photos").getPublicUrl(storagePath);

    await sendMessage(
      chatId,
      "🎤 Spraakbericht opgeslagen!\n" +
        "De eigenaar kan dit beluisteren in het dashboard.\n\n" +
        "💡 <i>Stuur een foto om verder te gaan met de rapportage.</i>"
    );

    console.log("[Bot] Voice note saved:", { chatId, path: storagePath, url: urlData.publicUrl });
    return NextResponse.json({ ok: true });
  }

  // === IDLE: first interaction ===
  if (session.step === "idle") {
    // Photo received while idle: ask type first
    if (photo) {
      const largestPhoto = photo[photo.length - 1];
      updateSession(chatId, {
        step: "waiting_type",
        photoFileIds: [largestPhoto.file_id],
      });

      await sendMessage(
        chatId,
        "📸 Foto ontvangen!\n\n" +
          "Zijn dit <b>VOOR</b>-foto's (bij aankomst, voor het werk)?\n" +
          "Of <b>NA</b>-foto's (na het werk)?",
        {
          reply_markup: {
            keyboard: [
              [{ text: "🟠 VOOR-foto's (voor het werk)" }],
              [{ text: "🟢 NA-foto's (na het werk)" }],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        }
      );
      return NextResponse.json({ ok: true });
    }

    await sendMessage(
      chatId,
      "Stuur een foto om te beginnen! 📸\nOf typ /start voor uitleg."
    );
    return NextResponse.json({ ok: true });
  }

  // === WAITING_TYPE: user picks before/after ===
  if (session.step === "waiting_type") {
    // Extra photo while choosing type: add to queue
    if (photo) {
      const largestPhoto = photo[photo.length - 1];
      updateSession(chatId, {
        photoFileIds: [...session.photoFileIds, largestPhoto.file_id],
      });
      await sendMessage(chatId, `📸 +1 foto (${session.photoFileIds.length} totaal). Kies nog even: VOOR of NA?`);
      return NextResponse.json({ ok: true });
    }

    const isBefore = text.includes("voor");
    const isAfter = text.includes("na");

    if (!isBefore && !isAfter) {
      await sendMessage(chatId, "Kies alsjeblieft: zijn dit VOOR-foto's of NA-foto's?");
      return NextResponse.json({ ok: true });
    }

    updateSession(chatId, {
      step: "collecting_photos",
      photoType: isBefore ? "before" : "after",
    });

    const typeEmoji = isBefore ? "🟠" : "🟢";
    const typeLabel = isBefore ? "VOOR" : "NA";
    const count = session.photoFileIds.length;

    const clients = await getClients();
    const clientButtons = clients.map((c) => [{ text: c.name }]);
    clientButtons.push([{ text: "📍 Stuur mijn locatie" }]);
    clientButtons.push([{ text: "✅ Klaar, opslaan" }]);

    await sendMessage(
      chatId,
      `${typeEmoji} ${count} ${typeLabel}-foto('s).\n\n` +
        "Je kunt nu:\n" +
        "• Meer foto's sturen (ik tel ze mee)\n" +
        "• Een <b>klant kiezen</b> uit de lijst\n" +
        "• Je <b>locatie sturen</b> 📍 (ik zoek de dichtstbijzijnde klant)\n" +
        "• <b>Klaar</b> tikken als je alle foto's hebt gestuurd",
      {
        reply_markup: {
          keyboard: clientButtons,
          one_time_keyboard: false,
          resize_keyboard: true,
        },
      }
    );
    return NextResponse.json({ ok: true });
  }

  // === COLLECTING_PHOTOS: adding more photos or selecting client ===
  if (session.step === "collecting_photos") {
    // More photos coming in: add to queue
    if (photo) {
      const largestPhoto = photo[photo.length - 1];
      const updated = [...session.photoFileIds, largestPhoto.file_id];
      updateSession(chatId, { photoFileIds: updated });

      const typeLabel = session.photoType === "before" ? "VOOR" : "NA";
      await sendMessage(chatId, `📸 +1 ${typeLabel}-foto (${updated.length} totaal). Stuur meer of kies de klant.`);
      return NextResponse.json({ ok: true });
    }

    // Location received: GPS match
    if (location) {
      const clients = await getClients();
      const nearest = findNearestClient(location.latitude, location.longitude, clients);

      if (!nearest) {
        await sendMessage(
          chatId,
          "📍 Geen klant gevonden binnen 150 meter van je locatie.\nKies handmatig uit de lijst."
        );
        return NextResponse.json({ ok: true });
      }

      // Auto-match found, save all photos
      const result = await savePhotos(
        session.photoFileIds,
        session.photoType!,
        nearest.id,
        nearest.name,
        nearest.address
      );

      const typeLabel = session.photoType === "before" ? "VOOR" : "NA";
      await sendMessage(
        chatId,
        `📍 Locatie herkend!\n\n` +
          `✅ <b>${result.savedCount} ${typeLabel}-foto('s)</b> opgeslagen voor <b>${result.clientName}</b>\n` +
          `📍 ${result.clientAddress}\n` +
          (result.jobLinked ? "📋 Gekoppeld aan opdracht van vandaag\n" : "") +
          "\nStuur meer foto's of typ /start om opnieuw te beginnen.",
        { reply_markup: { remove_keyboard: true } }
      );

      clearSession(chatId);
      return NextResponse.json({ ok: true });
    }

    // "Stuur mijn locatie" button: Telegram can't auto-send location from keyboard
    if (text.includes("locatie")) {
      await sendMessage(
        chatId,
        "📍 Tik op het 📎 paperclip-icoon onderaan en kies <b>Locatie</b> om je GPS-positie te sturen.\n\n" +
          "Of kies een klant uit de lijst hierboven."
      );
      return NextResponse.json({ ok: true });
    }

    // "Klaar" without client selected
    if (text.includes("klaar") || text.includes("opslaan")) {
      if (!session.clientId) {
        await sendMessage(chatId, "Kies eerst een klant of stuur je locatie 📍 voordat je opslaat.");
        return NextResponse.json({ ok: true });
      }
    }

    // Client selection by name
    const clients = await getClients();
    const matchedClient = clients.find(
      (c) =>
        c.name.toLowerCase() === text ||
        text.includes(c.name.toLowerCase().split(".")[1]?.trim() ?? "___")
    );

    if (!matchedClient) {
      await sendMessage(chatId, "Ik ken die klant niet. Kies een van de opties, of stuur je locatie 📍.");
      return NextResponse.json({ ok: true });
    }

    // Client matched, save all photos
    const result = await savePhotos(
      session.photoFileIds,
      session.photoType!,
      matchedClient.id,
      matchedClient.name,
      matchedClient.address
    );

    const typeLabel = session.photoType === "before" ? "VOOR" : "NA";
    const nextType = session.photoType === "before" ? "NA" : "VOOR";
    await sendMessage(
      chatId,
      `✅ <b>${result.savedCount} ${typeLabel}-foto('s)</b> opgeslagen voor <b>${result.clientName}</b>!\n` +
        `📍 ${result.clientAddress}\n` +
        (result.jobLinked ? "📋 Gekoppeld aan opdracht van vandaag\n" : "📋 Opgeslagen als losse foto's\n") +
        `\n💡 <i>Stuur nu je ${nextType}-foto's, of typ /start voor een nieuwe klant.</i>`,
      { reply_markup: { remove_keyboard: true } }
    );

    clearSession(chatId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
