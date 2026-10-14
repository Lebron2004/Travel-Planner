import { classify, dietsFromTags, estimateBudget, isFree } from './categories';
import { haversineKm } from './geo';
import { commonsThumb } from './photos';
import type { Category, LatLon, Place } from './types';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/** Give up on a busy mirror after this long and try the next one. */
const TIMEOUT_MS = 20000;

/** Overpass "(south,west,north,east)" box around a point. Much faster to query than `around`. */
export function bboxAround(center: LatLon, radius: number): string {
  const dLat = radius / 111320;
  const dLon = radius / (111320 * Math.cos((center.lat * Math.PI) / 180));
  const f = (n: number) => n.toFixed(5);
  return `(${f(center.lat - dLat)},${f(center.lon - dLon)},${f(center.lat + dLat)},${f(center.lon + dLon)})`;
}

/** How many results per tab we ask Overpass for. */
const LIMITS: Record<Category, number> = { sights: 150, food: 250, gems: 150, stays: 120 };

/**
 * One Overpass request with a separate result set (and cap) per tab, so a
 * restaurant-dense city can't crowd out the sights.
 */
export function buildOverpassQuery(center: LatLon, radius: number): string {
  const r = Math.round(radius);
  const around = bboxAround(center, r);
  // Food is dense; a tighter box keeps it walkable and the query fast.
  const near = bboxAround(center, Math.min(r, 3000));
  return `[out:json][timeout:25];
(
  nwr["tourism"~"^(museum|gallery|attraction|zoo|aquarium|theme_park)$"]["name"]${around};
  nwr["historic"~"^(castle|palace|fort|monument|city_gate)$"]["name"]${around};
  nwr["amenity"="place_of_worship"]["wikidata"]["name"]${around};
  nwr["leisure"="park"]["wikidata"]["name"]${around};
)->.sights;
.sights out center tags ${LIMITS.sights};
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|ice_cream|food_court|pub|bar|biergarten)$"]["name"]${near};
  nwr["shop"~"^(bakery|pastry|deli)$"]["name"]${near};
)->.food;
.food out center tags ${LIMITS.food};
(
  nwr["tourism"~"^(artwork|viewpoint)$"]["name"]${around};
  nwr["historic"~"^(ruins|archaeological_site|wreck|ship|aqueduct|mine)$"]["name"]${around};
  nwr["natural"~"^(waterfall|cave_entrance|hot_spring|spring|beach)$"]["name"]${around};
  nwr["leisure"="garden"]["name"]${around};
  nwr["amenity"="marketplace"]["name"]${around};
  nwr["shop"~"^(books|antiques|second_hand)$"]["name"]${near};
)->.gems;
.gems out center tags ${LIMITS.gems};
(
  nwr["tourism"~"^(hotel|hostel|guest_house|motel|apartment|camp_site|chalet|alpine_hut)$"]["name"]${around};
)->.stays;
.stays out center tags ${LIMITS.stays};`;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function parseOverpass(json: { elements?: OverpassElement[] }, center: LatLon): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of json.elements ?? []) {
    const id = `${el.type}/${el.id}`;
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const name = tags['name:en'] ?? tags.name;
    if (seen.has(id) || lat === undefined || lon === undefined || !name) continue;
    const cls = classify(tags);
    if (!cls) continue;
    seen.add(id);

    let image: string | undefined;
    if (tags.image?.startsWith('https://')) image = tags.image;
    else if (tags.wikimedia_commons?.startsWith('File:')) image = commonsThumb(tags.wikimedia_commons);

    places.push({
      id,
      name,
      ...cls,
      lat,
      lon,
      tags,
      budget: estimateBudget(cls.category, tags),
      diets: dietsFromTags(tags),
      wheelchair: ['yes', 'limited', 'no'].includes(tags.wheelchair)
        ? (tags.wheelchair as Place['wheelchair'])
        : undefined,
      free: isFree(cls.kind, tags),
      cuisine: (tags.cuisine ?? '')
        .split(';')
        .map((c) => c.trim().replace(/_/g, ' '))
        .filter(Boolean),
      wikidata: /^Q\d+$/.test(tags.wikidata ?? '') ? tags.wikidata : undefined,
      image,
      website: tags.website ?? tags['contact:website'],
      distanceKm: haversineKm(center, { lat, lon }),
    });
  }
  return places;
}

/** Ranking used for every list: famous (Wikidata) things first for sights, otherwise nearest first. */
export function rankPlaces(places: Place[]): Place[] {
  return [...places].sort((a, b) => {
    if (a.category === 'sights' && b.category === 'sights') {
      const fame = Number(!!b.wikidata) - Number(!!a.wikidata);
      if (fame) return fame;
    }
    return a.distanceKm - b.distanceKm;
  });
}

async function postWithTimeout(url: string, body: URLSearchParams, outer?: AbortSignal) {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  outer?.addEventListener('abort', abort);
  const timer = setTimeout(abort, TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'POST', body, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();
    // Overpass reports its own timeouts in a 200 response with a "remark".
    if (!json.elements?.length && /timed out|runtime error/i.test(json.remark ?? '')) {
      throw new Error('Overpass timed out');
    }
    return json;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', abort);
  }
}

export async function fetchPlaces(center: LatLon, radius: number, signal?: AbortSignal): Promise<Place[]> {
  const body = new URLSearchParams({ data: buildOverpassQuery(center, radius) });
  let lastError: unknown;
  for (const url of ENDPOINTS) {
    try {
      return rankPlaces(parseOverpass(await postWithTimeout(url, body, signal), center));
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load places');
}
