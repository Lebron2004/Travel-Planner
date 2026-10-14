import { describe, expect, it } from 'vitest';
import { buildOverpassQuery, rankPlaces } from '../overpass';
import { CENTER, samplePlaces } from './fixtures';

describe('buildOverpassQuery', () => {
  it('asks for every tab with its own cap and a tighter food radius', () => {
    const q = buildOverpassQuery(CENTER, 6000);
    for (const set of ['.sights out', '.food out', '.gems out', '.stays out']) expect(q).toContain(set);
    expect(q).toContain(`(around:6000,${CENTER.lat},${CENTER.lon})`);
    expect(q).toContain(`(around:3000,${CENTER.lat},${CENTER.lon})`);
  });
});

describe('parseOverpass', () => {
  const places = samplePlaces();
  const byName = (n: string) => places.find((p) => p.name === n)!;

  it('drops unnamed, unknown and duplicate elements', () => {
    expect(places).toHaveLength(9);
    expect(places.filter((p) => p.id === 'way/1')).toHaveLength(1);
  });

  it('sorts each feature into the right tab', () => {
    expect(byName('Castelo de São Jorge').category).toBe('sights');
    expect(byName('Café A Brasileira').category).toBe('food');
    expect(byName('Miradouro de Santa Luzia').category).toBe('gems');
    expect(byName('Bordalo II Raccoon').kind).toBe('Street art');
    expect(byName('Lisbon Destination Hostel').category).toBe('stays');
  });

  it('reads diets, budget, access and price', () => {
    expect(byName('Ao 26 Vegan Food Project').diets).toEqual(['vegetarian', 'vegan']);
    expect(byName('Ao 26 Vegan Food Project').cuisine).toEqual(['vegan', 'portuguese']);
    expect(byName('Lisbon Destination Hostel').budget).toBe(1);
    expect(byName('Tivoli Avenida').budget).toBe(3);
    expect(byName('Café A Brasileira').wheelchair).toBe('yes');
    expect(byName('Miradouro de Santa Luzia').free).toBe(true);
    expect(byName('Museu de Marinha').free).toBe(false);
    expect(byName('Castelo de São Jorge').wikidata).toBe('Q1048455');
  });

  it('ranks sights with Wikidata before closer unknown ones', () => {
    const sights = rankPlaces(places).filter((p) => p.category === 'sights');
    expect(sights[0].name).toBe('Castelo de São Jorge');
  });
});
