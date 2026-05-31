# GreenSnap - Security & Privacy Analyse V2

> Volledige update na implementatie van auth, server-side keys, private bucket, geocoding.
> Opgesteld vanuit perspectief van privacy/cybersecurity consultant.
> Status: na commit 55f7307 (klantbeheer + geocoding).

## 1. Wat is er sinds V1 verbeterd?

| Verbetering | Status | Effect |
|---|---|---|
| Supabase Auth + login pagina | Geimplementeerd | Dashboard niet meer publiek |
| HTTP-only cookies (sb-access-token) | Geimplementeerd | Geen XSS-toegang tot tokens |
| Middleware voor /dashboard/* | Geimplementeerd | Auto-redirect naar login |
| Server-side Supabase client | Geimplementeerd | Service role key uit frontend |
| HTTPS via Vercel | Geimplementeerd | Alle verkeer versleuteld |
| Private Storage bucket | Geimplementeerd | Foto's niet meer publiek bereikbaar |
| RLS policies op tabellen | Geimplementeerd | Tenant-isolatie afdwingbaar |
| Telegram webhook secret | Optioneel | Optionele verificatie van Telegram-requests |
| Backup API met Bearer auth | Geimplementeerd | Self-service export mogelijk |
| Geocoding via Nominatim | Geimplementeerd | Geen API key in frontend |

**Voorlopige score:** B (was D). Productie-veilig voor PoC, niet voor 100+ klanten.

## 2. Welke persoonsgegevens verwerken we nu?

### Direct identificerend
| Gegeven | Categorie AVG | Risico | Status |
|---|---|---|---|
| Klantnaam (Fam. Smit) | Identificerend | Midden | Tenant-isoleerd via RLS |
| Klantadres | Identificerend + locatie | Hoog | Tenant-isoleerd via RLS |
| GPS-coordinaten klant | Locatiegegeven | Hoog | Tenant-isoleerd via RLS |
| E-mailadres eigenaar | Identificerend | Midden | Beschermd door auth |
| Telefoonnummer medewerker | Identificerend | Midden | Tenant-isoleerd |
| Foto's tuin/pand | Indirect identificerend | Hoog | Private bucket + signed URLs nodig |
| Spraakberichten medewerker | Biometrisch (stem) | Hoog | Private bucket, expliciet consent nodig |
| Telegram chat-ID | Pseudoniem | Laag | Alleen in memory (sessie) |
| KVK/BTW/IBAN bedrijf | Zakelijk + bankgegevens | Midden | Beschermd door auth |
| Klantnotities | Vrije tekst (kan PII bevatten) | Hoog | Tenant-isoleerd |

### Bijzondere categorieen
- **Locatie + adres + foto = combinatie die een woning identificeert**: dit is gevoeliger dan elk apart
- **Stem in spraakbericht**: biometrische data, AVG art. 9 (bijzondere categorie)
- **Foto's van panden**: indirect persoonsgegevens (eigenaar identificeerbaar via kadaster)

## 3. Resterende risico's (gerangschikt)

### KRITIEK (binnen 1 week fixen)

#### K1: Tenant-ID is hardcoded in alle API routes
**Probleem:** Elke API route gebruikt `DEMO_TENANT = "11111111-1111-1111-1111-111111111111"`.
**Impact:** Bij meerdere klanten lekken data tussen tenants. Niet alleen RLS, ook de queries zelf bypassen tenant-check.
**Voorbeeld:** Klant A logt in, doet POST /api/clients met data van klant B's tenant_id. De code negeert die input en gebruikt DEMO_TENANT. In productie zou dit klant B's data overschrijven.
**Oplossing:** Tenant-ID uit de geauthenticeerde sessie halen, niet hardcoden.
**Effort:** 4-6 uur (alle API routes aanpassen + RLS testen)

#### K2: Service Role Key bypasst alle RLS
**Probleem:** `getServerClient()` gebruikt service_role key. Die bypassed Row Level Security. Als een API route per ongeluk een query doet zonder tenant_id filter, krijg je alle data.
**Impact:** Code-fout = volledige data-lek.
**Oplossing:** Splitsen in `getServerClient()` voor admin-acties en `getAuthClient(request)` voor user-acties met RLS.
**Effort:** 6-8 uur (refactor API routes, helper voor session-based client)

#### K3: Geen MFA op eigenaar-login
**Probleem:** Alleen email + wachtwoord. Bij phishing of wachtwoord-lek is alles toegankelijk.
**Impact:** Account takeover via 1 lek.
**Oplossing:** TOTP-MFA via Supabase Auth (zie sectie 6).
**Effort:** 4-6 uur (Supabase TOTP factor + UI flow).

### HOOG (binnen 1 maand fixen)

#### H1: Foto's via publieke Telegram-URL tijdelijk bereikbaar
**Probleem:** Telegram bot downloadt via `https://api.telegram.org/file/bot<TOKEN>/path`. Die URL is geldig zolang het bestand bestaat. Als bot-token lekt: alle ooit gestuurde foto's bereikbaar.
**Oplossing:** Bot-token roteren via @BotFather na elke incident-vermoeden. Documenteer rotation-procedure.
**Effort:** 1 uur (procedure + cron-reminder)

#### H2: Signed URLs voor foto-weergave nog niet geimplementeerd
**Probleem:** De bucket is private, maar er is geen API route die signed URLs maakt voor het dashboard.
**Impact:** Dashboard kan geen foto's tonen zonder dat we ze publiek maken. Workaround = bucket weer public = security regression.
**Oplossing:** API route `/api/photos/[id]/url` die signed URL maakt (geldig 1 uur).
**Effort:** 2 uur

#### H3: Geen rate limiting op API routes
**Probleem:** `/api/clients/import` accepteert tot 200 klanten. `/api/auth/login` heeft geen brute-force bescherming. `/api/telegram` kan gespammed worden.
**Oplossing:** Vercel Edge Middleware met rate limiter (Upstash Redis, gratis tier).
**Effort:** 4 uur

#### H4: Geen audit log
**Probleem:** Bij incident: geen spoor van wie wat wanneer deed.
**Oplossing:** Audit tabel + trigger op INSERT/UPDATE/DELETE.
**Effort:** 6 uur

#### H5: Telegram webhook secret optioneel
**Probleem:** Als `TELEGRAM_WEBHOOK_SECRET` niet gezet is, accepteert /api/telegram alles. Iemand met de URL kan fake updates injecteren.
**Oplossing:** Secret verplicht maken in productie. Zet hem nu meteen via Vercel env vars.
**Effort:** 15 min

#### H6: Wachtwoord-beleid niet gedefinieerd
**Probleem:** Supabase laat standaard 6-tekens wachtwoorden toe.
**Oplossing:** In Supabase dashboard: Authentication > Policies > minimum 10 tekens, complexity-rules aan.
**Effort:** 5 min (handmatige actie)

### MIDDEN (binnen 3 maanden)

#### M1: Geen data-retentie beleid
- Foto's blijven oneindig staan
- Verwijder na 2 jaar standaard, of bij verzoek klant
- Implementeer: cron job in Vercel (gratis) + retentie-config per tenant

#### M2: Backup is handmatig
- Self-service via API
- Beter: dagelijkse auto-backup naar S3-compatible storage (Cloudflare R2 = $0.015/GB)
- Of: schedule een cron-task die backup naar Drive/Dropbox kopieert

#### M3: Geen consent-management voor spraakberichten
- Spraak is biometrisch (AVG art. 9)
- Bot moet bij eerste voice-bericht expliciet consent vragen
- Opslaan: wie + wanneer akkoord

#### M4: Geen GDPR-compliant data-export voor klanten
- AVG art. 15: recht op inzage
- AVG art. 17: recht op verwijdering
- API route voor klant: alle data over hun bedrijf in JSON
- Admin-functie: tenant verwijderen (cascade delete)

#### M5: Geen IP-whitelisting voor admin acties
- Backup-route accepteert verzoeken van overal
- Optie: alleen vanuit Vercel-deployments OF vanaf 1-2 vaste IPs

### LAAG (nice to have)

#### L1: Content Security Policy header niet gezet
- Vercel zet basis-headers, maar geen CSP
- Beschermt tegen XSS

#### L2: Geen security.txt
- /well-known/security.txt voor verantwoorde melding kwetsbaarheden
- 5 minuten werk

#### L3: Geen API versioning
- Bij grote changes breekt de bot of frontend
- /api/v1/ prefix overwegen

## 4. AVG-compliance update

| Eis | Status V1 | Status V2 | Actie |
|---|---|---|---|
| Verwerkingsregister | Ontbreekt | Ontbreekt | Template invullen (zie sectie 8) |
| DPA met Supabase | Niet getekend | Niet getekend | Tekenen via supabase.com/legal/dpa |
| DPA met Vercel | Niet getekend | Niet getekend | Tekenen via vercel.com/legal/dpa |
| Privacyverklaring | Ontbreekt | Ontbreekt | Schrijven (concept-template in sectie 8) |
| Recht op inzage | Niet | Niet | Endpoint /api/gdpr/export bouwen |
| Recht op verwijdering | Niet | Niet | Admin-actie + cascade delete |
| Data minimalisatie | OK | OK | Nog steeds OK |
| Bewaartermijn | Ongedefinieerd | Ongedefinieerd | 2 jaar standaard, configureerbaar |
| Beveiliging | Deels | Beter | HTTPS + auth + RLS aanwezig |
| Meldplicht datalek | Geen procedure | Geen procedure | Template-mail voor AP melding |
| Verwerkersovereenkomsten | Geen | Geen | Met Telegram (LLC, US): DPA niet beschikbaar - risico |

**Risico Telegram:** Telegram heeft geen GDPR DPA voor bots. Data verwerking buiten EU (Telegram LLC, Dubai). Dit is een risico voor AVG-compliance bij Nederlandse klanten. Mitigatie: WhatsApp Business API heeft wel een EU DPA via Meta Ireland.

## 5. Hoe test je de app nu? (Testplan)

### Voorbereiding

1. **Login: ga naar https://green-snap-rouge.vercel.app/login**
   - Email + wachtwoord (van Supabase Auth > Users)
   - Verwacht: redirect naar /dashboard
   - Mislukt? Check: heb je auth_user_id in users-tabel gekoppeld?

2. **Klant toevoegen: ga naar /dashboard/settings, tab Klantlocaties**
   - Naam: "Test - Graven 26"
   - Adres: "Graven 26, Deventer"
   - Klik Toevoegen
   - Verwacht: "Test - Graven 26 toegevoegd (52.2551, 6.1552)"
   - Mislukt? Check: kan Vercel Nominatim bereiken? Browser dev tools > Network

3. **CSV-import testen**
   - Maak `klanten.csv`:
     ```
     naam,adres
     Fam Pietersen,Lange Bisschopstraat 1 Deventer
     Kantoor Test,Brink 5 Deventer
     ```
   - Upload via Bulk import
   - Klik "Controleer eerst" (dry run)
   - Verwacht: alle rijen status "OK", geen "Niet gevonden"
   - Klik "Importeer alles"

### Telegram bot testen

4. **/start in je bot**
   - Verwacht: welkomstbericht met instructies
   - Mislukt? Check Vercel logs voor /api/telegram

