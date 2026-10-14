import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDistance, formatDuration, haversineKm, radiusFromExtent } from '../geo';
import { googleDirectionsUrl } from '../links';
import { autoPlan, splitIntoDays } from '../planner';
import { fetchRoute, orderStops, straightLineRoute } from '../routing';
import { CENTER, samplePlaces } from './fixtures';

const line = [0, 3, 1, 2].map((x) => ({ id: String(x), lat: 0, lon: x * 0.01 }));

describe('geo helpers', () => {
  it('measures and formats distances', () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.2, 0);
    expect(formatDistance(0.42)).toBe('420 m');
    expect(formatDistance(3.25)).toBe('3.3 km');
    expect(formatDuration(5400)).toBe('1 h 30 min');
    expect(radiusFromExtent()).toBe(5000);
    expect(radiusFromExtent([38.6, 38.8, -9.25, -9.05])).toBe(8000);
  });
});

describe('orderStops', () => {
  it('walks to the nearest unvisited stop each time', () => {
    expect(orderStops(line).map((s) => s.id)).toEqual(['0', '1', '2', '3']);
    expect(orderStops(line, { lat: 0, lon: 0.05 }).map((s) => s.id)).toEqual(['3', '2', '1', '0']);
  });
});

describe('fetchRoute', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the street route when the server answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      routes: [{ distance: 2500, duration: 1800, geometry: { coordinates: [[0, 0], [0.01, 0.02]] } }],
    }))));
    const r = await fetchRoute(line.slice(0, 2), 'foot');
    expect(r).toEqual({ path: [[0, 0], [0.02, 0.01]], distanceKm: 2.5, durationS: 1800, approximate: false });
  });

  it('falls back to straight lines when routing is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const r = await fetchRoute(line.slice(0, 2), 'car');
    expect(r?.approximate).toBe(true);
    expect(r).toEqual(straightLineRoute(line.slice(0, 2), 'car'));
  });

  it('needs two stops', async () => {
    expect(await fetchRoute(line.slice(0, 1), 'foot')).toBeNull();
  });
});

describe('planner', () => {
  it('splits into near-equal contiguous days', () => {
    expect(splitIntoDays([1, 2, 3, 4, 5], 2)).toEqual([[1, 2, 3], [4, 5]]);
    expect(splitIntoDays([1], 3)).toEqual([[1], [], []]);
  });

  it('mixes sights and gems and adds a lunch stop each day', () => {
    const places = samplePlaces();
    const plan = autoPlan(places, 2, CENTER, 2);
    const byId = new Map(places.map((p) => [p.id, p]));
    expect(plan).toHaveLength(2);
    const all = plan.flat().map((id) => byId.get(id)!);
    expect(all.some((p) => p.category === 'sights')).toBe(true);
    expect(all.some((p) => p.category === 'gems')).toBe(true);
    for (const day of plan) {
      expect(day.filter((id) => byId.get(id)!.category === 'food')).toHaveLength(1);
    }
    expect(new Set(plan.flat()).size).toBe(plan.flat().length);
  });
});

describe('googleDirectionsUrl', () => {
  it('puts middle stops in as waypoints', () => {
    const url = new URL(googleDirectionsUrl(line.slice(0, 3), 'foot'));
    expect(url.searchParams.get('travelmode')).toBe('walking');
    expect(url.searchParams.get('waypoints')).toBe('0.000000,0.030000');
  });
});
