# Wayfinder · Trip Planner

Type in where you're going and get:

- **Sights**: museums, castles, landmarks, with photos
- **Food**: restaurants, cafés, bakeries, searchable by cuisine ("ramen", "tacos")
- **Hidden gems**: street art, viewpoints, ruins, gardens, markets, indie bookshops
- **Stays**: hotels, hostels, guest houses, campsites, with links out to check prices
- **Restrictions**: vegetarian / vegan / halal / kosher / gluten-free, budget ($–$$$), wheelchair access, free-only
- **My trip**: add places or hit *Build my trip* for a day-by-day plan; each day is drawn as a walking, cycling or driving route on the map and can be opened in Google Maps for turn-by-turn

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # static site in dist/
```

The build is a plain static site. Every push to `main` deploys it to GitHub Pages at
https://lebron2004.github.io/Travel-Planner/ (one-time setup: repo **Settings → Pages → Source: GitHub Actions**).

## Where the data comes from

Everything is free and needs no API keys:

| What | Source |
| --- | --- |
| Destination search | [Photon](https://photon.komoot.io) (OpenStreetMap) |
| Places, food, gems, stays | [Overpass API](https://overpass-api.de) (OpenStreetMap) |
| Photos & descriptions | [Wikidata](https://www.wikidata.org) / Wikimedia Commons |
| City intro | Wikipedia REST API |
| Routes | [FOSSGIS OSRM](https://routing.openstreetmap.de) (walk / bike / car) |
| Map tiles | CARTO Voyager on OpenStreetMap data |

Prices are estimated from the kind of place (a hostel is `$`, a 4–5★ hotel is `$$$`) because OpenStreetMap doesn't carry prices.
Live hotel prices and availability would need a partner key (for example Booking.com Affiliate or Amadeus Hotel Search); until then
the Stays tab links out to Booking.com, Airbnb and Google Hotels.

These public servers are shared and rate-limited, so if the site gets real traffic it's worth self-hosting Overpass/OSRM or moving
to a paid provider.