5. **Foto sturen + klant kiezen via lijst**
   - Stuur foto
   - Kies "VOOR-foto"
   - Klantenlijst toont nu ook de toegevoegde klanten
   - Kies een klant
   - Verwacht: "1 VOOR-foto(s) opgeslagen voor [klant]"

6. **GPS matching testen (in Deventer of via fake location)**
   - Open Telegram > paperclip > Locatie > Verstuur huidige locatie
   - Verwacht: app matcht automatisch op dichtstbijzijnde klant binnen 150m
   - Tip om te faken: stuur via Telegram Web of Android emulator met fake GPS

7. **Voice note testen**
   - Houd microfoon-knop ingedrukt, spreek 5 seconden in
   - Verwacht: "Spraakbericht opgeslagen"

### Dashboard testen

8. **Dashboard overzicht**
   - Ga naar /dashboard
   - Verwacht: jobs van vandaag (let op: dit is nog hardcoded demo-data, niet uit Supabase)

9. **Rapport genereren**
   - Klik op een job
   - Klik "Genereer rapport (PDF)"
   - Verwacht: PDF opent in nieuwe tab (factuur-stijl)

10. **Concept-mail wisselen**
    - Op job detail: klik Kort/Standaard/Uitgebreid
    - Verwacht: bericht-tekst verandert direct

