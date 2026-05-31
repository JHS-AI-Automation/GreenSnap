// Pure RFC 5322 .eml builder. Geen externe dependencies.
// Build een MIME multipart/mixed message string die mail-clients als concept openen.

export interface EmlAttachment {
  filename: string;
  contentType: string;
  data: Buffer | Uint8Array; // raw binary
}

export interface EmlOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
  date?: Date;
  attachments?: EmlAttachment[];
}

const CRLF = "\r\n";

/**
 * Encode UTF-8 subject using Base64 encoded-word per RFC 2047.
 * Voorbeeld: "Café" -> "=?UTF-8?B?Q2Fmw6k=?="
 */
function encodeSubject(subject: string): string {
  const hasNonAscii = /[^\x20-\x7E]/.test(subject);
  if (!hasNonAscii) return subject;
  const base64 = Buffer.from(subject, "utf-8").toString("base64");
  return `=?UTF-8?B?${base64}?=`;
}

/**
 * Encode binary buffer as base64 with 76-char line breaks per RFC 4648.
 */
function base64WithLineBreaks(data: Buffer | Uint8Array): string {
  const base64 = Buffer.from(data).toString("base64");
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += 76) {
    chunks.push(base64.slice(i, i + 76));
  }
  return chunks.join(CRLF);
}

function generateBoundary(): string {
  const random = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `----=_GreenSnap_${random}`;
}

function formatRfc5322Date(date: Date): string {
  // Voorbeeld: "Sat, 31 May 2026 12:00:00 +0000"
  return date.toUTCString().replace("GMT", "+0000");
}

/**
 * Bouw een complete .eml string.
 */
export function buildEml(opts: EmlOptions): string {
  const { from, to, subject, body, date, attachments } = opts;
  const dateHeader = formatRfc5322Date(date ?? new Date());
  const encodedSubject = encodeSubject(subject);

  // Geen bijlagen: simpele text/plain message
  if (!attachments || attachments.length === 0) {
    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `Date: ${dateHeader}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      body,
    ].join(CRLF);
  }

  // Multipart/mixed met bijlagen
  const boundary = generateBoundary();
  const parts: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `Date: ${dateHeader}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `This is a multi-part message in MIME format.`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
    ``,
  ];

  for (const att of attachments) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
    parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    parts.push(`Content-Transfer-Encoding: base64`);
    parts.push(``);
    parts.push(base64WithLineBreaks(att.data));
    parts.push(``);
  }

  parts.push(`--${boundary}--`);

  return parts.join(CRLF);
}
