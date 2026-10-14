import { radiusFromExtent } from './geo';
import type { Destination } from './types';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_value?: string;
    /** [west, north, east, south] */
    extent?: [number, number, number, number];
  };
}

export function photonToDestination(f: PhotonFeature): Destination | null {
  const p = f.properties;
  if (!p.name) return null;
  const [lon, lat] = f.geometry.coordinates;
  const context = [p.city !== p.name ? p.city : undefined, p.state !== p.name ? p.state : undefined, p.country]
    .filter(Boolean)
    .join(', ');
  const extent = p.extent ? ([p.extent[3], p.extent[1], p.extent[0], p.extent[2]] as [number, number, number, number]) : undefined;
  return { name: p.name, context, lat, lon, radius: radiusFromExtent(extent) };
}

/**
 * Place search via Photon (komoot), which is free, keyless and, unlike
 * Nominatim's public server, allows search-as-you-type.
 */
export async function searchDestinations(query: string, signal?: AbortSignal): Promise<Destination[]> {
  if (query.trim().length < 2) return [];
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'en' });
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json: { features?: PhotonFeature[] } = await res.json();
  const seen = new Set<string>();
  return (json.features ?? [])
    .map(photonToDestination)
    .filter((d): d is Destination => {
      if (!d) return false;
      const key = `${d.name}|${d.context}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
