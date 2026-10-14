import { parseOverpass } from '../overpass';

export const CENTER = { lat: 38.7077, lon: -9.1365 };

/** A trimmed Overpass response for central Lisbon. */
export const OVERPASS_SAMPLE = {
  elements: [
    { type: 'way', id: 1, center: { lat: 38.7139, lon: -9.1334 }, tags: { historic: 'castle', name: 'Castelo de São Jorge', wikidata: 'Q1048455', wheelchair: 'limited' } },
    { type: 'node', id: 2, lat: 38.6916, lon: -9.216, tags: { tourism: 'museum', name: 'Museu de Marinha', fee: 'yes' } },
    { type: 'node', id: 3, lat: 38.7105, lon: -9.1397, tags: { amenity: 'restaurant', name: 'Ao 26 Vegan Food Project', cuisine: 'vegan;portuguese', 'diet:vegan': 'only' } },
    { type: 'node', id: 4, lat: 38.7101, lon: -9.1372, tags: { amenity: 'cafe', name: 'Café A Brasileira', wheelchair: 'yes' } },
    { type: 'node', id: 5, lat: 38.7095, lon: -9.1345, tags: { amenity: 'restaurant', name: 'Time Out Market', cuisine: 'portuguese', 'diet:halal': 'yes' } },
    { type: 'node', id: 6, lat: 38.7122, lon: -9.1302, tags: { tourism: 'viewpoint', name: 'Miradouro de Santa Luzia' } },
    { type: 'node', id: 7, lat: 38.7066, lon: -9.1443, tags: { tourism: 'artwork', artwork_type: 'mural', name: 'Bordalo II Raccoon' } },
    { type: 'node', id: 8, lat: 38.7108, lon: -9.1387, tags: { tourism: 'hostel', name: 'Lisbon Destination Hostel' } },
    { type: 'node', id: 9, lat: 38.7203, lon: -9.1461, tags: { tourism: 'hotel', name: 'Tivoli Avenida', stars: '5' } },
    { type: 'node', id: 10, lat: 38.709, lon: -9.137, tags: { shop: 'clothes', name: 'Not a place we show' } },
    { type: 'node', id: 11, lat: 38.709, lon: -9.137, tags: { tourism: 'museum' } },
    // duplicate of #1, as Overpass can return an element in two sets
    { type: 'way', id: 1, center: { lat: 38.7139, lon: -9.1334 }, tags: { historic: 'castle', name: 'Castelo de São Jorge' } },
  ],
};

export const samplePlaces = () => parseOverpass(OVERPASS_SAMPLE as never, CENTER);
