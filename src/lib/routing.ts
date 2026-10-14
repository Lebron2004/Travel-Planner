import { haversineKm } from './geo';
import type { LatLon } from './types';

export type TravelMode = 'foot' | 'bike' | 'car';

export const MODES: { id: TravelMode; label: string; icon: string; kmh: number }[] = [
  { id: 'foot', label: 'Walk', icon: '🚶', kmh: 4.8 },
  { id: 'bike', label: 'Bike', icon: '🚲', kmh: 15 },
  { id: 'car', label: 'Drive', icon: '🚗', kmh: 30 },
];

export interface Route {
  /** [lat, lon] pairs, ready for Leaflet */
  path: [number, number][];
  distanceKm: number;
  durationS: number;
  /** True when the routing server was unreachable and we drew straight lines. */
  approximate: boolean;
}

/**
 * Greedy nearest-neighbour ordering: start at `start` (or the first stop) and
 * always walk to the closest unvisited stop. Not optimal, but good and instant
 * for the handful of stops in a day.
 */
export function orderStops<T extends LatLon>(stops: T[], start?: LatLon): T[] {
  if (stops.length < 3 && !start) return [...stops];
  const left = [...stops];
  const ordered: T[] = [];
  let here: LatLon = start ?? left[0];
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (haversineKm(here, left[i]) < haversineKm(here, left[best])) best = i;
    }
    here = left.splice(best, 1)[0];
    ordered.push(here as T);
  }
  return ordered;
}

export function straightLineRoute(stops: LatLon[], mode: TravelMode): Route {
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1], stops[i]);
  // Streets are rarely straight; 1.3x is a common detour factor.
  const distanceKm = km * 1.3;
  const kmh = MODES.find((m) => m.id === mode)!.kmh;
  return {
    path: stops.map((s) => [s.lat, s.lon]),
    distanceKm,
    durationS: (distanceKm / kmh) * 3600,
    approximate: true,
  };
}

/** Street-following route through the stops, from the FOSSGIS OSRM servers (free, keyless). */
export async function fetchRoute(stops: LatLon[], mode: TravelMode, signal?: AbortSignal): Promise<Route | null> {
  if (stops.length < 2) return null;
  const coords = stops.map((s) => `${s.lon.toFixed(6)},${s.lat.toFixed(6)}`).join(';');
  try {
    const res = await fetch(
      `https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal },
    );
    if (!res.ok) throw new Error(`Routing ${res.status}`);
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) throw new Error('No route');
    return {
      path: (route.geometry.coordinates as [number, number][]).map(([lon, lat]) => [lat, lon]),
      distanceKm: route.distance / 1000,
      durationS: route.duration,
      approximate: false,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return straightLineRoute(stops, mode);
  }
}
