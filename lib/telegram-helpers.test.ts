import { describe, it, expect } from "vitest";
import {
  truncateAddress,
  formatClientButtonLabel,
  parseClientButtonText,
  type ClientForButton,
} from "./telegram-helpers";

const CLIENTS: ClientForButton[] = [
  { id: "a", name: "Fam. De Groot", address: "Deldenerstraat 42, Hengelo" },
  { id: "b", name: "Kantoor De Brinck", address: "Marktstraat 8, Hengelo" },
  { id: "c", name: "Fam. Tester Graven", address: "Graven 26, Deventer" },
];

describe("truncateAddress", () => {
  it("returns text before comma", () => {
    expect(truncateAddress("Brink 5, Deventer")).toBe("Brink 5");
  });

  it("returns full address when no comma", () => {
    expect(truncateAddress("Graven 26")).toBe("Graven 26");
  });

  it("returns empty for empty input", () => {
    expect(truncateAddress("")).toBe("");
  });

  it("ellipsis when very long", () => {
    const long = "Heel Lange Straatnaam Met Veel Tekens 1234, Stad";
    const result = truncateAddress(long);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toMatch(/…$/);
  });
});

describe("formatClientButtonLabel", () => {
  it("uses two lines with newline", () => {
    const label = formatClientButtonLabel(CLIENTS[0]);
    expect(label).toBe("Fam. De Groot\nDeldenerstraat 42");
  });

  it("falls back to name-only when no address", () => {
    const label = formatClientButtonLabel({
      id: "x",
      name: "Test",
      address: "",
    });
    expect(label).toBe("Test");
  });
});

describe("parseClientButtonText", () => {
  it("matches via multi-line button click (first line = name)", () => {
    const result = parseClientButtonText(
      "Fam. De Groot\nDeldenerstraat 42",
      CLIENTS
    );
    expect(result?.id).toBe("a");
  });

  it("matches typed name exact", () => {
    expect(parseClientButtonText("fam. de groot", CLIENTS)?.id).toBe("a");
  });

  it("matches typed partial name substring", () => {
    expect(parseClientButtonText("brinck", CLIENTS)?.id).toBe("b");
  });

  it("matches typed address street", () => {
    expect(parseClientButtonText("deldener", CLIENTS)?.id).toBe("a");
    expect(parseClientButtonText("brink 5", CLIENTS)).toBeNull();
    expect(parseClientButtonText("marktstraat", CLIENTS)?.id).toBe("b");
  });

  it("matches typed graven", () => {
    expect(parseClientButtonText("graven", CLIENTS)?.id).toBe("c");
  });

  it("returns null for too-short query (< 3 chars)", () => {
    expect(parseClientButtonText("de", CLIENTS)).toBeNull();
  });

  it("returns null when no match found", () => {
    expect(parseClientButtonText("verzonnenstraat", CLIENTS)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseClientButtonText("", CLIENTS)).toBeNull();
    expect(parseClientButtonText("anything", [])).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseClientButtonText("FAM. DE GROOT", CLIENTS)?.id).toBe("a");
    expect(parseClientButtonText("Deldenerstraat 42", CLIENTS)?.id).toBe("a");
  });
});
