import type { Filters, Place } from './types';

export const EMPTY_FILTERS: Filters = {
  query: '',
  diets: [],
  maxBudget: null,
  accessible: false,
  freeOnly: false,
};

export function matchesFilters(place: Place, f: Filters): boolean {
  const q = f.query.trim().toLowerCase();
  if (q) {
    const haystack = [place.name, place.kind, ...place.cuisine, place.description ?? ''].join(' ').toLowerCase();
    if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  // Diet filters only make sense for food; elsewhere they're ignored.
  if (place.category === 'food' && f.diets.length && !f.diets.every((d) => place.diets.includes(d))) {
    return false;
  }
  // Unknown prices are kept so a budget filter doesn't empty the list.
  if (f.maxBudget && place.budget && place.budget > f.maxBudget) return false;
  if (f.accessible && place.wheelchair !== 'yes' && place.wheelchair !== 'limited') return false;
  if (f.freeOnly && (place.category === 'sights' || place.category === 'gems') && !place.free) return false;
  return true;
}

export function applyFilters(places: Place[], f: Filters): Place[] {
  return places.filter((p) => matchesFilters(p, f));
}

export function activeFilterCount(f: Filters): number {
  return f.diets.length + Number(!!f.maxBudget) + Number(f.accessible) + Number(f.freeOnly);
}

/** Most common cuisines in a list, for quick "ramen / tacos / pizza" chips. */
export function topCuisines(places: Place[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const p of places) for (const c of p.cuisine) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c);
}
