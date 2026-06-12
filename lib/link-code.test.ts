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

  it("false als verlopen", () => {
    expect(isLinkCodeValid(new Date(Date.now() - 60_000).toISOString())).toBe(false);
  });

  it("false bij null of onzin-datum", () => {
    expect(isLinkCodeValid(null)).toBe(false);
    expect(isLinkCodeValid("geen-datum")).toBe(false);
  });
});
