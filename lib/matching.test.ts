import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  findNearestClient,
  isWithinTimeWindow,
} from "./matching";

describe("haversineDistance", () => {
  it("returns 0 for same coordinates", () => {
    expect(haversineDistance(52.0, 6.0, 52.0, 6.0)).toBe(0);
  });

  it("returns ~111km for 1 degree latitude", () => {
    const d = haversineDistance(52.0, 6.0, 53.0, 6.0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("returns Infinity for NaN input", () => {
    expect(haversineDistance(NaN, 6.0, 52.0, 6.0)).toBe(Infinity);
    expect(haversineDistance(52.0, NaN, 52.0, 6.0)).toBe(Infinity);
    expect(haversineDistance(52.0, 6.0, NaN, 6.0)).toBe(Infinity);
  });

  it("returns Infinity for null-cast input", () => {
    expect(
      haversineDistance(null as unknown as number, 6.0, 52.0, 6.0)
    ).toBe(Infinity);
  });
});

describe("findNearestClient", () => {
  const clients = [
    { id: "a", lat: 52.2660, lng: 6.7930 }, // Hengelo
    { id: "b", lat: 52.2551, lng: 6.1552 }, // Deventer
    { id: "c", lat: 52.3676, lng: 4.9041 }, // Amsterdam
  ];

  it("finds the nearest client within 150m radius", () => {
    const result = findNearestClient(52.2660, 6.7931, clients);
    expect(result?.id).toBe("a");
  });

  it("returns null when no client within 150m", () => {
    const result = findNearestClient(52.5, 6.5, clients);
    expect(result).toBeNull();
  });

  it("returns null for empty client list", () => {
    expect(findNearestClient(52.0, 6.0, [])).toBeNull();
  });

  it("returns null for NaN input", () => {
    expect(findNearestClient(NaN, 6.0, clients)).toBeNull();
    expect(findNearestClient(52.0, NaN, clients)).toBeNull();
  });

  it("skips clients with NaN coordinates", () => {
    const badClients = [
      { id: "bad", lat: NaN, lng: NaN },
      { id: "good", lat: 52.2660, lng: 6.7930 },
    ];
    const result = findNearestClient(52.2660, 6.7931, badClients);
    expect(result?.id).toBe("good");
  });

  it("picks closest when multiple in radius", () => {
    const close = [
      { id: "far", lat: 52.2660, lng: 6.7940 },
      { id: "near", lat: 52.2660, lng: 6.79305 },
    ];
    const result = findNearestClient(52.2660, 6.7930, close);
    expect(result?.id).toBe("near");
  });
});

describe("isWithinTimeWindow", () => {
  it("returns true within 8 hour window", () => {
    const t1 = "2026-05-31T08:00:00Z";
    const t2 = "2026-05-31T15:30:00Z";
    expect(isWithinTimeWindow(t1, t2)).toBe(true);
  });

  it("returns false beyond 8 hour window", () => {
    const t1 = "2026-05-31T08:00:00Z";
    const t2 = "2026-05-31T17:00:00Z";
    expect(isWithinTimeWindow(t1, t2)).toBe(false);
  });

  it("returns true for same timestamp", () => {
    const t = "2026-05-31T08:00:00Z";
    expect(isWithinTimeWindow(t, t)).toBe(true);
  });

  it("handles reverse order", () => {
    const t1 = "2026-05-31T15:00:00Z";
    const t2 = "2026-05-31T08:00:00Z";
    expect(isWithinTimeWindow(t1, t2)).toBe(true);
  });

  it("returns false for null inputs", () => {
    expect(isWithinTimeWindow(null, "2026-05-31T08:00:00Z")).toBe(false);
    expect(isWithinTimeWindow("2026-05-31T08:00:00Z", null)).toBe(false);
    expect(isWithinTimeWindow(null, null)).toBe(false);
  });

  it("returns false for invalid date strings", () => {
    expect(isWithinTimeWindow("not-a-date", "2026-05-31T08:00:00Z")).toBe(false);
    expect(isWithinTimeWindow("2026-05-31T08:00:00Z", "garbage")).toBe(false);
  });
});
