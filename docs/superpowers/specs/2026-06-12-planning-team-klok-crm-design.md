# Design: Dagplanning, Teambeheer, Klokregistratie & generieke CRM-koppeling

Datum: 2026-06-12
Status: goedgekeurd door Jasper (bouw alles, blok 0 t/m 4)

## Doel

GreenSnap uitbreiden van foto-rapportage-PoC naar dagelijkse operatie-tool voor hoveniers:

1. Eigenaar plant jobs per dag per medewerker (dag-routelijst, geen tijdsloten)
2. Eigenaar beheert het team en ziet uren per medewerker
3. Medewerkers klokken start/stop via Telegram (knoppen + opt-in geofencing via live-locatie)
4. Klanten kunnen vanuit een willekeurig extern CRM binnenstromen via een generieke inbound webhook

Buiten scope deze ronde: digitale werkbon (uren + materialen + handtekening op één PDF), rapportages/omzet-overzichten, voorraadbeheer, offertes, facturatie-flow. De `time_entries`-tabel is wel zo ontworpen dat de werkbon hier later direct op aansluit.

## Context huidige codebase

- Next.js 16 App Router + Supabase (Postgres, Storage, RLS per tenant), Vercel deploy
- Telegram-bot (webhook `/api/telegram`) voor foto-flow; identificeert nu IEDERE chat als `DEMO_USER_ID` — geen chat-naar-user-mapping
- `lib/matching.ts` heeft haversine + nearest-client (150m), `lib/geocoding.ts` geocodeert adressen
- `lib/bot-sessions.ts` is in-memory; onbetrouwbaar op Vercel serverless (meerdere instances, cold starts). Korte conversatie-state mag daar blijven, maar geofence-state en klok-state MOETEN in de database
- Bekende bug: bot schrijft `photos.source = 'telegram'`, check-constraint staat alleen `'pwa','whatsapp'` toe

## Blok 0 — Datamodel (migratie 002)

```sql
-- users
ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN link_code TEXT;            -- eenmalige koppelcode, NULL na koppeling
ALTER TABLE users ADD COLUMN link_code_expires_at TIMESTAMPTZ;

-- jobs
ALTER TABLE jobs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ALTER COLUMN user_id DROP NOT NULL;  -- nodig voor "Niet toegewezen"-kolom in planning

-- time_entries (klokregistratie)
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  source TEXT NOT NULL CHECK (source IN ('manual_telegram','geofence_telegram','dashboard')),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- max 1 lopende klok per medewerker
CREATE UNIQUE INDEX idx_one_running_clock ON time_entries(user_id) WHERE stopped_at IS NULL;

-- worker_locations (laatste live-locatie + geofence-state, DB-backed wegens serverless)
CREATE TABLE worker_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  near_client_id UUID REFERENCES clients(id),   -- geofence-hysterese: bij welke klant 'binnen'
  prompted_job_id UUID REFERENCES jobs(id)      -- laatste job waarvoor start-prompt is gestuurd
);

-- clients (CRM-sync velden)
ALTER TABLE clients ADD COLUMN external_id TEXT;
ALTER TABLE clients ADD COLUMN external_source TEXT;
ALTER TABLE clients ADD COLUMN email TEXT;
ALTER TABLE clients ADD COLUMN phone TEXT;
CREATE UNIQUE INDEX idx_clients_external ON clients(tenant_id, external_source, external_id)
  WHERE external_id IS NOT NULL;

-- tenants
ALTER TABLE tenants ADD COLUMN integration_api_key TEXT UNIQUE;

-- bugfix photos.source
ALTER TABLE photos DROP CONSTRAINT photos_source_check;
ALTER TABLE photos ADD CONSTRAINT photos_source_check
  CHECK (source IN ('pwa','whatsapp','telegram'));
```

RLS: `time_entries` en `worker_locations` krijgen dezelfde `tenant_isolation`-policy als de rest. API-routes blijven via service-role werken (bestaand patroon).

## Blok 1 — Teambeheer (`/dashboard/team`)

**UI:**
- Tabel actieve medewerkers: naam, telefoon, rol, Telegram-status (gekoppeld ✓ / koppelcode), uren deze week
- Toevoegen (naam + telefoon + rol), bewerken, deactiveren (soft delete via `active = false`; nooit hard delete, time_entries verwijzen ernaar)
- Knop "Genereer koppelcode" per niet-gekoppelde medewerker: 6-tekens code, 24 uur geldig
- Urenoverzicht: per medewerker som van time_entries per dag voor de gekozen week, plus totaal

**API:**
- `GET/POST /api/users` (bestaat, uitbreiden met active-filter en link-code-generatie)
- `PATCH/DELETE /api/users/[id]` (deactiveren = PATCH active:false)
- `GET /api/time-entries?user=&from=&to=` voor het urenoverzicht

**Bot-kant:**
- `/koppel CODE` → zoek user met die code (niet verlopen) → zet `telegram_chat_id`, wis code → welkomstbericht
- Alle bot-handlers resolven vanaf nu de user via `telegram_chat_id`; onbekende chat krijgt "Je bent nog niet gekoppeld, vraag je werkgever om een koppelcode en stuur /koppel CODE"
- `DEMO_USER_ID`/`DEMO_TENANT_ID` verdwijnen uit de telegram-route; tenant volgt uit de gekoppelde user

