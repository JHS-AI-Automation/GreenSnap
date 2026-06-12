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
