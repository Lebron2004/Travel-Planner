export type Category = 'sights' | 'food' | 'gems' | 'stays';

export type Diet = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free';

/** 1 = $, 2 = $$, 3 = $$$ */
export type Budget = 1 | 2 | 3;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Place extends LatLon {
  /** OSM id such as "node/123" */
  id: string;
  name: string;
  category: Category;
  /** Human label such as "Museum" or "Street art" */
  kind: string;
  icon: string;
  tags: Record<string, string>;
  budget?: Budget;
  diets: Diet[];
  wheelchair?: 'yes' | 'limited' | 'no';
  free: boolean;
  cuisine: string[];
  wikidata?: string;
  image?: string;
  description?: string;
  website?: string;
  distanceKm: number;
}

export interface Destination extends LatLon {
  name: string;
  /** Secondary line, e.g. "Portugal" */
  context: string;
  /** Search radius in metres */
  radius: number;
}

export interface Filters {
  query: string;
  diets: Diet[];
  maxBudget: Budget | null;
  accessible: boolean;
  freeOnly: boolean;
}
