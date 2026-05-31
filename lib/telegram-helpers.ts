// Pure helpers voor de Telegram bot - testbaar zonder mocks.

export interface ClientForButton {
  id: string;
  name: string;
  address: string;
}

const MAX_BUTTON_LABEL_CHARS = 30;

/**
 * Truncate adres tot alleen straat + huisnummer (alles voor de eerste komma),
 * en kort af op MAX_BUTTON_LABEL_CHARS.
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  const beforeComma = address.split(",")[0].trim();
  if (beforeComma.length <= MAX_BUTTON_LABEL_CHARS) return beforeComma;
  return beforeComma.slice(0, MAX_BUTTON_LABEL_CHARS - 1) + "…";
}

/**
 * Bouw multi-line label voor Telegram reply-keyboard knop:
 * regel 1 = klantnaam (dominant)
 * regel 2 = adres (kleiner door Telegram-rendering)
 */
export function formatClientButtonLabel(client: ClientForButton): string {
  const addr = truncateAddress(client.address);
  if (!addr) return client.name;
  return `${client.name}\n${addr}`;
}

/**
 * Parse de text die de gebruiker terugstuurt na klikken op een knop OF typen:
 * - eerste regel zou de naam moeten zijn (van een multi-line knop)
 * - of de volledige tekst zou kunnen matchen op adres-substring
 *
 * Returnt de matched client of null.
 */
export function parseClientButtonText(
  rawText: string,
  clients: ClientForButton[]
): ClientForButton | null {
  if (!rawText || !Array.isArray(clients) || clients.length === 0) return null;

  const normalized = rawText.trim().toLowerCase();
  const firstLine = normalized.split("\n")[0].trim();

  // 1. Exacte naam match op eerste regel (= geklikt op multi-line knop)
  const byName = clients.find((c) => c.name.toLowerCase() === firstLine);
  if (byName) return byName;

  // 2. Naam-substring (gebruiker typte deel van naam, bv. "smit")
  if (firstLine.length >= 3) {
    const byNameSub = clients.find((c) =>
      c.name.toLowerCase().includes(firstLine)
    );
    if (byNameSub) return byNameSub;
  }

  // 3. Adres-substring: gebruiker typte deel van straat ("brink", "deldener")
  if (firstLine.length >= 3) {
    const byAddress = clients.find((c) => {
      const addrLower = c.address.toLowerCase();
      const streetOnly = addrLower.split(",")[0].trim();
      return streetOnly.includes(firstLine) || addrLower.includes(firstLine);
    });
    if (byAddress) return byAddress;
  }

  return null;
}
