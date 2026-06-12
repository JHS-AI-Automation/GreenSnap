# Dagplanning, Teambeheer, Klok & CRM-webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GreenSnap uitbreiden met dag-routeplanning, teambeheer met Telegram-koppeling, hybride klokregistratie (knoppen + geofence) en een generieke inbound CRM-webhook.

**Architecture:** Alles in de bestaande Next.js 16 App Router codebase. Nieuwe Supabase-migratie voegt `time_entries`, `worker_locations` en kolommen toe. Pure logica (link-codes, geofence, duur-formattering) in `lib/` met Vitest-tests; DB-operaties in dunne helpers; Telegram-webhook krijgt user-resolving via `telegram_chat_id`, `callback_query`- en `edited_message`-handling. Spec: `docs/superpowers/specs/2026-06-12-planning-team-klok-crm-design.md`.

**Tech Stack:** Next.js 16 (App Router, async params!), Supabase JS (service-role in API routes), Telegram Bot API (inline keyboards, live location), Tailwind 4, Vitest, date-fns.

**Belangrijk:** lees `node_modules/next/dist/docs/` bij twijfel over Next 16 API's (zie AGENTS.md). Dynamic route params zijn `Promise` — altijd `await params`.

---

### Task 1: Migratie 002 + types + constants

**Files:**
- Create: `supabase/migrations/002_planning_team_klok_crm.sql`
- Modify: `types/database.ts`
- Modify: `lib/constants.ts`

- [ ] **Step 1: Schrijf de migratie** — exacte SQL staat in de spec, blok 0 (users-kolommen, jobs sort_order + user_id nullable, time_entries + partial unique index, worker_locations, clients CRM-velden, tenants.integration_api_key, photos.source constraint-fix, RLS-policies voor de 2 nieuwe tabellen identiek aan bestaand `tenant_isolation`-patroon).
- [ ] **Step 2: Types bijwerken** — in `types/database.ts`: `User` + `telegram_chat_id: number | null; active: boolean; link_code: string | null; link_code_expires_at: string | null`. `Job.user_id: UserId | null` + `sort_order: number`. `Client` + `external_id/external_source/email/phone: string | null`. Nieuw `TimeEntry` (id, tenant_id, job_id, user_id, started_at, stopped_at: string | null, source: TimeEntrySource, created_at) met `export type TimeEntrySource = "manual_telegram" | "geofence_telegram" | "dashboard"`. Nieuw `WorkerLocation` (user_id, tenant_id, lat, lng, updated_at, near_client_id: string | null, prompted_job_id: string | null). `PhotoSource` + `"telegram"`.
- [ ] **Step 3: Constants toevoegen** — `GEOFENCE_ENTER_METERS = 150`, `GEOFENCE_EXIT_METERS = 300`, `LINK_CODE_LENGTH = 6`, `LINK_CODE_TTL_HOURS = 24`.
- [ ] **Step 4: Run `npm run typecheck`** — verwacht: PASS (alleen type-uitbreidingen).
- [ ] **Step 5: Migratie uitvoeren tegen Supabase** — via Supabase dashboard SQL editor of `psql` (zelfde route als migratie 001; er is geen supabase CLI-link in dit project). Verifieer: `select column_name from information_schema.columns where table_name='time_entries';`
- [ ] **Step 6: Commit** — `feat: migratie 002 time_entries, worker_locations, team/crm kolommen`

### Task 2: lib/link-code.ts (TDD)

**Files:**
- Create: `lib/link-code.ts`, Test: `lib/link-code.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from "vitest";
import { generateLinkCode, isLinkCodeValid } from "./link-code";

describe("generateLinkCode", () => {
  it("maakt code van 6 tekens uit veilig alfabet (geen 0/O/1/I)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateLinkCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    }
  });
  it("maakt unieke codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateLinkCode));
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe("isLinkCodeValid", () => {
  it("true als expiry in de toekomst ligt", () => {
    expect(isLinkCodeValid(new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });
  it("false als verlopen of null", () => {
    expect(isLinkCodeValid(new Date(Date.now() - 60_000).toISOString())).toBe(false);
    expect(isLinkCodeValid(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run `npx vitest run lib/link-code.test.ts`** — verwacht FAIL (module bestaat niet).
- [ ] **Step 3: Implementatie**

```ts
import { randomInt } from "crypto";
import { LINK_CODE_LENGTH } from "./constants";

