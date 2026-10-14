import type { LatLon } from './types';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Picks a search radius (metres) from a bounding box [south, north, west, east]:
 * half the box diagonal, kept between 1.5 km and 8 km so big cities stay fast
 * and tiny villages still return something.
 */
export function radiusFromExtent(extent?: [number, number, number, number]): number {
  if (!extent) return 5000;
  const [s, n, w, e] = extent;
  const diagKm = haversineKm({ lat: s, lon: w }, { lat: n, lon: e });
  return Math.round(Math.min(8000, Math.max(1500, (diagKm * 1000) / 2)));
}
