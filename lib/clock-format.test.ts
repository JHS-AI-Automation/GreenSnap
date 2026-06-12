import { describe, it, expect } from "vitest";
import { formatDuration } from "./clock-format";

describe("formatDuration", () => {
  it("formatteert uren en minuten als 2u15", () => {
    expect(formatDuration(2 * 3600_000 + 15 * 60_000)).toBe("2u15");
  });

  it("padt minuten naar 2 cijfers", () => {
    expect(formatDuration(3600_000 + 5 * 60_000)).toBe("1u05");
  });

  it("alleen minuten onder het uur", () => {
    expect(formatDuration(42 * 60_000)).toBe("42 min");
  });

  it("0 min bij minder dan een minuut", () => {
    expect(formatDuration(30_000)).toBe("0 min");
  });

  it("NaN of negatief geeft 0 min", () => {
    expect(formatDuration(NaN)).toBe("0 min");
    expect(formatDuration(-5000)).toBe("0 min");
  });
});
