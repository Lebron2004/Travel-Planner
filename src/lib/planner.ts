import { haversineKm } from './geo';
import { orderStops } from './routing';
import type { LatLon, Place } from './types';

/** Splits an ordered list into `days` contiguous, near-equal chunks. */
export function splitIntoDays<T>(items: T[], days: number): T[][] {
  const n = Math.max(1, days);
  const out: T[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => out[Math.floor((i * n) / items.length)].push(item));
  return out;
}

/**
 * Builds a day-by-day plan: the best-known sights mixed with hidden gems,
 * walked in a nearest-neighbour loop from the centre and cut into days,
 * with the closest food spot dropped in mid-day as a lunch stop.
 */
export function autoPlan(places: Place[], days: number, center: LatLon, perDay = 4): string[][] {
  const sights = places.filter((p) => p.category === 'sights');
  const gems = places.filter((p) => p.category === 'gems');
  const food = places.filter((p) => p.category === 'food' && ['Restaurant', 'Café', 'Food hall', 'Bakery'].includes(p.kind));

  const wanted = Math.max(1, days) * perDay;
  const gemCount = Math.min(gems.length, Math.round(wanted / 4));
  // Prefer gems with a photo; they make for better stops.
  const rankedGems = [...gems].sort((a, b) => Number(!!b.image) - Number(!!a.image));
  const pickedSights = sights.slice(0, wanted - gemCount);
  // Few big sights (a small town, a national park)? Top up with more gems.
  const pickedGems = rankedGems.slice(0, wanted - pickedSights.length);
  const tour = orderStops([...pickedSights, ...pickedGems], center);

  const usedFood = new Set<string>();
  return splitIntoDays(tour, days).map((day) => {
    const ids = day.map((p) => p.id);
    if (day.length && food.length) {
      const mid = day[Math.floor((day.length - 1) / 2)];
      const lunch = food
        .filter((f) => !usedFood.has(f.id))
        .reduce<Place | undefined>(
          (best, f) => (!best || haversineKm(mid, f) < haversineKm(mid, best) ? f : best),
          undefined,
        );
      if (lunch) {
        usedFood.add(lunch.id);
        ids.splice(day.indexOf(mid) + 1, 0, lunch.id);
      }
    }
    return ids;
  });
}
