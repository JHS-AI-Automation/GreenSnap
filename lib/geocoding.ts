import {
  NOMINATIM_BASE_URL,
  NOMINATIM_TIMEOUT_MS,
  NOMINATIM_USER_AGENT,
  GEOCODE_COUNTRY,
} from "./constants";

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!address || address.trim().length < 3) return null;

  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    countrycodes: GEOCODE_COUNTRY,
    addressdetails: "1",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const res = await fetch(`${NOMINATIM_BASE_URL}?${params}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return {
      lat,
      lng,
      displayName: data[0].display_name ?? address,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
