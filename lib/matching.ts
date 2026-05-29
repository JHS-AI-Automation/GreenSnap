import type { Client, Photo } from "@/types/database";

const MATCH_RADIUS_METERS = 150;
const TIME_WINDOW_HOURS = 8;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestClient(
  lat: number,
  lng: number,
  clients: Client[]
): Client | null {
  let nearest: Client | null = null;
  let minDistance = Infinity;

  for (const client of clients) {
    const dist = haversineDistance(lat, lng, client.lat, client.lng);
    if (dist < MATCH_RADIUS_METERS && dist < minDistance) {
      minDistance = dist;
      nearest = client;
    }
  }

  return nearest;
}

export function isWithinTimeWindow(
  photo1Time: string,
  photo2Time: string
): boolean {
  const t1 = new Date(photo1Time).getTime();
  const t2 = new Date(photo2Time).getTime();
  const diffHours = Math.abs(t2 - t1) / (1000 * 60 * 60);
  return diffHours <= TIME_WINDOW_HOURS;
}

export function findMatchingBeforePhoto(
  afterPhoto: Photo,
  beforePhotos: Photo[]
): Photo | null {
  return (
    beforePhotos.find(
      (bp) =>
        bp.user_id === afterPhoto.user_id &&
        bp.job_id === afterPhoto.job_id &&
        isWithinTimeWindow(bp.taken_at, afterPhoto.taken_at)
    ) ?? null
  );
}
