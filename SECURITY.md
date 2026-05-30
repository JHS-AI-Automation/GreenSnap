# GreenSnap - Security & Privacy Analyse

> Opgesteld vanuit het perspectief van een privacy/cybersecurity consultant.
> Doel: risico's in kaart brengen en concrete oplossingen geven.

## 1. Welke persoonsgegevens verwerken we?

| Gegeven | Categorie (AVG) | Waar opgeslagen | Risico-niveau |
|---|---|---|---|
| Klantnamen (Fam. Smit) | Identificerend | Supabase DB | Midden |
| Klantadressen | Identificerend + locatie | Supabase DB | Hoog |
| Foto's van tuinen/panden | Indirect identificerend | Supabase Storage | Hoog |
| GPS-coordinaten | Locatiegegevens | Supabase DB | Hoog |
| Telefoonnummers medewerkers | Identificerend | Supabase DB | Midden |
| Telegram chat-IDs | Pseudoniem | Server memory | Laag |
| E-mailadressen klanten | Identificerend | Supabase DB (later) | Midden |
| Factuurgegevens (KVK, BTW, IBAN) | Zakelijk | Supabase DB | Midden |
| Spraakberichten | Biometrisch (stem) | Supabase Storage | Hoog |

**Conclusie:** We verwerken persoonsgegevens die onder de AVG vallen. Foto's van woningen gecombineerd met adressen zijn privacy-gevoelig.

## 2. Huidige risico's

### KRITIEK

| # | Risico | Impact | Huidige status |
|---|---|---|---|
| K1 | **Supabase anon key in frontend** | Iedereen kan met die key data uitlezen als RLS niet waterdicht is | RLS staat aan maar niet getest |
| K2 | **Geen authenticatie op dashboard** | Iedereen met de URL kan klantgegevens zien | Geen auth gebouwd |
| K3 | **Telegram bot token in .env.local** | Bij lek kan iemand de bot overnemen | Niet in git, maar op disk |
| K4 | **Foto's in public Supabase bucket** | Alle foto's zijn publiek toegankelijk via URL | Bucket is public |
| K5 | **Geen HTTPS afdwinging** | Lokaal draait HTTP, data gaat onversleuteld | Vercel forceert HTTPS |

### HOOG

| # | Risico | Impact | Huidige status |
|---|---|---|---|
| H1 | **Geen rate limiting op API routes** | Bot of API kan misbruikt worden (spam, DDoS) | Geen bescherming |
| H2 | **RLS policies niet getest** | Data-lek tussen tenants mogelijk | Policies geschreven maar ongetest |
| H3 | **Service role key leeg** | Als die ingevuld wordt en lekt, bypass alle RLS | Leeg (goed), maar geen instructie |
| H4 | **Geen audit logging** | Bij incident geen spoor van wie wat wanneer deed | Niet gebouwd |
| H5 | **Spraakberichten = biometrische data** | Stemherkenning mogelijk, extra AVG-plichten | Geen consent gevraagd |

### MIDDEN

| # | Risico | Impact | Huidige status |
|---|---|---|---|
| M1 | **Geen data-retentie beleid** | Foto's en data blijven oneindig staan | Geen cleanup |
| M2 | **Geen backup-strategie** | Supabase crash = data kwijt | Supabase heeft auto-backups (Pro plan) |
| M3 | **Concept-mail in plaintext** | E-mail content onversleuteld in transit | Standaard SMTP |
| M4 | **Geen cookie/session management** | Na auth: session fixation mogelijk | Auth nog niet gebouwd |

## 3. Oplossingen per risico

### K1: Supabase anon key + RLS waterdicht maken

**Oplossing:**
- RLS policies testen met unit tests (elke tenant kan alleen eigen data zien)
- `service_role` key NOOIT in frontend, alleen server-side API routes
- Anon key is bedoeld voor gebruik met RLS, dat is correct
- Voeg een `anon` policy toe die INSERT toestaat voor foto-uploads maar SELECT beperkt

```sql
-- Test: inloggen als user van tenant A, probeer data van tenant B te lezen
-- Moet 0 rows teruggeven
```

### K2: Authenticatie toevoegen

**Oplossing:**
- Supabase Auth met email + wachtwoord voor eigenaren
- Next.js middleware die `/dashboard/*` routes beschermt
- Geen auth voor Telegram (bot-token is de auth)
- Session via Supabase Auth cookie (httpOnly, secure, sameSite)

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getSession(request);
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### K3: Secrets management

**Oplossing:**
- Vercel Environment Variables (versleuteld opgeslagen)
- Telegram bot token als Vercel env var, niet in code
- `.env.local` in `.gitignore` (al gedaan)
- Roteer bot token periodiek via @BotFather `/revoke`

