import type { Budget, Category, Diet } from './types';

export interface Classification {
  category: Category;
  kind: string;
  icon: string;
}

type KindTable = Record<string, [string, string]>;

const STAYS: KindTable = {
  hotel: ['Hotel', '🏨'],
  hostel: ['Hostel', '🛏️'],
  guest_house: ['Guest house', '🏡'],
  motel: ['Motel', '🛣️'],
  apartment: ['Apartment', '🏢'],
  camp_site: ['Campsite', '⛺'],
  chalet: ['Chalet', '🛖'],
  alpine_hut: ['Mountain hut', '🏔️'],
};

const FOOD_AMENITY: KindTable = {
  restaurant: ['Restaurant', '🍽️'],
  cafe: ['Café', '☕'],
  fast_food: ['Quick bite', '🌯'],
  ice_cream: ['Ice cream', '🍦'],
  food_court: ['Food hall', '🥢'],
  pub: ['Pub', '🍺'],
  bar: ['Bar', '🍸'],
  biergarten: ['Beer garden', '🍻'],
};

const FOOD_SHOP: KindTable = {
  bakery: ['Bakery', '🥐'],
  pastry: ['Pastry shop', '🧁'],
  deli: ['Deli', '🥪'],
};

const GEMS: Record<string, KindTable> = {
  tourism: { artwork: ['Public art', '🎨'], viewpoint: ['Viewpoint', '🌅'] },
  historic: {
    ruins: ['Ruins', '🏚️'],
    archaeological_site: ['Archaeological site', '🏺'],
    wreck: ['Shipwreck', '⚓'],
    ship: ['Historic ship', '⛵'],
    aqueduct: ['Aqueduct', '🌉'],
    mine: ['Old mine', '⛏️'],
  },
  natural: {
    waterfall: ['Waterfall', '💧'],
    cave_entrance: ['Cave', '🕳️'],
    hot_spring: ['Hot spring', '♨️'],
    spring: ['Spring', '💦'],
    beach: ['Beach', '🏖️'],
  },
  leisure: { garden: ['Garden', '🌿'] },
  amenity: { marketplace: ['Market', '🧺'] },
  shop: {
    books: ['Bookshop', '📚'],
    antiques: ['Antiques', '🏺'],
    second_hand: ['Vintage shop', '🧥'],
  },
};

const SIGHTS: Record<string, KindTable> = {
  tourism: {
    museum: ['Museum', '🏛️'],
    gallery: ['Gallery', '🖼️'],
    attraction: ['Attraction', '⭐'],
    zoo: ['Zoo', '🦒'],
    aquarium: ['Aquarium', '🐠'],
    theme_park: ['Theme park', '🎢'],
  },
  historic: {
    castle: ['Castle', '🏰'],
    palace: ['Palace', '👑'],
    fort: ['Fort', '🏯'],
    monument: ['Monument', '🗿'],
    city_gate: ['City gate', '⛩️'],
  },
  amenity: { place_of_worship: ['Landmark', '⛪'] },
  leisure: { park: ['Park', '🌳'] },
};

function lookup(tables: Record<string, KindTable>, tags: Record<string, string>) {
  for (const [key, table] of Object.entries(tables)) {
    const hit = table[tags[key]];
    if (hit) return hit;
  }
  return undefined;
}

/** Decides which tab an OSM feature belongs to. Returns null for anything we don't show. */
export function classify(tags: Record<string, string>): Classification | null {
  const stay = STAYS[tags.tourism];
  if (stay) return { category: 'stays', kind: stay[0], icon: stay[1] };

  const food = FOOD_AMENITY[tags.amenity] ?? FOOD_SHOP[tags.shop];
  if (food) return { category: 'food', kind: food[0], icon: food[1] };

  const gem = lookup(GEMS, tags);
  if (gem) {
    if (tags.tourism === 'artwork' && /mural|graffiti/.test(tags.artwork_type ?? '')) {
      return { category: 'gems', kind: 'Street art', icon: '🎨' };
    }
    return { category: 'gems', kind: gem[0], icon: gem[1] };
  }

  const sight = lookup(SIGHTS, tags);
  if (sight) return { category: 'sights', kind: sight[0], icon: sight[1] };

  return null;
}

/**
 * OSM rarely has prices, so the budget level is a heuristic from the kind of
 * place (a hostel is cheaper than a 5-star hotel). Undefined means unknown.
 */
export function estimateBudget(category: Category, tags: Record<string, string>): Budget | undefined {
  if (category === 'stays') {
    switch (tags.tourism) {
      case 'hostel':
      case 'camp_site':
      case 'alpine_hut':
        return 1;
      case 'hotel': {
        const stars = parseFloat(tags.stars ?? '');
        if (stars >= 4) return 3;
        if (stars > 0 && stars < 2) return 1;
        return 2;
      }
      default:
        return 2;
    }
  }
  if (category === 'food') {
    if (['fast_food', 'ice_cream', 'food_court', 'cafe'].includes(tags.amenity)) return 1;
    if (tags.shop) return 1;
    if (tags.amenity === 'restaurant' && /fine|gourmet/i.test(tags.cuisine ?? '')) return 3;
    return 2;
  }
  if (tags.fee === 'no') return 1;
  return undefined;
}

const ALWAYS_FREE = new Set([
  'Viewpoint', 'Public art', 'Street art', 'Garden', 'Park', 'Waterfall', 'Spring',
  'Beach', 'Market', 'Monument', 'City gate', 'Bookshop', 'Antiques', 'Vintage shop',
]);

export function isFree(kind: string, tags: Record<string, string>): boolean {
  if (tags.fee === 'no') return true;
  if (tags.fee) return false;
  return ALWAYS_FREE.has(kind);
}

export const DIETS: { id: Diet; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'gluten_free', label: 'Gluten-free' },
];

export function dietsFromTags(tags: Record<string, string>): Diet[] {
  const cuisine = (tags.cuisine ?? '').toLowerCase();
  const has = (d: Diet) =>
    ['yes', 'only'].includes(tags[`diet:${d}`]) || cuisine.split(';').includes(d);
  const diets = DIETS.map((d) => d.id).filter(has);
  // Anything that's vegan is also fine for vegetarians.
  if (diets.includes('vegan') && !diets.includes('vegetarian')) diets.unshift('vegetarian');
  return diets;
}

export const CATEGORY_META: Record<Category, { label: string; color: string; icon: string }> = {
  sights: { label: 'Sights', color: '#c8553d', icon: '⭐' },
  food: { label: 'Food', color: '#d4a017', icon: '🍽️' },
  gems: { label: 'Hidden gems', color: '#5b7f5e', icon: '💎' },
  stays: { label: 'Stays', color: '#3d6c8c', icon: '🛏️' },
};
