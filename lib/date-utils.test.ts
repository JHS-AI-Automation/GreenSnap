import { describe, it, expect } from "vitest";
import {
  formatDutchDate,
  formatDutchDateLong,
  formatDutchTime,
  todayISO,
  isoDateOrNull,
} from "./date-utils";

describe("formatDutchDate", () => {
  it("formats ISO string to Dutch date", () => {
    const result = formatDutchDate("2026-05-31T12:00:00Z");
    expect(result).toMatch(/31 mei 2026/);
  });

  it("returns empty string for null/undefined", () => {
    expect(formatDutchDate(null)).toBe("");
    expect(formatDutchDate(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDutchDate("not-a-date")).toBe("");
  });
});

describe("formatDutchTime", () => {
  it("formats time as HH:MM", () => {
    const result = formatDutchTime("2026-05-31T14:32:00Z");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns empty for invalid", () => {
    expect(formatDutchTime(null)).toBe("");
    expect(formatDutchTime("garbage")).toBe("");
  });
});

describe("todayISO", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isoDateOrNull", () => {
  it("returns ISO date for valid input", () => {
    expect(isoDateOrNull("2026-05-31")).toBe("2026-05-31");
    expect(isoDateOrNull("2026-05-31T12:00:00Z")).toBe("2026-05-31");
  });

  it("returns null for invalid input", () => {
    expect(isoDateOrNull("not-a-date")).toBeNull();
    expect(isoDateOrNull("")).toBeNull();
    expect(isoDateOrNull("foo bar")).toBeNull();
  });
});

describe("formatDutchDateLong", () => {
  it("includes weekday for valid date", () => {
    const result = formatDutchDateLong("2026-05-31");
    expect(result.toLowerCase()).toMatch(/zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag/);
  });
});
