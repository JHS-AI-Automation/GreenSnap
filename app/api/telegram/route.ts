import { NextRequest, NextResponse } from "next/server";
import { sendMessage, downloadFile, answerCallbackQuery } from "@/lib/telegram";
import { getSession, updateSession, clearSession } from "@/lib/bot-sessions";
import { getServerClient } from "@/lib/supabase";
import { findNearestClient } from "@/lib/matching";
import { PHOTOS_BUCKET } from "@/lib/constants";
import {
  formatClientButtonLabel,
  parseClientButtonText,
} from "@/lib/telegram-helpers";
import { resolveUserByChatId, linkUserByCode } from "@/lib/bot-user";
import {
  getTodaysJobs,
  getRunningEntry,
  startClock,
  stopClock,
} from "@/lib/clock-db";
import { formatDuration } from "@/lib/clock-format";
import { evaluateGeofence, type GeofenceJob } from "@/lib/geofence";
import type { User } from "@/types/database";

const supabase = getServerClient();

interface ClientRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

async function getClients(tenantId: string): Promise<ClientRow[]> {
  const { data } = await supabase
    .from("clients")
    .select("id, name, address, lat, lng")
    .eq("tenant_id", tenantId);
  return (data as ClientRow[]) ?? [];
}

async function findJobForClient(clientId: string, userId: string) {
  const { data } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .eq("scheduled_date", new Date().toISOString().split("T")[0])
    .limit(1)
    .maybeSingle();
  return data;
}

async function savePhotos(
  user: User,
  fileIds: string[],
  photoType: "before" | "after",
  clientId: string,
  clientName: string,
  clientAddress: string
) {
  const job = await findJobForClient(clientId, user.id);
  let savedCount = 0;

  for (const fileId of fileIds) {
    const photoBuffer = await downloadFile(fileId);
    const timestamp = Date.now();
    const storagePath = `${user.tenant_id}/${clientId}/${photoType}-${timestamp}-${savedCount}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
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
      tenant_id: user.tenant_id,
      user_id: user.id,
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

// Live-locatie-update: geofence-check tegen jobs van vandaag, prompt bij aankomst/vertrek.
async function handleLocationUpdate(user: User, chatId: number, lat: number, lng: number) {
  const { data: prevRow } = await supabase
    .from("worker_locations")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const prev = {
    nearClientId: prevRow?.near_client_id ?? null,
    promptedJobId: prevRow?.prompted_job_id ?? null,
  };

  const jobs = await getTodaysJobs(user.id, user.tenant_id);
  const geofenceJobs: GeofenceJob[] = jobs.map((j) => ({
    jobId: j.id,
    clientId: j.client.id,
    clientName: j.client.name,
    lat: j.client.lat,
    lng: j.client.lng,
  }));
  const runningEntry = await getRunningEntry(user.id);
  const running = runningEntry
    ? { jobId: runningEntry.job_id, entryId: runningEntry.id }
    : null;

  const result = evaluateGeofence(prev, { lat, lng }, geofenceJobs, running);

  const { error: upsertError } = await supabase.from("worker_locations").upsert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    lat,
    lng,
    updated_at: new Date().toISOString(),
    near_client_id: result.state.nearClientId,
    prompted_job_id: result.state.promptedJobId,
  });
  if (upsertError) {
    console.error("[Bot] worker_locations upsert:", upsertError);
  }

  if (result.action === "prompt_start" && result.job) {
    await sendMessage(
      chatId,
      `📍 Je bent aangekomen bij <b>${result.job.clientName}</b>. Klok starten?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "▶ Start klok", callback_data: `ck:start:${result.job.jobId}` }],
          ],
        },
      }
    );
  } else if (result.action === "prompt_stop" && result.job) {
    await sendMessage(
      chatId,
      `📍 Je bent vertrokken bij <b>${result.job.clientName}</b>. Klok stoppen?`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "⏹ Stop klok", callback_data: "ck:stop" }]],
        },
      }
    );
  }
}

