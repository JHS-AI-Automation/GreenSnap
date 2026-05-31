import type { Photo } from "@/types/database";
import { MATCH_RADIUS_METERS, TIME_WINDOW_HOURS } from "./constants";

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2) ||
    lat1 === null || lng1 === null || lat2 === null || lng2 === null
  ) {
    return Infinity;
  }

  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestClient<T extends { lat: number; lng: number }>(
  lat: number,
  lng: number,
  clients: T[]
): T | null {
  if (isNaN(lat) || isNaN(lng) || !Array.isArray(clients)) return null;

  let nearest: T | null = null;
  let minDistance = Infinity;

  for (const client of clients) {
    if (isNaN(client.lat) || isNaN(client.lng)) continue;
    const dist = haversineDistance(lat, lng, client.lat, client.lng);
    if (dist <= MATCH_RADIUS_METERS && dist < minDistance) {
      minDistance = dist;
      nearest = client;
    }
  }

  return nearest;
}

export function isWithinTimeWindow(
  photo1Time: string | null | undefined,
  photo2Time: string | null | undefined
): boolean {
  if (!photo1Time || !photo2Time) return false;
  const t1 = new Date(photo1Time).getTime();
  const t2 = new Date(photo2Time).getTime();
  if (isNaN(t1) || isNaN(t2)) return false;
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
