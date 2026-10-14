import { afterEach, describe, expect, it, vi } from 'vitest';
import { photonToDestination, searchDestinations } from '../geocode';

const feature = (properties: Record<string, unknown>, coordinates: [number, number] = [0, 0]) => ({
  geometry: { coordinates },
  properties,
});
import { commonsThumb, extractWikidata } from '../photos';

describe('photonToDestination', () => {
  it('builds a destination with context and radius from the extent', () => {
    const d = photonToDestination({
      geometry: { coordinates: [-9.1365, 38.7077] },
      properties: { name: 'Lisbon', state: 'Lisbon', country: 'Portugal', countrycode: 'PT', extent: [-9.23, 38.8, -9.09, 38.69] },
    });
    expect(d).toMatchObject({ name: 'Lisbon', context: 'Portugal', lat: 38.7077, lon: -9.1365 });
    expect(d!.radius).toBeGreaterThan(5000);
    expect(d!.radius).toBeLessThanOrEqual(8000);
  });
});

describe('destination labels', () => {
  it('reads like "New York, NY, USA" for US places', () => {
    const ny = photonToDestination(feature({ name: 'New York', state: 'New York', country: 'United States', countrycode: 'US', osm_key: 'place', osm_value: 'city' }));
    expect(ny?.context).toBe('NY, USA');
    const brooklyn = photonToDestination(feature({ name: 'Brooklyn', city: 'New York', state: 'New York', country: 'United States', countrycode: 'US', osm_key: 'place', osm_value: 'suburb' }));
    expect(brooklyn?.context).toBe('New York, NY, USA');
    const state = photonToDestination(feature({ name: 'New Jersey', state: 'New Jersey', country: 'United States', countrycode: 'US', osm_key: 'place', osm_value: 'state' }));
    expect(state?.context).toBe('USA');
  });

  it('keeps countries and skips hamlets', () => {
    expect(photonToDestination(feature({ name: 'New Zealand', country: 'New Zealand', countrycode: 'NZ', osm_key: 'place', osm_value: 'country' }))?.context).toBe('');
    expect(photonToDestination(feature({ name: 'Newtown Farm', osm_key: 'place', osm_value: 'isolated_dwelling' }))).toBeNull();
  });
});

describe('searchDestinations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks Photon for places only and returns at most six', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      new Response(JSON.stringify({ features: Array.from({ length: 9 }, (_, i) => feature({ name: `New ${i}`, countrycode: 'US', osm_key: 'place', osm_value: 'city' })) })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const results = await searchDestinations('new');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('new');
    expect(url.searchParams.get('osm_tag')).toBe('place');
    expect(results).toHaveLength(6);
  });

  it('does not search for a single letter', async () => {
    expect(await searchDestinations('n')).toEqual([]);
  });
});

describe('photos', () => {
  it('builds Commons thumbnail URLs', () => {
    expect(commonsThumb('File:Castelo de São Jorge.jpg', 320)).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Castelo_de_S%C3%A3o_Jorge.jpg?width=320',
    );
  });

  it('pulls the image and description out of Wikidata entities', () => {
    const info = extractWikidata({
      Q1: { claims: { P18: [{ mainsnak: { datavalue: { value: 'A.jpg' } } }] }, descriptions: { en: { value: 'castle' } } },
      Q2: {},
    });
    expect(info.get('Q1')).toEqual({ image: commonsThumb('A.jpg'), description: 'castle' });
    expect(info.get('Q2')).toEqual({ image: undefined, description: undefined });
  });
});
