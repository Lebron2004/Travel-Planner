import type { TravelMode } from './routing';
import type { Destination, LatLon, Place } from './types';

const label = (d: Destination) => (d.context ? `${d.name}, ${d.context}` : d.name);

/**
 * Live prices and availability need a paid/partner API key (e.g. Booking.com
 * Affiliate or Amadeus Hotel Search), so for now we hand off to search pages.
 */
export function stayProviders(dest: Destination) {
  const q = encodeURIComponent(label(dest));
  return [
    { name: 'Booking.com', url: `https://www.booking.com/searchresults.html?ss=${q}` },
    { name: 'Airbnb', url: `https://www.airbnb.com/s/${q}/homes` },
    { name: 'Google Hotels', url: `https://www.google.com/travel/search?q=${encodeURIComponent(`hotels in ${label(dest)}`)}` },
  ];
}

export function staySearchUrl(place: Place, dest: Destination): string {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${place.name}, ${dest.name}`)}`;
}

export function osmUrl(place: Place): string {
  return `https://www.openstreetmap.org/${place.id}`;
}

const GOOGLE_MODE: Record<TravelMode, string> = { foot: 'walking', bike: 'bicycling', car: 'driving' };

/** Opens the day's route in Google Maps for turn-by-turn on a phone. */
export function googleDirectionsUrl(stops: LatLon[], mode: TravelMode): string {
  const fmt = (s: LatLon) => `${s.lat.toFixed(6)},${s.lon.toFixed(6)}`;
  const params = new URLSearchParams({
    api: '1',
    origin: fmt(stops[0]),
    destination: fmt(stops[stops.length - 1]),
    travelmode: GOOGLE_MODE[mode],
  });
  if (stops.length > 2) params.set('waypoints', stops.slice(1, -1).map(fmt).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}