// Alfabet zonder 0/O/1/I om verwarring bij overtikken te voorkomen
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLinkCode(): string {
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function isLinkCodeValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !isNaN(t) && t > Date.now();
}
```

- [ ] **Step 4: Run test** — verwacht PASS. **Step 5: Commit** `feat: link-code helpers voor telegram-koppeling`

### Task 3: lib/clock-format.ts (TDD)

**Files:** Create: `lib/clock-format.ts`, Test: `lib/clock-format.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from "vitest";
import { formatDuration } from "./clock-format";

describe("formatDuration", () => {
  it("formatteert uren en minuten als 2u15", () => {
    expect(formatDuration(2 * 3600_000 + 15 * 60_000)).toBe("2u15");
  });
  it("alleen minuten onder het uur", () => {
    expect(formatDuration(42 * 60_000)).toBe("42 min");
  });
  it("0 min bij minder dan een minuut", () => {
    expect(formatDuration(30_000)).toBe("0 min");
  });
  it("Infinity/NaN/negatief geeft 0 min", () => {
    expect(formatDuration(NaN)).toBe("0 min");
    expect(formatDuration(-5000)).toBe("0 min");
  });
});
```

- [ ] **Step 2: Verifieer FAIL. Step 3: Implementatie**

```ts
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "0 min";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}u${String(minutes).padStart(2, "0")}`;
}
```

- [ ] **Step 4: PASS. Step 5: Commit** `feat: formatDuration voor klok-weergave`

### Task 4: lib/geofence.ts (TDD, pure statemachine)

**Files:** Create: `lib/geofence.ts`, Test: `lib/geofence.test.ts`

Pure functie: gegeven vorige geofence-state + nieuwe locatie + jobs-van-vandaag (met klantcoördinaten) + lopende klok → welke actie en nieuwe state. Geen DB, geen Telegram: volledig testbaar.

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from "vitest";
import { evaluateGeofence, type GeofenceJob, type GeofenceState } from "./geofence";

const klant = { clientId: "c1", clientName: "Bakker", lat: 52.26, lng: 6.79 };
const job = (over: Partial<GeofenceJob> = {}): GeofenceJob => ({ jobId: "j1", ...klant, ...over });
const idle: GeofenceState = { nearClientId: null, promptedJobId: null };

describe("evaluateGeofence", () => {
  it("prompt_start bij binnenkomen 150m-zone van geplande klant", () => {
    const r = evaluateGeofence(idle, { lat: 52.2601, lng: 6.7901 }, [job()], null);
    expect(r.action).toBe("prompt_start");
    expect(r.state).toEqual({ nearClientId: "c1", promptedJobId: "j1" });
  });
  it("geen dubbele prompt bij blijven binnen de zone", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    const r = evaluateGeofence(inside, { lat: 52.2601, lng: 6.7901 }, [job()], null);
    expect(r.action).toBe("none");
  });
  it("geen start-prompt als klok al loopt op die job", () => {
    const r = evaluateGeofence(idle, { lat: 52.2601, lng: 6.7901 }, [job()], { jobId: "j1", entryId: "t1" });
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBe("c1");
  });
  it("prompt_stop bij vertrek (>300m) met lopende klok op die klant", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    const r = evaluateGeofence(inside, { lat: 52.27, lng: 6.81 }, [job()], { jobId: "j1", entryId: "t1" });
    expect(r.action).toBe("prompt_stop");
    expect(r.state.nearClientId).toBeNull();
  });
  it("hysterese: tussen 150 en 300m verandert er niets", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    // ~200m noordelijk: 0.0018 graden lat
    const r = evaluateGeofence(inside, { lat: 52.2618, lng: 6.79 }, [job()], { jobId: "j1", entryId: "t1" });
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBe("c1");
  });
  it("vertrek zonder lopende klok: state gewist, geen prompt", () => {
    const inside: GeofenceState = { nearClientId: "c1", promptedJobId: "j1" };
    const r = evaluateGeofence(inside, { lat: 52.27, lng: 6.81 }, [job()], null);
    expect(r.action).toBe("none");
    expect(r.state.nearClientId).toBeNull();
  });
});
```

- [ ] **Step 2: FAIL. Step 3: Implementatie**

```ts
import { haversineDistance } from "./matching";
import { GEOFENCE_ENTER_METERS, GEOFENCE_EXIT_METERS } from "./constants";