### K4: Foto-bucket private maken

**Oplossing:**
- Verander Supabase Storage bucket van `public` naar `private`
- Gebruik signed URLs met expiry (bv. 1 uur) voor foto-weergave
- Eigenaar krijgt signed URL via server-side API route

```typescript
const { data } = await supabase.storage
  .from('photos')
  .createSignedUrl(path, 3600); // 1 uur geldig
```

### K5: HTTPS

**Oplossing:**
- Vercel forceert HTTPS automatisch op alle routes
- Custom domein: Vercel regelt SSL-certificaat
- Lokaal: `localhost` is exempt van mixed-content-blocking, maar test altijd via Vercel preview

### H1: Rate limiting

**Oplossing:**
- Vercel Edge Middleware met rate limiter (bv. `@vercel/edge-rate-limit` of `upstash/ratelimit`)
- Telegram webhook: max 30 requests/seconde (Telegram limiteert zelf ook)
- API routes: max 100 requests/minuut per IP

### H2: RLS testen

**Oplossing:**
- Schrijf een test-script dat met 2 verschillende auth-tokens data probeert te lezen
- Automatiseer in CI/CD

### H5: Spraakberichten consent

**Oplossing:**
- Bij eerste spraakbericht: bot stuurt disclaimer
- "Door spraakberichten te sturen ga je akkoord met opslag voor rapportage-doeleinden"
- Retentie: verwijder na 90 dagen (of configureerbaar)

## 4. AVG-compliance checklist

| Eis | Status | Actie nodig |
|---|---|---|
| Verwerkingsregister | Niet aanwezig | Opstellen: welke data, doel, bewaartermijn, verwerkers |
| Verwerkersovereenkomst met Supabase | Niet getekend | Supabase DPA tekenen (beschikbaar op hun site) |
| Privacyverklaring voor klanten | Niet aanwezig | Opstellen: wat we verzamelen, waarom, hoe lang |
| Recht op inzage/verwijdering | Niet geimplementeerd | Admin-functie: exporteer/verwijder klantdata |
| Data minimalisatie | OK | We verzamelen alleen wat nodig is |
| Bewaartermijn | Niet gedefinieerd | Max 1 jaar na laatste contact, daarna verwijderen |
| Beveiligingsmaatregelen | Deels | Versleuteling in transit (HTTPS) en at rest (Supabase) |
| Meldplicht datalekken | Geen procedure | Protocol opstellen: binnen 72 uur AP melden |

## 5. Prioriteit-actieplan

### Nu doen (voor lancering)

1. **Foto-bucket private maken** in Supabase dashboard
2. **Authenticatie bouwen** voor dashboard (Supabase Auth)
3. **HTTPS via Vercel** deployen (automatisch)
4. **Privacyverklaring** opstellen (kan eenvoudig voor PoC)
5. **RLS policies testen** met meerdere tenants

### Binnen 1 maand

6. **Rate limiting** op API routes
7. **Signed URLs** voor foto-weergave
8. **Supabase DPA** tekenen
9. **Data-retentie** beleid implementeren
10. **Audit logging** toevoegen

### Bij schaal (10+ klanten)

11. **Verwerkingsregister** formaliseren
12. **Penetratietest** laten uitvoeren
13. **Backup-restore** procedure testen
14. **Incident response** procedure opstellen
15. **ISO 27001** overwegen bij enterprise-klanten

## 6. Architectuur na security-fixes

```
Gebruiker (HTTPS) ──→ Vercel (SSL termination)
                         │
                         ├── /dashboard/* (auth middleware, session check)
                         ├── /api/* (rate limited, auth header check)
                         └── /api/telegram (webhook, bot token verificatie)
                                │
                                ▼
                         Supabase (RLS enforced)
                         ├── DB: tenant-geisoleerde data
                         ├── Storage: private bucket, signed URLs
                         └── Auth: email/wachtwoord, session cookies
```

## 7. Kosten security-maatregelen

| Maatregel | Kosten | Toelichting |
|---|---|---|
| HTTPS (Vercel) | EUR 0 | Inbegrepen |
| Supabase Auth | EUR 0 | Inbegrepen in free/pro tier |
| Private bucket + signed URLs | EUR 0 | Config-wijziging |
| Rate limiting (Upstash) | EUR 0-10/mnd | Free tier: 10K req/dag |
| DPA Supabase | EUR 0 | Online beschikbaar |
| Privacyverklaring | EUR 0-500 | Zelf schrijven of jurist |
| Penetratietest | EUR 1.500-5.000 | Bij schaal, niet nu |

**Totaal voor lancering: EUR 0 extra.** Alle basis security-maatregelen zijn gratis.