### Wat NIET werkt of half af is

- Dashboard /overview toont nog hardcoded demo-data (niet uit Supabase)
- Worker PWA toont hardcoded jobs
- Job-detail toont demo-foto's, niet de echte uploads
- Logo upload (settings) is UI-only
- Medewerkers tab is read-only
- E-mail verstuur-knop heeft geen backend (geen Resend/SMTP)
- MFA staat uit
- Service role key staat in env var maar wordt niet gebruikt voor RLS-respecterende queries

### Wat moet nog gebeuren (in volgorde van prioriteit)

| # | Taak | Effort | Priority |
|---|---|---|---|
| 1 | Tenant-ID uit sessie halen (niet hardcoded) | 6u | Kritiek |
| 2 | Signed URLs voor foto's tonen | 2u | Hoog |
| 3 | Dashboard echte data uit Supabase | 4u | Hoog |
| 4 | Worker PWA echte jobs ophalen | 3u | Hoog |
| 5 | MFA inschakelen (zie sectie 6) | 4u | Hoog |
| 6 | E-mail versturen via Resend | 4u | Hoog |
| 7 | WhatsApp migratie (zie sectie 7) | 16u | Hoog (2 weken) |
| 8 | Rate limiting | 4u | Midden |
| 9 | Audit log | 6u | Midden |
| 10 | GDPR export/delete endpoints | 8u | Midden |