export interface GeofenceJob {
  jobId: string;
  clientId: string;
  clientName: string;
  lat: number;
  lng: number;
}
export interface GeofenceState {
  nearClientId: string | null;
  promptedJobId: string | null;
}
export interface RunningClock { jobId: string; entryId: string }
export type GeofenceAction = "none" | "prompt_start" | "prompt_stop";
export interface GeofenceResult {
  action: GeofenceAction;
  job: GeofenceJob | null;     // bij prompt_start: te starten job; bij prompt_stop: job van lopende klok
  state: GeofenceState;
}

export function evaluateGeofence(
  prev: GeofenceState,
  pos: { lat: number; lng: number },
  todaysJobs: GeofenceJob[],
  running: RunningClock | null
): GeofenceResult {
  // 1. Binnen de huidige zone? Check vertrek met EXIT-drempel (hysterese)
  if (prev.nearClientId) {
    const current = todaysJobs.find((j) => j.clientId === prev.nearClientId);
    const dist = current ? haversineDistance(pos.lat, pos.lng, current.lat, current.lng) : Infinity;
    if (dist <= GEOFENCE_EXIT_METERS) {
      return { action: "none", job: null, state: prev }; // nog (net) binnen: niets doen
    }
    // Vertrokken: state wissen; prompt alleen als de klok op deze klant liep
    const left: GeofenceState = { nearClientId: null, promptedJobId: prev.promptedJobId };
    if (running && current && running.jobId === current.jobId) {
      return { action: "prompt_stop", job: current, state: left };
    }
    return { action: "none", job: null, state: left };
  }

  // 2. Niet in een zone: check binnenkomst met ENTER-drempel
  let nearest: GeofenceJob | null = null;
  let minDist = Infinity;
  for (const j of todaysJobs) {
    const d = haversineDistance(pos.lat, pos.lng, j.lat, j.lng);
    if (d <= GEOFENCE_ENTER_METERS && d < minDist) { minDist = d; nearest = j; }
  }
  if (!nearest) return { action: "none", job: null, state: prev };

  const state: GeofenceState = { nearClientId: nearest.clientId, promptedJobId: nearest.jobId };
  const alreadyRunning = running?.jobId === nearest.jobId;
  const alreadyPrompted = prev.promptedJobId === nearest.jobId;
  if (alreadyRunning || alreadyPrompted) return { action: "none", job: null, state };
  return { action: "prompt_start", job: nearest, state };
}
```

- [ ] **Step 4: PASS (alle 6). Step 5: Commit** `feat: geofence statemachine met enter/exit hysterese`

### Task 5: Telegram-lib uitbreiden

**Files:** Modify: `lib/telegram.ts`

- [ ] **Step 1: Voeg toe** (zelfde fetch-patroon als `sendMessage`):

```ts
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const res = await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  });
  return res.json();
}
```

- [ ] **Step 2: `npm run typecheck` PASS. Commit samen met Task 6.**

### Task 6: Bot user-resolving + /koppel

**Files:**
- Create: `lib/bot-user.ts`
- Modify: `app/api/telegram/route.ts` (kop van POST-handler + savePhotos-signatuur)

- [ ] **Step 1: lib/bot-user.ts**

```ts
import { getServerClient } from "./supabase";
import { isLinkCodeValid } from "./link-code";
import type { User } from "@/types/database";

const supabase = getServerClient();

export async function resolveUserByChatId(chatId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users").select("*")
    .eq("telegram_chat_id", chatId).eq("active", true)
    .maybeSingle();
  if (error) { console.error("[bot-user] resolve error:", error); return null; }
  return data as User | null;
}

