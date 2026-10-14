import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, activeFilterCount, applyFilters, topCuisines } from '../filters';
import { samplePlaces } from './fixtures';

const places = samplePlaces();
const food = places.filter((p) => p.category === 'food');
const names = (ps: { name: string }[]) => ps.map((p) => p.name).sort();

describe('applyFilters', () => {
  it('matches cuisine words in the search box', () => {
    expect(names(applyFilters(food, { ...EMPTY_FILTERS, query: 'vegan' }))).toEqual(['Ao 26 Vegan Food Project']);
  });

  it('requires every chosen diet, for food only', () => {
    expect(names(applyFilters(food, { ...EMPTY_FILTERS, diets: ['halal'] }))).toEqual(['Time Out Market']);
    expect(applyFilters(food, { ...EMPTY_FILTERS, diets: ['halal', 'vegan'] })).toHaveLength(0);
    const sights = places.filter((p) => p.category === 'sights');
    expect(applyFilters(sights, { ...EMPTY_FILTERS, diets: ['vegan'] })).toHaveLength(sights.length);
  });

  it('applies budget, keeping places with unknown prices', () => {
    const stays = places.filter((p) => p.category === 'stays');
    expect(names(applyFilters(stays, { ...EMPTY_FILTERS, maxBudget: 1 }))).toEqual(['Lisbon Destination Hostel']);
    const sights = places.filter((p) => p.category === 'sights');
    expect(applyFilters(sights, { ...EMPTY_FILTERS, maxBudget: 1 })).toHaveLength(sights.length);
  });

  it('filters for accessible and free places', () => {
    expect(names(applyFilters(places, { ...EMPTY_FILTERS, accessible: true }))).toEqual(['Café A Brasileira', 'Castelo de São Jorge']);
    const gemsAndSights = places.filter((p) => p.category === 'gems' || p.category === 'sights');
    expect(names(applyFilters(gemsAndSights, { ...EMPTY_FILTERS, freeOnly: true }))).toEqual([
      'Bordalo II Raccoon',
      'Miradouro de Santa Luzia',
    ]);
  });

  it('counts active restrictions and finds common cuisines', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, diets: ['vegan'], accessible: true })).toBe(2);
    expect(topCuisines(food)).toEqual(['portuguese']);
  });
});