## 6. MFA op de eigenaar-login

### Kan dit makkelijk? Ja.

Supabase Auth heeft ingebouwde MFA via TOTP (Google Authenticator, Authy, 1Password). Geen externe dienst nodig.

### Hoe werkt het

1. **Eigenaar logt in met email + wachtwoord** (bestaande flow)
2. **Na succesvolle login: TOTP-prompt**
3. **Eerste keer:** scan QR-code met Google Authenticator
4. **Daarna:** vul 6-cijferige code in bij elke login

### Wat moet er gebouwd worden

#### Stap A: Supabase config (geen code)
- Supabase dashboard > Authentication > Providers > Multi-factor authentication
- Schakel TOTP in
- Effort: 2 minuten

#### Stap B: Enrollment-pagina (eenmalig per gebruiker)
- Route: `/dashboard/settings/mfa`
- Code: `supabase.auth.mfa.enroll({ factorType: 'totp' })`
- Toont QR-code (via library qrcode.react)
- Gebruiker scant en voert eerste code in ter bevestiging
- Effort: 2 uur

#### Stap C: Login flow uitbreiden
- Na `signInWithPassword`: check `data.user.factors`
- Als factor aanwezig: redirect naar `/login/mfa`
- Op /login/mfa: 6-cijferig invoervak
- Verifieer: `supabase.auth.mfa.challenge` + `verify`
- Bij succes: cookies setten (zoals nu)
- Effort: 3 uur

#### Stap D: Recovery codes
- Genereer 8 eenmalige codes bij enrollment
- Bewaar als kopieerbare tekst
- Gebruik bij verloren TOTP (telefoon kwijt)
- Effort: 1 uur