// Klok-knoppen (▶/⏹) uit /vandaag en geofence-prompts.
async function handleCallbackQuery(callbackQuery: {
  id: string;
  data?: string;
  message?: { chat?: { id?: number } };
}) {
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data ?? "";
  if (!chatId) {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  const user = await resolveUserByChatId(chatId);
  if (!user) {
    await answerCallbackQuery(callbackQuery.id, "Niet gekoppeld. Stuur /koppel CODE.");
    return;
  }

  if (data.startsWith("ck:start:")) {
    const jobId = data.slice("ck:start:".length);
    const result = await startClock(user.id, user.tenant_id, jobId, "manual_telegram");
    if ("error" in result) {
      await answerCallbackQuery(
        callbackQuery.id,
        result.error === "already_running"
          ? "Klok loopt al op deze opdracht."
          : "Klok starten mislukt, probeer opnieuw."
      );
      return;
    }
    await answerCallbackQuery(callbackQuery.id, "Klok gestart ✅");
    let msg = "▶ <b>Klok gestart.</b>";
    if (result.stopped) {
      const ms = Date.now() - new Date(result.stopped.started_at).getTime();
      msg += `\n<i>Vorige klok automatisch gestopt na ${formatDuration(ms)}.</i>`;
    }
    await sendMessage(chatId, msg);
    return;
  }

  if (data === "ck:stop") {
    const running = await getRunningEntry(user.id);
    if (!running) {
      await answerCallbackQuery(callbackQuery.id, "Er loopt geen klok.");
      return;
    }
    const result = await stopClock(running.id);
    if ("error" in result) {
      await answerCallbackQuery(callbackQuery.id, "Klok stoppen mislukt, probeer opnieuw.");
      return;
    }
    const ms =
      new Date(result.entry.stopped_at!).getTime() -
      new Date(result.entry.started_at).getTime();
    await answerCallbackQuery(callbackQuery.id, "Klok gestopt ✅");
    await sendMessage(chatId, `⏹ <b>Klok gestopt</b> na ${formatDuration(ms)}.`);
    return;
  }

  await answerCallbackQuery(callbackQuery.id);
}

// Dagplanning met start/stop-knoppen per job.
async function sendVandaag(user: User, chatId: number) {
  const jobs = await getTodaysJobs(user.id, user.tenant_id);
  if (jobs.length === 0) {
    await sendMessage(chatId, "📅 Geen opdrachten gepland voor vandaag.");
    return;
  }
  const running = await getRunningEntry(user.id);

  const lines = jobs.map((j, i) => {
    const marker = running?.job_id === j.id ? " ⏱ <b>(klok loopt)</b>" : "";
    return `${i + 1}. <b>${j.client.name}</b>${marker}\n   📍 ${j.client.address}`;
  });
  const buttons = jobs.map((j) =>
    running?.job_id === j.id
      ? [{ text: `⏹ Stop ${j.client.name}`, callback_data: "ck:stop" }]
      : [{ text: `▶ Start ${j.client.name}`, callback_data: `ck:start:${j.id}` }]
  );

  await sendMessage(
    chatId,
    `📅 <b>Jouw planning voor vandaag</b>\n\n${lines.join("\n")}`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json();

  // === CALLBACK QUERY: klok-knoppen ===
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return NextResponse.json({ ok: true });
  }

  // === EDITED MESSAGE: live-locatie-updates voor geofence ===
  if (update.edited_message?.location) {
    const locChatId = update.edited_message.chat.id;
    const locUser = await resolveUserByChatId(locChatId);
    if (locUser) {
      await handleLocationUpdate(
        locUser,
        locChatId,
        update.edited_message.location.latitude,
        update.edited_message.location.longitude
      );
    }
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text?.trim().toLowerCase() ?? "";
  const photo = message.photo;
  const voice = message.voice;
  const location = message.location;
  const session = getSession(chatId);

  // === /koppel CODE: chat aan medewerker koppelen (werkt zonder bestaande koppeling) ===
  const koppelMatch = text.match(/^\/koppel\s+([a-z0-9]+)$/i);
  if (koppelMatch) {
    const result = await linkUserByCode(chatId, koppelMatch[1]);
    if ("error" in result) {
      const uitleg =
        result.error === "expired"
          ? "Deze koppelcode is verlopen. Vraag je werkgever om een nieuwe code."
          : result.error === "not_found"
          ? "Deze koppelcode ken ik niet. Controleer de code en probeer opnieuw."
          : "Er ging iets mis bij het koppelen. Probeer het later opnieuw.";
      await sendMessage(chatId, `❌ ${uitleg}`);
      return NextResponse.json({ ok: true });
    }
    await sendMessage(
      chatId,
      `✅ Welkom <b>${result.user.name}</b>! Je bent gekoppeld.\n\n` +
        "📅 Typ /vandaag voor je planning met start/stop-knoppen.\n" +
        "📸 Stuur foto's voor een voor/na-rapport.\n" +
        "📍 Deel 's ochtends je live-locatie en ik vraag automatisch of de klok aan moet bij aankomst."
    );
    return NextResponse.json({ ok: true });
  }

  // === Niet-gekoppelde chats krijgen alleen koppel-instructie ===
  const user = await resolveUserByChatId(chatId);
  if (!user) {
    await sendMessage(
      chatId,
      "👋 Je bent nog niet gekoppeld.\n\n" +
        "Vraag je werkgever om een koppelcode en stuur:\n" +
        "<b>/koppel CODE</b>"
    );
    return NextResponse.json({ ok: true });
  }

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
        "⏱ <b>Klok:</b> typ /vandaag voor je planning met start/stop-knoppen.\n" +
        "📍 Deel je live-locatie en ik vraag bij aankomst automatisch of de klok aan moet.\n\n" +
        "💡 <i>Tip: stuur eerst alle VOOR-foto's bij aankomst, dan alle NA-foto's bij vertrek.</i>\n" +
        "🎤 <i>Je kunt ook een spraakbericht sturen als opmerking bij je foto's.</i>"
    );
    clearSession(chatId);
    return NextResponse.json({ ok: true });
  }

  // === /vandaag: dagplanning + klok-knoppen ===
  if (text === "/vandaag") {
    await sendVandaag(user, chatId);
    return NextResponse.json({ ok: true });
  }

  // === VOICE MESSAGE: save as audio note ===
  if (voice) {
    const voiceBuffer = await downloadFile(voice.file_id);
    const timestamp = Date.now();
    const storagePath = `${user.tenant_id}/voice-notes/opmerking-${timestamp}.ogg`;

    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, voiceBuffer, {
        contentType: "audio/ogg",
        upsert: false,
      });

    if (error) {
      console.error("[Bot] Voice upload error:", error);
      await sendMessage(chatId, "❌ Kon spraakbericht niet opslaan. Probeer opnieuw.");
      return NextResponse.json({ ok: true });
    }

    const { data: urlData } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath);

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
      "Stuur een foto om te beginnen! 📸\nOf typ /vandaag voor je planning, /start voor uitleg."
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

    const clients = await getClients(user.tenant_id);
    const clientButtons = clients.map((c) => [
      { text: formatClientButtonLabel(c) },
    ]);
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
      const clients = await getClients(user.tenant_id);
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
        user,
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

    // Client selection: parse multi-line button text (name\naddress) of getypte naam/adres
    const clients = await getClients(user.tenant_id);
    const matchedClient = parseClientButtonText(text, clients);

    if (!matchedClient) {
      await sendMessage(
        chatId,
        "Ik ken die klant niet. Kies een van de opties, typ een deel van de straatnaam, of stuur je locatie 📍."
      );
      return NextResponse.json({ ok: true });
    }

    // Client matched, save all photos
    const result = await savePhotos(
      user,
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