// Koppelt chat aan user via code. Retourneert user of foutreden.
export async function linkUserByCode(
  chatId: number, code: string
): Promise<{ user: User } | { error: "not_found" | "expired" | "db" }> {
  const { data, error } = await supabase
    .from("users").select("*")
    .eq("link_code", code.toUpperCase()).eq("active", true)
    .maybeSingle();
  if (error) { console.error("[bot-user] link query error:", error); return { error: "db" }; }
  if (!data) return { error: "not_found" };
  if (!isLinkCodeValid(data.link_code_expires_at)) return { error: "expired" };

  const { error: updateError } = await supabase
    .from("users")
    .update({ telegram_chat_id: chatId, link_code: null, link_code_expires_at: null })
    .eq("id", data.id);
  if (updateError) { console.error("[bot-user] link update error:", updateError); return { error: "db" }; }
  return { user: { ...data, telegram_chat_id: chatId } as User };
}
```

- [ ] **Step 2: telegram route refactor.** Direct na het parsen van `message` (vóór de bestaande flows):
  1. `/koppel CODE` afhandelen (regex `^\/koppel\s+([a-z0-9]+)$/i` op de RUWE tekst, niet de lowercase): succes → "✅ Welkom [naam]! Je bent gekoppeld. Typ /vandaag voor je planning."; not_found/expired → nette uitleg.
  2. Daarna `const user = await resolveUserByChatId(chatId);` — bij `null` en geen /koppel: "Je bent nog niet gekoppeld. Vraag je werkgever om een koppelcode en stuur: /koppel CODE" + return.
  3. `savePhotos(...)` krijgt extra parameter `user: User`; binnen de functie vervangen: `DEMO_TENANT_ID` → `user.tenant_id`, `DEMO_USER_ID` → `user.id`. `getClients()` en `findJobForClient()` krijgen `tenantId`/`userId` parameter (`.eq("tenant_id", tenantId)`, job-query + `.eq("user_id", userId)`). Imports van DEMO-constants verwijderen uit deze file.
  4. `/start`-helptekst: regel toevoegen over /vandaag en klok.
- [ ] **Step 3: `npm run typecheck` + `npm run test` PASS** (bestaande telegram-helpers-tests blijven groen; die raken dit niet).
- [ ] **Step 4: Commit** `feat: bot identificeert medewerkers via telegram_chat_id + /koppel flow`

### Task 7: Klok via Telegram (/vandaag + callbacks)

**Files:**
- Create: `lib/clock-db.ts`
- Modify: `app/api/telegram/route.ts` (callback_query-tak + /vandaag command)

- [ ] **Step 1: lib/clock-db.ts**

```ts
import { getServerClient } from "./supabase";
import type { TimeEntry, TimeEntrySource } from "@/types/database";

const supabase = getServerClient();

export interface TodayJob {
  id: string; sort_order: number; status: string;
  client: { id: string; name: string; address: string; lat: number; lng: number };
}

export async function getTodaysJobs(userId: string, tenantId: string): Promise<TodayJob[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("jobs")
    .select("id, sort_order, status, client:clients(id, name, address, lat, lng)")
    .eq("tenant_id", tenantId).eq("user_id", userId).eq("scheduled_date", today)
    .order("sort_order");
  if (error) { console.error("[clock-db] getTodaysJobs:", error); return []; }
  return (data ?? []) as unknown as TodayJob[];
}

export async function getRunningEntry(userId: string): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from("time_entries").select("*")
    .eq("user_id", userId).is("stopped_at", null)
    .maybeSingle();
  if (error) { console.error("[clock-db] getRunningEntry:", error); return null; }
  return data as TimeEntry | null;
}

// Start klok; stopt automatisch een eventueel lopende entry. Idempotent op zelfde job.
export async function startClock(
  userId: string, tenantId: string, jobId: string, source: TimeEntrySource
): Promise<{ entry: TimeEntry; stopped: TimeEntry | null } | { error: string }> {
  const running = await getRunningEntry(userId);
  if (running?.job_id === jobId) return { error: "already_running" };

  let stopped: TimeEntry | null = null;
  if (running) {
    const result = await stopClock(running.id);
    if ("error" in result) return result;
    stopped = result.entry;
  }
  const { data, error } = await supabase
    .from("time_entries")
    .insert({ user_id: userId, tenant_id: tenantId, job_id: jobId, source })
    .select().single();
  if (error) { console.error("[clock-db] startClock:", error); return { error: error.message }; }
  return { entry: data as TimeEntry, stopped };
}

