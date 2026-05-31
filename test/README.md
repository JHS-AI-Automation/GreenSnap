# Test bestanden

## klanten-test.csv

10 echte Deventer-adressen om de bulk-import te testen.

**Gebruik:**
1. Ga naar https://green-snap-rouge.vercel.app/dashboard/settings
2. Tab Klantlocaties > Bulk import (CSV)
3. Upload `klanten-test.csv`
4. Klik "Controleer eerst (dry run)" - verwacht: 10x status OK
5. Klik "Importeer alles" - alle 10 klanten worden toegevoegd

Geocoding duurt ~10 seconden (1 sec/adres rate limit voor Nominatim).

## klanten-test-met-fouten.csv

7 rijen die alle edge cases testen:

| # | Naam | Verwachte status |
|---|---|---|
| 1 | Fam. Goedebeurt | OK |
| 2 | Fam. Pietersen | Dubbel (als je eerst klanten-test.csv hebt geimporteerd) |
| 3 | Fout Adres BV | Niet gevonden (verzonnen straatnaam) |
| 4 | (leeg) | Fout (lege naam) |
| 5 | Test Lege Adres | Fout (leeg adres) |
| 6 | Fam. Internationaal | Niet gevonden (buiten NL door countrycode-filter) |
| 7 | Cafe De Hoek | OK |

Gebruik dit bestand om te checken of de foutafhandeling werkt.
