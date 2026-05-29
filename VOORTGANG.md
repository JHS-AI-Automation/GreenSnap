# GreenSnap PoC - Voortgang

> Before/after foto-rapportage voor groenbedrijven.
> Stack: Next.js 15 + Tailwind + Supabase. Geen n8n (alles in API routes).

## Status per stap

### Stap 1: Project scaffolding
- [x] Next.js project aangemaakt (TypeScript, Tailwind, App Router)
- [x] Mapstructuur: components/, lib/, supabase/, types/
- [x] Dependencies: @supabase/supabase-js, @react-pdf/renderer, date-fns
- [x] Git geinitialiseerd
- [x] VOORTGANG.md aangemaakt

### Stap 2: Supabase database
- [x] SQL-migratie: tenants, users, clients, jobs, photos, reports
- [x] Row Level Security policies (tenant-isolatie)
- [x] TypeScript types voor alle tabellen
- [x] Supabase client helper (lib/supabase.ts)
- [ ] .env.local invullen met echte Supabase keys (handmatig)

### Stap 3: PWA medewerker-app
- [x] Layout + navigatie (mobile-first)
- [x] Login scherm (telefoon + code)
- [x] Opdrachten-lijst (vandaag's jobs)
- [x] Foto-capture scherm (camera + GPS + before/after)
- [x] PWA manifest.json
- [ ] Service worker voor offline
- [ ] Testen op echte telefoon (vereist HTTPS)

### Stap 4: Eigenaar dashboard
- [x] Layout + navigatie
- [x] Overzicht: jobs met status-badges
- [x] Job detail: before/after naast elkaar
- [ ] Ongesorteerd: foto's zonder match toewijzen
- [ ] Rapport preview + verstuur-knop
- [ ] Instellingen: medewerkers, klantlocaties

### Stap 5: Matching-engine
- [x] GPS-matching (haversine, < 150m)
- [x] Tijdvenster-check (zelfde medewerker, < 8 uur)
- [ ] Tekst-parsing (voor/na + klantnaam fuzzy)
- [ ] WhatsApp webhook (later, niet in PoC v1)

### Stap 6: PDF-rapportage
- [ ] Template: logo, datum, before/after grid
- [ ] API route: /api/report/generate
- [ ] Opslag in Supabase Storage
- [ ] Download-link

### Stap 7: Telegram bot (medewerker-kanaal)
- [x] Bot webhook API route (/api/telegram)
- [x] Conversatieflow: foto -> voor/na keuze -> klant selectie -> bevestiging
- [x] Keyboard-buttons voor keuzes (geen typen nodig)
- [x] Session-management (10 min timeout)
- [x] Setup-route voor webhook registratie (/api/telegram/setup)
- [x] Telegram helper library (sendMessage, getFileUrl, downloadFile)
- [ ] Foto's daadwerkelijk opslaan in Supabase Storage (nu alleen console.log)
- [ ] Bot token invullen in .env.local (via @BotFather)
- [ ] Webhook activeren via ngrok + /api/telegram/setup?url=...

### Stap 8: Integraties (later)
- [ ] WhatsApp Business API (Twilio, als alternatief/aanvulling op Telegram)
- [ ] E-mail rapportage versturen
- [ ] n8n workflows (optioneel)

---

## Technische beslissingen

| Beslissing | Keuze | Reden |
|---|---|---|
| Backend framework | Next.js API routes | Alles in 1 codebase, geen extra service |
| Database | Supabase (Postgres) | Gratis tier, auth, storage, RLS |
| PDF | @react-pdf/renderer | Lichtgewicht, geen headless browser nodig |
| Matching | Custom API route | Simpele logica, n8n is overkill voor PoC |
| Auth | Supabase OTP | Alleen eigenaar logt in, medewerkers gebruiken Telegram |
| Medewerker-kanaal | Telegram Bot | Gratis, geen goedkeuring nodig, direct testbaar, keyboard-buttons |

## Waar je tegenaan loopt

1. **Camera + GPS op mobiel**: werkt alleen via HTTPS. Lokaal testen kan met `localhost`, maar op telefoon heb je een tunnel nodig (ngrok) of Vercel preview deploy.
2. **Supabase project nodig**: maak een gratis project aan op supabase.com en vul de keys in `.env.local`. Kopieer `.env.example` naar `.env.local` en vul in.
3. **WhatsApp stript EXIF**: foto's via WhatsApp verliezen GPS-data. Daarom is de PWA het primaire kanaal, WhatsApp komt later met tekst-matching als fallback.
4. **@react-pdf/renderer + Next.js App Router**: kan server-side rendering issues geven. Fallback: PDF via API route met dynamic import.
5. **Next.js 16 useSearchParams**: vereist Suspense boundary, anders faalt de build. Opgelost in capture/page.tsx.

## Hoe starten

```bash
cd C:\Documenten\Werk\SaaS\greensnap
npm run dev
```

Open http://localhost:3000 in de browser.

## Mapstructuur

```
greensnap/
  app/
    page.tsx              - Landing page (keuze worker/dashboard)
    worker/
      layout.tsx          - Worker navigatie (groen header)
      page.tsx            - Opdrachten-lijst met demo-data
      capture/page.tsx    - Camera + GPS + upload scherm
    dashboard/
      layout.tsx          - Dashboard navigatie
      page.tsx            - Overzicht met stats + job-lijst
      job/[id]/page.tsx   - Job detail met before/after vergelijking
    api/
      match/route.ts           - Matching-engine (GPS + tijdvenster)
      telegram/route.ts        - Telegram bot webhook (foto-ontvangst)
      telegram/setup/route.ts  - Webhook registratie helper
  lib/
    supabase.ts           - Supabase client
    matching.ts           - Haversine + tijdvenster matching-logica
    telegram.ts           - Telegram Bot API helpers
    bot-sessions.ts       - In-memory conversatie-state per chat
  types/
    database.ts           - TypeScript types voor alle tabellen
  supabase/
    migrations/001_initial_schema.sql  - Database schema + RLS
    seed.sql              - Demo-data voor development
  public/
    manifest.json         - PWA manifest
```