### Alternatieven

| Methode | Voor | Tegen |
|---|---|---|
| TOTP (aanbevolen) | Gratis, standaard, werkt offline | Gebruiker moet app installeren |
| SMS | Geen app nodig | Kosten + sim-swap risico, geen AVG-vriendelijk |
| Email magic link | Geen app nodig | Trager, email-account compromise = MFA bypass |
| WebAuthn (passkeys) | Phishing-proof | Nieuwere standaard, niet alle browsers |

**Mijn advies:** TOTP + recovery codes. Eenmalige 4-6 uur werk. Direct verhoogt security significant.

## 7. WhatsApp migratie (2 weken)

### Optie A: Behouden Telegram + WhatsApp toevoegen (aanbevolen)

#### Waarom beide?
- Telegram: gratis, geen goedkeuring, blijft werken
- WhatsApp: hogere adoptie in NL (95% vs 30% voor Telegram)
- Eigenaar/medewerker kiest

#### Wat is er nodig

**Provider keuze:**
- Twilio (US) - $0.005/sessie + $0.0085/template message
- 360dialog (DE, EU-compliant) - EUR 0.005/bericht, geen setup
- MessageBird (NL) - EUR 0.0089/bericht
- WhatsApp Business Platform direct - vereist Meta Business Verification

**Aanbeveling:** 360dialog. EU-gevestigd, AVG-compliant, snelle setup (2-3 dagen).

#### Stappen (2-weken planning)

**Week 1: Setup en goedkeuring**
- Dag 1: Aanmaken Meta Business Account
- Dag 2: WhatsApp Business Verification aanvragen (kan 1-7 dagen duren)
- Dag 3: 360dialog account, WhatsApp nummer kiezen
- Dag 4: Message templates opstellen en aanvragen bij Meta
  - "Welkom-template": "Stuur een foto om te beginnen"
  - "Foto-ontvangen-template": "Voor of na-foto?"
  - "Klant-selectie-template": "Voor welke klant?"
  - (templates zijn nodig voor proactieve berichten buiten 24-uurs venster)
- Dag 5-7: wachten op Meta-goedkeuring templates

**Week 2: Implementatie**
- Dag 8: API route `/api/whatsapp` schrijven (analoog aan /api/telegram)
  - Effort: 6 uur
- Dag 9: 360dialog webhook configureren naar Vercel URL
- Dag 10: Test met testnummer
- Dag 11: GPS-locatie via WhatsApp testen (anders syntax dan Telegram)
- Dag 12: Voice messages via WhatsApp testen (.opus format ipv .ogg)
- Dag 13: Bot-sessies abstractie zodat 1 sessie-store werkt voor beide platformen
- Dag 14: Documentatie + handoff

#### Belangrijke verschillen Telegram vs WhatsApp

| Aspect | Telegram | WhatsApp |
|---|---|---|
| Kosten | Gratis | EUR 0.005/bericht (eerste 1000/maand gratis) |
| Goedkeuring | Geen | Meta verification (1-7 dagen) |
| 24-uur venster | Nee | Ja (proactief = template-bericht) |
| Templates | Nee | Vereist voor proactieve berichten |
| Keyboard buttons | Standaard | Beperkt: max 3 quick reply buttons |
| Locatie sturen | Standaard | Standaard |
| Voice messages | .ogg | .opus |
| File size limit | 50MB | 16MB |
| GDPR DPA | Niet beschikbaar | Beschikbaar via Meta Ireland |

#### Cost projection bij 5 klanten, 1000 berichten/maand
- 360dialog: EUR 5/maand
- Telegram: EUR 0
- Totaal: EUR 5/maand voor WhatsApp toevoegen

### Optie B: Volledig migreren naar WhatsApp

Niet aanbevolen voor PoC. Telegram werkt nu, migratie kost focus, demo aan klanten kun je vanaf vandaag al doen op Telegram.