## Blok 2 — Dagplanning (`/dashboard/planning`)

**UI:**
- Datum-navigatie (vorige/volgende dag, datumkiezer, "vandaag")
- Kolom per actieve worker; jobkaartjes (klantnaam, adres, status-badge, notitie-indicator) in `sort_order`
- Drag & drop: herordenen binnen kolom én verslepen naar andere medewerker (HTML5 drag & drop, geen extra dependency)
- "+ Job" per kolom: klant kiezen (zoekveld op bestaand klantenbestand), notitie, opslaan
- Kolom "Niet toegewezen" voor jobs zonder/met gedeactiveerde medewerker
- Live-badge: medewerker met lopende klok toont ⏱ + klantnaam (polling, 30s interval)

**API:**
- `GET /api/jobs?date=YYYY-MM-DD` → jobs incl. client + lopende time_entry
- `PATCH /api/jobs/reorder` → `[{id, user_id, sort_order}]` in één batch
- `POST /api/jobs` (bestaat) krijgt `sort_order` (append aan einde van kolom)

## Blok 3 — Klokregistratie via Telegram (hybride)

**Handmatig (fundament):**
- `/vandaag` → bot toont eigen jobs van vandaag in route-volgorde, inline keyboard per job: `▶ Start [klantnaam]`
- Bij lopende klok toont datzelfde overzicht `⏹ Stop [klantnaam]` voor de actieve job en ▶ voor de rest
- Start job B terwijl klok A loopt → A automatisch gestopt, melding "Klok bij A gestopt (2u15), gestart bij B"
- Callback-queries (`callback_query` update-type) afhandelen in de webhook; bestaande foto-flow blijft ongewijzigd werken

**Geofence (opt-in laag):**
- Medewerker deelt live-locatie met de bot (Telegram stuurt dan `edited_message` met `location` updates, tot 8 uur)
- Webhook schrijft elke update naar `worker_locations` en draait geofence-check:
  - Binnen 150m van een klant met een job van vandaag voor deze medewerker, en `near_client_id` was nog niet deze klant → zet `near_client_id`, en als er geen lopende klok voor die job is en `prompted_job_id` ≠ die job: stuur eenmalig "📍 Aangekomen bij [klant]. Klok starten?" met Start-knop, zet `prompted_job_id`
  - Verder dan 300m van `near_client_id` (hysterese) → wis `near_client_id`; als er een lopende klok was voor die klant: stuur "Je bent vertrokken bij [klant]. Klok stoppen?" met Stop-knop
- Geofence stuurt alleen prompts, start/stopt nooit zelf: de medewerker bevestigt altijd met één tik

## Blok 4 — Generieke CRM-koppeling (inbound webhook)

**Endpoint:** `POST /api/integrations/crm`
- Auth: `Authorization: Bearer <integration_api_key>` → resolves tenant
- Body:
  ```json
  {
    "action": "upsert" | "delete",
    "source": "vrij-tekstveld-crm-naam",
    "client": {
      "external_id": "verplicht",
      "name": "verplicht bij upsert",
      "address": "verplicht bij upsert",
      "email": "optioneel",
      "phone": "optioneel",
      "notes": "optioneel"
    }
  }
  ```
- Upsert: match op `(tenant_id, external_source, external_id)`; nieuw adres → server-side geocoding (bestaande `lib/geocoding.ts`); geocoding-failure → 422 met duidelijke fout, geen client zonder coördinaten
- Delete: soft (client behouden als er jobs aan hangen → 409 met uitleg, anders verwijderen)
- Rate-limit-vriendelijk: idempotent, herhaalde upserts zijn no-ops
- Antwoord altijd JSON met `{ ok, client_id }` of `{ ok: false, error }`

**Settings-pagina:** sectie "CRM-koppeling": API-key tonen/regenereren, endpoint-URL, copy-paste voorbeeld-payload en een korte uitleg "werkt met Zapier, Make, n8n of elke webhook uit je CRM".

## Foutafhandeling (rode draad)

- Telegram-webhook antwoordt ALTIJD 200 op geldige secret (anders retry-storm van Telegram); fouten worden gelogd en als nette gebruikersmelding teruggestuurd
- Klok-acties zijn idempotent: dubbel op Start tikken geeft "Klok loopt al", niet een tweede entry (afgedwongen door de partial unique index, race-safe)
- CRM-webhook valideert strikt en geeft machine-leesbare fouten; nooit halve clients in de DB

## Testen

- Vitest (bestaande setup): unit-tests voor geofence-logica (binnen/buiten/hysterese), klok-statemachine (start/stop/auto-stop), CRM-upsert-validatie, koppelcode-flow
- Bestaande tests (matching, date-utils, eml-builder, telegram-helpers) blijven groen

## Bouwvolgorde

0. Migratie 002 + types bijwerken
1. Teambeheer + bot-identiteit (chat_id-resolving, /koppel)
2. Dagplanning
3. Klok: knoppen-flow, daarna geofence
4. CRM-webhook + settings-sectie
