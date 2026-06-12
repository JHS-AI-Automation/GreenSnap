# GreenSnap PoC - Voortgang

> Before/after foto-rapportage voor groenbedrijven.
> Stack: Next.js 16 + Tailwind + Supabase. Geen n8n (alles in API routes).
> Branding: JHS Automation

## Status per stap

### Stap 1: Project scaffolding [DONE]
- [x] Next.js project aangemaakt (TypeScript, Tailwind, App Router)
- [x] Mapstructuur: components/, lib/, supabase/, types/
- [x] Dependencies: @supabase/supabase-js, @react-pdf/renderer, date-fns
- [x] Git geinitialiseerd, pushed naar GitHub (JHS-AI-Automation/GreenSnap)

### Stap 2: Supabase database [DONE]
- [x] SQL-migratie: tenants, users, clients, jobs, photos, reports
- [x] Row Level Security policies (tenant-isolatie)
- [x] TypeScript types voor alle tabellen
- [x] Supabase client helper (lib/supabase.ts)
- [x] Supabase project aangemaakt en keys ingevuld
- [x] Demo-data geladen (GroenWerk Hengelo + 3 klanten + 3 jobs)

### Stap 3: PWA medewerker-app [DONE]
- [x] Layout + navigatie (mobile-first)
- [x] Opdrachten-lijst (vandaag's jobs)
- [x] Foto-capture scherm (camera + GPS + before/after)
- [x] PWA manifest.json
- [ ] Service worker voor offline
- [ ] Testen op echte telefoon (vereist HTTPS)

### Stap 4: Eigenaar dashboard [DONE]
- [x] Layout + navigatie
- [x] Overzicht: jobs met status-badges
- [x] Job detail: before/after naast elkaar
- [x] Handmatige foto-upload pagina (/dashboard/upload)
- [ ] Ongesorteerd: foto's zonder match toewijzen
- [ ] Instellingen: medewerkers, klantlocaties

### Stap 5: Matching-engine [DONE]
- [x] GPS-matching (haversine, < 150m)
- [x] Tijdvenster-check (zelfde medewerker, < 8 uur)
- [ ] Tekst-parsing (voor/na + klantnaam fuzzy)

### Stap 6: PDF-rapportage [DONE]
- [x] Template: JHS Automation branding, factuur-stijl pagina 1
- [x] Pagina 2: fotografisch verslag met voor/na
- [x] API route: /api/report/generate (GET voor demo, POST voor custom)
- [x] Download + inline preview in dashboard
- [ ] PDF opslaan in Supabase Storage per rapport

### Stap 7: Telegram bot [DONE]
- [x] Bot webhook API route (/api/telegram)
- [x] Conversatieflow: foto -> voor/na keuze -> klant selectie -> bevestiging
- [x] Keyboard-buttons voor keuzes (geen typen nodig)
- [x] Session-management (10 min timeout)
- [x] Setup-route voor webhook registratie
- [ ] Foto's opslaan in Supabase Storage (nu console.log)
- [ ] Bot token invullen + webhook activeren

### Stap 8: Foto-upload API [DONE]
- [x] API route: /api/photos/upload (multipart form)
- [x] Upload naar Supabase Storage
- [x] Insert in photos tabel
- [x] Job status auto-update (open -> before_done -> photos_complete)

### Stap 9: Planning, team, klok & CRM [BEZIG]

> Spec: `docs/superpowers/specs/2026-06-12-planning-team-klok-crm-design.md`
> Plan met alle taken: `docs/superpowers/plans/2026-06-12-planning-team-klok-crm.md`

- [x] Migratie 002: time_entries, worker_locations, users-koppelvelden, jobs.sort_order, clients CRM-velden, tenants.integration_api_key, photos.source-constraint-fix
- [x] TypeScript types + constants (geofence-drempels, link-code)
- [x] lib/link-code.ts — koppelcodes (TDD, 5 tests)
- [x] lib/clock-format.ts — duur-weergave (TDD, 5 tests)
- [x] lib/geofence.ts — enter/exit statemachine met hysterese (TDD, 8 tests)
- [x] lib/bot-user.ts — chat_id → user resolving + /koppel flow
- [x] lib/clock-db.ts — start/stop klok (auto-stop vorige, race-safe via partial unique index)
- [x] Telegram-bot: /koppel CODE, /vandaag met ▶/⏹-knoppen (inline keyboard), callback_query-handling, live-locatie geofence-prompts (aankomst/vertrek), DEMO_USER weg uit bot
#### ACTIE VEREIST (handmatig door Jasper, in deze volgorde)

1. **Migratie 002 draaien in Supabase** — zonder dit crasht de bot op de nieuwe tabellen:
   - Open [supabase.com](https://supabase.com) → jouw project → SQL Editor → New query
   - Plak de volledige inhoud van `supabase/migrations/002_planning_team_klok_crm.sql` en klik Run
   - Verwacht: "Success. No rows returned"
   - Controle: `select count(*) from time_entries;` moet `0` geven (geen error)

2. **Webhook her-registreren** — de bot ontvangt anders géén knop-kliks (callback_query) en géén live-locatie-updates (edited_message):
   - Na deploy naar Vercel (of met ngrok-tunnel): open in de browser
     `https://<jouw-app-url>/api/telegram/setup?url=https://<jouw-app-url>/api/telegram`
   - `setWebhook` stuurt nu `allowed_updates: ["message","edited_message","callback_query"]` mee; dit gaat pas in na her-registratie

3. **Jezelf koppelen als test-medewerker** — de bot weigert nu niet-gekoppelde chats. Er is nog geen team-UI (Task 11), dus zet tijdelijk een koppelcode via SQL:
   ```sql
   update users
   set link_code = 'TEST42', link_code_expires_at = now() + interval '24 hours'
   where role = 'worker' and name = 'NAAM-VAN-TEST-MEDEWERKER';
   ```
   Stuur daarna in Telegram: `/koppel TEST42`
   Verwacht: "✅ Welkom [naam]! Je bent gekoppeld."

4. **Klok testen**: stuur `/vandaag` (vereist een job met `scheduled_date = vandaag` voor die medewerker; maak er evt. een via Dashboard → Nieuwe opdracht). Tik ▶ Start, daarna ⏹ Stop.

5. **Geofence testen** (optioneel, vereist telefoon buiten): deel je live-locatie met de bot (paperclip → Locatie → Live locatie delen) en loop/rijd naar een klantadres met een job van vandaag. Binnen 150 m hoort de prompt "Klok starten?" te komen.
- [ ] Task 9: API users CRUD + link-code-endpoint + time-entries GET (plan task 9)
- [ ] Task 10: API jobs `?date=` filter + `/api/jobs/reorder` (plan task 10)
- [ ] Task 11: dashboard teampagina (`/dashboard/team`) + nav-links Team/Planning (plan task 11)
- [ ] Task 12: dashboard planningpagina (`/dashboard/planning`, drag & drop routevolgorde) (plan task 12)
- [ ] Task 13: CRM-webhook `/api/integrations/crm` + API-key-beheer in settings (plan task 13)
- [ ] Task 14: eindcontrole (typecheck, lint, test, build) + VOORTGANG bijwerken

---

## NOG TE DOEN (volgende sessies)

### Prioriteit 1: Supabase koppeling (live data)
De pagina's draaien nu op hardcoded demo-data. Moet worden:
- [ ] Dashboard overzicht: jobs ophalen uit Supabase i.p.v. hardcoded array
- [ ] Dashboard job detail: echte foto's tonen uit Supabase Storage
- [ ] Worker opdrachten: jobs ophalen voor ingelogde medewerker
- [ ] Worker capture: foto uploaden via /api/photos/upload
- [ ] PDF rapport: echte foto-URL's injecteren in de template

### Prioriteit 2: Eigenaar login
- [ ] Supabase Auth setup (magic link of email/wachtwoord)
- [ ] Login pagina voor eigenaar
- [ ] Middleware: dashboard routes beschermen
- [ ] Geen login nodig voor medewerkers (Telegram/PWA met code)

### Prioriteit 3: Telegram bot live
- [ ] Bot aanmaken via @BotFather
- [ ] Token in .env.local
- [ ] Deploy naar Vercel (of ngrok voor lokaal testen)
- [ ] Webhook activeren via /api/telegram/setup?url=...
- [ ] Telegram foto's opslaan in Supabase Storage

### Prioriteit 4: Afwerking
- [ ] Instellingen-pagina: klanten/locaties beheren
- [ ] Ongesorteerd-inbox: foto's zonder match toewijzen
- [ ] E-mail rapportage versturen (Resend of Supabase Edge Functions)
- [ ] Storage bucket 'photos' aanmaken in Supabase (public)

### Prioriteit 5: Productie-ready
- [ ] Vercel deployment
- [ ] Custom domein
- [ ] Multi-tenant onboarding (nieuw groenbedrijf registreren)
- [ ] WhatsApp als alternatief voor Telegram

---

## Technische beslissingen

| Beslissing | Keuze | Reden |
|---|---|---|
| Backend framework | Next.js API routes | Alles in 1 codebase, geen extra service |
| Database | Supabase (Postgres) | Gratis tier, auth, storage, RLS |
| PDF | @react-pdf/renderer | Lichtgewicht, geen headless browser nodig |
| Matching | Custom API route | Simpele logica, n8n is overkill voor PoC |
| Auth | Supabase (alleen eigenaar) | Medewerkers gebruiken Telegram, geen login |
| Medewerker-kanaal | Telegram Bot | Gratis, geen goedkeuring nodig, direct testbaar |
| Branding | JHS Automation | Geen GreenSnap in klant-facing output |

## Waar je tegenaan loopt

1. **Camera + GPS op mobiel**: werkt alleen via HTTPS. Lokaal testen kan met `localhost`, maar op telefoon heb je een tunnel nodig (ngrok) of Vercel preview deploy.
2. **Supabase Storage bucket**: moet handmatig aangemaakt worden in Supabase dashboard (naam: `photos`, public: aan).
3. **WhatsApp stript EXIF**: foto's via WhatsApp verliezen GPS-data. Telegram behoudt ze wel.
4. **@react-pdf/renderer type mismatch**: renderToBuffer verwacht Document-element, wrapper nodig met `as any` cast. Opgelost.
5. **Next.js 16 useSearchParams**: vereist Suspense boundary. Opgelost in capture/page.tsx.
6. **RLS blokkeert queries zonder auth**: voor de PoC moet je ofwel de service_role key gebruiken, ofwel RLS tijdelijk uitschakelen op tabellen.

## Hoe starten

```bash
cd C:\Documenten\Werk\SaaS\greensnap
npm run dev
```

Open http://localhost:3333 in de browser.

## Mapstructuur

```
greensnap/
  app/
    page.tsx                     - Landing page
    worker/
      layout.tsx                 - Worker navigatie (groen header)
      page.tsx                   - Opdrachten-lijst
      capture/page.tsx           - Camera + GPS + upload
    dashboard/
      layout.tsx                 - Dashboard navigatie
      page.tsx                   - Overzicht met stats + jobs
      upload/page.tsx            - Handmatige foto-upload
      job/[id]/page.tsx          - Job detail + before/after
    api/
      match/route.ts             - Matching-engine
      photos/upload/route.ts     - Foto-upload API (Supabase Storage)
      report/generate/route.ts   - PDF-rapportage generator
      telegram/route.ts          - Telegram bot webhook
      telegram/setup/route.ts    - Webhook registratie
  lib/
    supabase.ts                  - Supabase client
    matching.ts                  - GPS + tijdvenster matching
    telegram.ts                  - Telegram Bot API helpers
    bot-sessions.ts              - Conversatie-state per chat
    pdf-template.tsx             - PDF rapport template (JHS Automation)
  types/
    database.ts                  - TypeScript types
  supabase/
    migrations/001_initial_schema.sql
    seed.sql
```