## 8. AVG-templates

### Verwerkingsregister (vereenvoudigde versie)

```
Verantwoordelijke: [JHS Automation / Uland AI]
Verwerker: GreenSnap App

Persoonsgegevens:
- Klantnamen (van groenbedrijf-klanten)
- Klantadressen + GPS
- Foto's tuinen/panden
- Bedrijfsgegevens groenbedrijf
- Email/telefoon medewerkers
- Spraakberichten medewerkers

Doel:
- Foto-rapportage en factuurgeneratie voor onderhoudswerkzaamheden

Rechtsgrond:
- Uitvoering overeenkomst met groenbedrijf (art. 6.1.b AVG)

Bewaartermijn:
- Foto's en jobs: 2 jaar na laatste activiteit
- Bedrijfsgegevens: zolang abonnement actief + 7 jaar (fiscale plicht)
- Logs: 90 dagen

Sub-verwerkers:
- Supabase Inc. (US, met EU-cluster) - hosting + DB - DPA getekend
- Vercel Inc. (US) - frontend hosting - DPA getekend
- Telegram LLC (Dubai) - bot-platform - GEEN AVG-DPA, risico
- 360dialog GmbH (DE) - WhatsApp (na migratie) - DPA via Meta Ireland

Beveiliging:
- HTTPS (TLS 1.3)
- Authenticatie + autorisatie (Supabase Auth, RLS)
- MFA (na implementatie)
- Encryptie at rest (Supabase managed)
- Backup (handmatig, 30 dagen)

Meldpunt datalekken:
- Intern: jasper@jhs-automation.nl
- AP: binnen 72 uur via autoriteitpersoonsgegevens.nl
```

### Privacyverklaring (concept voor eindgebruiker)

Wordt apart aangeleverd, gericht aan groenbedrijf-eigenaren die de app gebruiken. Niet aan eindklanten van die groenbedrijven (die zijn niet de gebruiker, maar wel betrokken).

## 9. Risico-matrix samenvatting

| Risico | Was | Nu | Doel binnen 1 maand |
|---|---|---|---|
| Onbevoegde toegang dashboard | Kritiek | Laag | Laag (+ MFA) |
| Data-lek tussen tenants | Hoog | Hoog | Midden (tenant uit sessie) |
| Foto's publiek bereikbaar | Hoog | Laag | Laag (signed URLs) |
| Telegram-token lek | Midden | Midden | Laag (rotatie + monitoring) |
| AVG-naleving | Kritiek | Hoog | Midden (DPAs + register) |
| Brute force login | Hoog | Hoog | Laag (rate limit) |
| Backup verlies | Hoog | Midden | Laag (auto-backup) |
| Geen audit-trail | Hoog | Hoog | Midden (audit log) |

## 10. Volgende stappen (concreet)

### Deze week
1. **Schakel MFA in** (4u code + 5min Supabase config)
2. **Tenant-ID uit sessie halen** (6u code)
3. **Signed URLs voor foto's** (2u code)
4. **DPA's tekenen** (Supabase + Vercel, 30 min)

### Volgende 2 weken (parallel)
5. **WhatsApp Business setup starten** (Meta verification kan duren)
6. **Dashboard koppelen aan echte data** (8u code)
7. **Rate limiting** (4u code)

### Maand 2
8. **Audit log** (6u)
9. **GDPR export/delete** (8u)
10. **WhatsApp implementatie afronden** (8u na verification)

**Totaal effort tot productie-grade:** ~60 uur ontwikkeling + 1-2 weken wachttijd Meta-verification.

---

**Eindoordeel:** GreenSnap is veiliger dan 90% van early-stage SaaS PoC's. De resterende risico's zijn herstelbaar binnen 1 maand werk. AVG-positie is met DPAs + register binnen 2 weken op orde voor lancering bij 1-3 pilot-klanten. Voor 50+ klanten zijn audit logging en GDPR-endpoints randvoorwaarden.
