import { radiusFromExtent } from './geo';
import type { Destination } from './types';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
    /** [west, north, east, south] */
    extent?: [number, number, number, number];
  };
}

const US_STATES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
  Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'Puerto Rico': 'PR',
};

const SHORT_COUNTRY: Record<string, string> = {
  US: 'USA',
  GB: 'UK',
  AE: 'UAE',
};

/** Places worth planning a trip around; skips tiny hamlets and single farms. */
const TRIP_PLACES = new Set(['city', 'town', 'village', 'municipality', 'borough', 'suburb', 'quarter', 'island', 'archipelago', 'county', 'state', 'province', 'region', 'country']);

/** "NY, USA" style second line, like most travel sites. */
export function formatContext(p: PhotonFeature['properties']): string {
  const cc = p.countrycode?.toUpperCase();
  const country = (cc && SHORT_COUNTRY[cc]) ?? p.country;
  if (cc === 'US') {
    const state = p.state ? (US_STATES[p.state] ?? p.state) : undefined;
    const city = p.city && p.city !== p.name ? p.city : undefined;
    return [city, p.osm_value === 'state' ? undefined : state, country].filter(Boolean).join(', ');
  }
  return [p.city !== p.name ? p.city : undefined, p.state !== p.name ? p.state : undefined, country === p.name ? undefined : country]
    .filter(Boolean)
    .join(', ');
}

export function photonToDestination(f: PhotonFeature): Destination | null {
  const p = f.properties;
  if (!p.name) return null;
  if (p.osm_key === 'place' && p.osm_value && !TRIP_PLACES.has(p.osm_value)) return null;
  const [lon, lat] = f.geometry.coordinates;
  const extent = p.extent ? ([p.extent[3], p.extent[1], p.extent[0], p.extent[2]] as [number, number, number, number]) : undefined;
  return { name: p.name, context: formatContext(p), lat, lon, radius: radiusFromExtent(extent) };
}

/**
 * Place search via Photon (komoot), which is free, keyless and, unlike
 * Nominatim's public server, allows search-as-you-type.
 */
export async function searchDestinations(query: string, signal?: AbortSignal): Promise<Destination[]> {
  if (query.trim().length < 2) return [];
  // Only places (cities, towns, countries…), not every shop or street that starts with "new".
  const params = new URLSearchParams({ q: query, limit: '10', lang: 'en', osm_tag: 'place' });
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
    })
    .slice(0, 6);
}