export async function stopClock(entryId: string): Promise<{ entry: TimeEntry } | { error: string }> {
  const { data, error } = await supabase
    .from("time_entries")
    .update({ stopped_at: new Date().toISOString() })
    .eq("id", entryId).is("stopped_at", null)
    .select().maybeSingle();
  if (error) { console.error("[clock-db] stopClock:", error); return { error: error.message }; }
  if (!data) return { error: "not_running" };
  return { entry: data as TimeEntry };
}
```

- [ ] **Step 2: /vandaag in de webhook** (na user-resolving, vóór de foto-flows). Bouwt per job een regel + inline keyboard:

```ts
// binnen POST, text === "/vandaag"
const jobs = await getTodaysJobs(user.id, user.tenant_id);
if (jobs.length === 0) {
  await sendMessage(chatId, "📅 Geen opdrachten gepland voor vandaag.");
  return NextResponse.json({ ok: true });
}
const running = await getRunningEntry(user.id);
const lines = jobs.map((j, i) => {
  const marker = running?.job_id === j.id ? " ⏱ <b>(klok loopt)</b>" : "";
  return `${i + 1}. <b>${j.client.name}</b>${marker}\n   📍 ${j.client.address}`;
});
const buttons = jobs.map((j) =>
  running?.job_id === j.id
    ? [{ text: `⏹ Stop ${j.client.name}`, callback_data: `ck:stop` }]
    : [{ text: `▶ Start ${j.client.name}`, callback_data: `ck:start:${j.id}` }]
);
await sendMessage(chatId, `📅 <b>Jouw planning voor vandaag</b>\n\n${lines.join("\n")}`, {
  reply_markup: { inline_keyboard: buttons },
});
```

- [ ] **Step 3: callback_query-tak** bovenin POST (vóór `if (!message)`):

```ts
const callbackQuery = update.callback_query;
if (callbackQuery) {
  const cbChatId = callbackQuery.message?.chat?.id;
  const cbData: string = callbackQuery.data ?? "";
  if (!cbChatId) return NextResponse.json({ ok: true });
  const cbUser = await resolveUserByChatId(cbChatId);
  if (!cbUser) {
    await answerCallbackQuery(callbackQuery.id, "Niet gekoppeld. Stuur /koppel CODE.");
    return NextResponse.json({ ok: true });
  }
  if (cbData.startsWith("ck:start:")) {
    const jobId = cbData.slice("ck:start:".length);
    const result = await startClock(cbUser.id, cbUser.tenant_id, jobId, "manual_telegram");
    if ("error" in result) {
      await answerCallbackQuery(callbackQuery.id, result.error === "already_running" ? "Klok loopt al op deze opdracht." : "Klok starten mislukt.");
      return NextResponse.json({ ok: true });
    }
    await answerCallbackQuery(callbackQuery.id, "Klok gestart ✅");
    let msg = "▶ <b>Klok gestart</b>";
    if (result.stopped) {
      const ms = Date.now() - new Date(result.stopped.started_at).getTime();
      msg += `\n(vorige klok automatisch gestopt na ${formatDuration(ms)})`;
    }
    await sendMessage(cbChatId, msg);
    return NextResponse.json({ ok: true });
  }
  if (cbData === "ck:stop") {
    const running = await getRunningEntry(cbUser.id);
    if (!running) {
      await answerCallbackQuery(callbackQuery.id, "Er loopt geen klok.");
      return NextResponse.json({ ok: true });
    }
    const result = await stopClock(running.id);
    if ("error" in result) {
      await answerCallbackQuery(callbackQuery.id, "Klok stoppen mislukt.");
      return NextResponse.json({ ok: true });
    }
    const ms = new Date(result.entry.stopped_at!).getTime() - new Date(result.entry.started_at).getTime();
    await answerCallbackQuery(callbackQuery.id, "Klok gestopt ✅");
    await sendMessage(cbChatId, `⏹ <b>Klok gestopt</b> na ${formatDuration(ms)}.`);
    return NextResponse.json({ ok: true });
  }
  await answerCallbackQuery(callbackQuery.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: typecheck + tests PASS. Step 5: Commit** `feat: klokregistratie via /vandaag met start/stop-knoppen`

### Task 8: Geofence-wiring (live location)

**Files:** Modify: `app/api/telegram/route.ts`

- [ ] **Step 1: edited_message-tak** direct na de callback_query-tak. Telegram stuurt live-locatie-updates als `edited_message` met `location`:

```ts
const editedMessage = update.edited_message;
if (editedMessage?.location) {
  const locChatId = editedMessage.chat.id;
  const locUser = await resolveUserByChatId(locChatId);
  if (!locUser) return NextResponse.json({ ok: true });
  await handleLocationUpdate(locUser, locChatId, editedMessage.location.latitude, editedMessage.location.longitude);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: handleLocationUpdate** in de route-file (gebruikt evaluateGeofence + clock-db + worker_locations):

```ts
async function handleLocationUpdate(user: User, chatId: number, lat: number, lng: number) {
  const { data: prevRow } = await supabase
    .from("worker_locations").select("*").eq("user_id", user.id).maybeSingle();
  const prev = { nearClientId: prevRow?.near_client_id ?? null, promptedJobId: prevRow?.prompted_job_id ?? null };

  const jobs = await getTodaysJobs(user.id, user.tenant_id);
  const geofenceJobs = jobs.map((j) => ({
    jobId: j.id, clientId: j.client.id, clientName: j.client.name, lat: j.client.lat, lng: j.client.lng,
  }));
  const runningEntry = await getRunningEntry(user.id);
  const running = runningEntry ? { jobId: runningEntry.job_id, entryId: runningEntry.id } : null;

  const result = evaluateGeofence(prev, { lat, lng }, geofenceJobs, running);

  await supabase.from("worker_locations").upsert({
    user_id: user.id, tenant_id: user.tenant_id, lat, lng,
    updated_at: new Date().toISOString(),
    near_client_id: result.state.nearClientId, prompted_job_id: result.state.promptedJobId,
  });

  if (result.action === "prompt_start" && result.job) {
    await sendMessage(chatId, `📍 Je bent aangekomen bij <b>${result.job.clientName}</b>. Klok starten?`, {
      reply_markup: { inline_keyboard: [[{ text: "▶ Start klok", callback_data: `ck:start:${result.job.jobId}` }]] },
    });
  } else if (result.action === "prompt_stop" && result.job) {
    await sendMessage(chatId, `📍 Je bent vertrokken bij <b>${result.job.clientName}</b>. Klok stoppen?`, {
      reply_markup: { inline_keyboard: [[{ text: "⏹ Stop klok", callback_data: "ck:stop" }]] },
    });
  }
}
```

- [ ] **Step 3:** Eenmalige `message.location` (geen live) blijft de BESTAANDE foto-flow voeden (klant-match), geen geofence: niets wijzigen daar. Geofence draait alleen op `edited_message`. In /start-help: tip toevoegen "Deel 's ochtends je live-locatie en ik vraag automatisch of de klok aan moet bij aankomst."
- [ ] **Step 4: typecheck + tests PASS. Step 5: Commit** `feat: geofence-prompts op telegram live-locatie`

### Task 9: API — users CRUD + link-code + time-entries

**Files:**
- Modify: `app/api/users/route.ts` (GET uitbreiden, POST toevoegen)
- Create: `app/api/users/[id]/route.ts` (PATCH)
- Create: `app/api/users/[id]/link-code/route.ts` (POST → genereert code)
- Create: `app/api/time-entries/route.ts` (GET)

- [ ] **Step 1: users GET uitbreiden**: select alle teambeheer-velden `id, name, phone, role, active, telegram_chat_id, link_code, link_code_expires_at`, query-param `?all=1` toont ook inactieve (default alleen actieve).
- [ ] **Step 2: users POST**: body `{ name, phone, role }`, valideer non-empty naam/phone en role in ('worker','owner'), insert met `tenant_id: DEMO_TENANT_ID` (consistent met bestaand patroon), 409 bij duplicate phone (Postgres error code 23505), 201 + user terug.
- [ ] **Step 3: users [id] PATCH** (Next 16: `{ params }: { params: Promise<{ id: string }> }` + `await params`): body mag `{ name?, phone?, active? }` bevatten; whitelist die velden expliciet; 404 als user niet bestaat binnen tenant.
- [ ] **Step 4: link-code POST**: genereer `generateLinkCode()`, expiry `now + LINK_CODE_TTL_HOURS`, update user (alleen als `telegram_chat_id IS NULL`, anders 409 "al gekoppeld"), return `{ code, expires_at }`.
- [ ] **Step 5: time-entries GET**: query-params `from` (verplicht, YYYY-MM-DD), `to` (verplicht), optioneel `user`. Select `*, job:jobs(id, client:clients(name))` waar `started_at >= from` en `started_at < to + 1 dag`, tenant-filter, order `started_at desc`. 400 bij ontbrekende/ongeldige datums.
- [ ] **Step 6: typecheck PASS, handmatige smoke met `curl http://localhost:3333/api/users`. Step 7: Commit** `feat: users CRUD, koppelcode-endpoint en time-entries API`

### Task 10: API — jobs per datum + reorder

**Files:**
- Modify: `app/api/jobs/route.ts` (GET `?date=` + sort_order in POST)
- Create: `app/api/jobs/reorder/route.ts` (PATCH)

- [ ] **Step 1: jobs GET**: ondersteun `?date=YYYY-MM-DD` → filter `scheduled_date = date`, select + `sort_order, user_id, client:clients(id,name,address), time_entries(id, user_id, started_at, stopped_at)`, order `sort_order`. Zonder date-param: bestaand gedrag behouden.
- [ ] **Step 2: jobs POST**: accepteer optioneel `sort_order` (default: max bestaande sort_order van die user/dag + 1, of 0).
- [ ] **Step 3: reorder PATCH**: body `{ updates: [{ id, user_id, sort_order }] }` (user_id mag null = niet toegewezen). Valideer array, max 100 items. Voer per item een update uit binnen tenant-filter; verzamel fouten; antwoord `{ ok: true, updated: n }` of 400/500 met details.
- [ ] **Step 4: typecheck PASS. Step 5: Commit** `feat: jobs date-filter en reorder-endpoint voor dagplanning`

### Task 11: Dashboard — Teambeheer-pagina

**Files:**
- Create: `app/dashboard/team/page.tsx` (client component)
- Modify: `app/dashboard/layout.tsx` (nav-link "Team" + "Planning")

- [ ] **Step 1: pagina bouwen.** Client component (`"use client"`), Tailwind-stijl identiek aan bestaande dashboard-pagina's (witte cards, `rounded-lg`, groene accenten):
  - Fetch `/api/users?all=1` + `/api/time-entries?from=<maandag>&to=<zondag>` (weekberekening met date-fns `startOfWeek`/`endOfWeek`, locale-onafhankelijk via `{ weekStartsOn: 1 }`).
  - Tabel: naam, telefoon, rol, Telegram-status (✓ gekoppeld / knop "Koppelcode" → POST link-code → toon code groot + uitleg "laat medewerker /koppel CODE sturen, 24u geldig"), uren deze week (som van entries per user, lopende entry telt tot nu), acties (bewerken, deactiveren/activeren).
  - "+ Medewerker"-formulier (naam, telefoon, rol-select) inline boven de tabel.
  - Bewerken: inline rij-edit of klein modaal, PATCH naar `/api/users/[id]`.
  - Deactiveren: confirm → PATCH `{ active: false }`; inactieve users grijs onderaan met "activeer"-knop.
  - Week-navigatie (vorige/volgende week) voor het urenoverzicht.
  - Foutafhandeling: API-fouten als rode banner bovenaan, nooit stil.
- [ ] **Step 2: nav-links** in layout: "Planning" → `/dashboard/planning`, "Team" → `/dashboard/team` (tussen Overzicht en Nieuwe opdracht).
- [ ] **Step 3: visuele check** met Playwright (localhost:3333), typecheck + lint PASS. **Step 4: Commit** `feat: teambeheer-pagina met telegram-koppeling en urenoverzicht`

### Task 12: Dashboard — Planning-pagina

**Files:** Create: `app/dashboard/planning/page.tsx` (client component)

- [ ] **Step 1: pagina bouwen.**
  - Header: datum-navigatie (← vorige dag, datum-input, volgende dag →, "Vandaag"-knop). Datum in URL-searchparam `?date=` (deep-linkbaar); `useSearchParams` in Suspense-boundary (Next 16 vereiste, zie capture/page.tsx als voorbeeld).
  - Data: `/api/jobs?date=...` + `/api/users` parallel (Promise.all). Groepeer jobs per `user_id`; kolom per actieve medewerker + kolom "Niet toegewezen" (user_id null).
  - Jobkaartje: klantnaam, adres, status-badge (hergebruik `lib/status-config.ts`), notitie-icoon, ⏱-badge als er een open time_entry op zit (stopped_at null).
  - Drag & drop met native HTML5 (`draggable`, `onDragStart` met job-id in dataTransfer, `onDragOver` preventDefault, `onDrop` op kolom én tussen kaartjes): bereken nieuwe sort_orders voor de geraakte kolom(men) en PATCH `/api/jobs/reorder` in één call; optimistic UI met rollback bij fout.
  - "+ Job" onderaan elke kolom: klant-zoekveld (fetch `/api/clients`, filter client-side), notitie-veld, POST `/api/jobs` met user_id van de kolom + scheduled_date van de gekozen dag.
  - Polling: elke 30s data herladen voor live klok-badges (setInterval in useEffect, cleanup bij unmount).
- [ ] **Step 2: visuele check Playwright + typecheck + lint PASS. Step 3: Commit** `feat: dagplanning met drag-and-drop routevolgorde`

### Task 13: CRM-webhook + settings

**Files:**
- Create: `app/api/integrations/crm/route.ts`
- Modify: `app/dashboard/settings/page.tsx` (CRM-sectie)
- Create: `app/api/integrations/crm/key/route.ts` (POST regenereer key, leest huidige)

- [ ] **Step 1: webhook-route.** POST:
  1. `Authorization: Bearer <key>` → lookup `tenants` op `integration_api_key`; geen match → 401.
  2. Valideer body: `action` in ('upsert','delete'); `client.external_id` verplicht (string, max 200); bij upsert ook `name` + `address` non-empty. `source` default `"crm"`. 400 met `{ ok: false, error: "..." }` per geval.
  3. Upsert: zoek bestaande client op `(tenant_id, external_source, external_id)`. Adres gewijzigd of nieuw → `geocodeAddress()` uit `lib/geocoding.ts`; faalt geocoding → 422 `{ ok: false, error: "geocoding_failed", detail }`. Insert of update (name, address, lat, lng, email, phone, notes). Antwoord `{ ok: true, client_id, created: boolean }`.
  4. Delete: client zoeken; niet gevonden → 404. Jobs aanwezig (`count` op jobs met client_id) → 409 `{ ok: false, error: "client_has_jobs" }`. Anders delete → `{ ok: true }`.
- [ ] **Step 2: key-route.** GET → huidige key (alleen voor ingelogde eigenaar, zelfde auth-patroon als andere dashboard-API's). POST → genereer `crypto.randomUUID().replace(/-/g, "")` + update tenant, return nieuwe key.
- [ ] **Step 3: settings-sectie.** Card "CRM-koppeling": key tonen (masked, toon/kopieer-knop), regenereer-knop met confirm ("oude key stopt direct met werken"), endpoint-URL, voorbeeld-curl met payload, regel uitleg Zapier/Make/n8n.
- [ ] **Step 4: smoke-test** met curl tegen localhost (upsert → created true, zelfde call → created false, delete met jobs → 409). typecheck + lint + alle tests PASS.
- [ ] **Step 5: Commit** `feat: generieke CRM-webhook met per-tenant API-key`

### Task 14: Eindcontrole

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm run test` — alles PASS.
- [ ] **Step 2:** `npm run build` — productie-build slaagt (vangt Next 16 server/client-component-fouten).
- [ ] **Step 3:** VOORTGANG.md bijwerken: nieuwe features onder een "Stap 9: Planning, team, klok & CRM"-sectie + openstaande punten (migratie draaien op productie-Supabase, webhook her-registreren met `allowed_updates` incl. `callback_query` en `edited_message` — let op: `setWebhook` in `lib/telegram.ts` moet `allowed_updates: ["message","edited_message","callback_query"]` meesturen, anders ontvang je geen callbacks/live-locaties!).
- [ ] **Step 4: Commit** `docs: voortgang stap 9 planning/team/klok/crm`
