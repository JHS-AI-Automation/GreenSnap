const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    countrycodes: "nl",
    addressdetails: "1",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      "User-Agent": "GreenSnap/1.0 (foto-rapportage app)",
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const data = await res.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
