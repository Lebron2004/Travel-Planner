import { describe, expect, it } from 'vitest';
import { photonToDestination } from '../geocode';
import { commonsThumb, extractWikidata } from '../photos';

describe('photonToDestination', () => {
  it('builds a destination with context and radius from the extent', () => {
    const d = photonToDestination({
      geometry: { coordinates: [-9.1365, 38.7077] },
      properties: { name: 'Lisbon', state: 'Lisbon', country: 'Portugal', extent: [-9.23, 38.8, -9.09, 38.69] },
    });
    expect(d).toMatchObject({ name: 'Lisbon', context: 'Portugal', lat: 38.7077, lon: -9.1365 });
    expect(d!.radius).toBeGreaterThan(5000);
    expect(d!.radius).toBeLessThanOrEqual(8000);
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
