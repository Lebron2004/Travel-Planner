import type { Place } from './types';

/** Thumbnail URL for a Wikimedia Commons file name ("File:Foo.jpg" or "Foo.jpg"). */
export function commonsThumb(file: string, width = 640): string {
  const name = file.replace(/^File:/i, '').trim().replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`;
}

interface WikidataEntity {
  claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] };
  descriptions?: { en?: { value?: string } };
}

export function extractWikidata(entities: Record<string, WikidataEntity>) {
  const out = new Map<string, { image?: string; description?: string }>();
  for (const [id, entity] of Object.entries(entities)) {
    const file = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    out.set(id, {
      image: file ? commonsThumb(file) : undefined,
      description: entity.descriptions?.en?.value,
    });
  }
  return out;
}

/** Fills in photos and one-line descriptions from Wikidata for places that link to it. */
export async function enrichWithWikidata(places: Place[], signal?: AbortSignal): Promise<Place[]> {
  const ids = [...new Set(places.filter((p) => p.wikidata).map((p) => p.wikidata!))];
  const info = new Map<string, { image?: string; description?: string }>();
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: ids.slice(i, i + 50).join('|'),
      props: 'claims|descriptions',
      languages: 'en',
      format: 'json',
      origin: '*',
    });
    try {
      const res = await fetch(`https://www.wikidata.org/w/api.php?${params}`, { signal });
      if (!res.ok) continue;
      const json = await res.json();
      extractWikidata(json.entities ?? {}).forEach((v, k) => info.set(k, v));
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  if (!info.size) return places;
  return places.map((p) => {
    const extra = p.wikidata ? info.get(p.wikidata) : undefined;
    if (!extra) return p;
    return { ...p, image: p.image ?? extra.image, description: p.description ?? extra.description };
  });
}

export interface DestinationSummary {
  title: string;
  extract: string;
  image?: string;
  url?: string;
}

export async function fetchDestinationSummary(name: string, signal?: AbortSignal): Promise<DestinationSummary | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`,
      { signal },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.type === 'disambiguation' || !json.extract) return null;
    return {
      title: json.title,
      extract: json.extract,
      image: json.originalimage?.source ?? json.thumbnail?.source,
      url: json.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
}
