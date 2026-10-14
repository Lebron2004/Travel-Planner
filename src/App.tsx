import { useEffect, useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { MapView } from './components/MapView';
import { PlaceCard, cardDomId } from './components/PlaceCard';
import { SearchBox } from './components/SearchBox';
import { ThemeToggle } from './components/ThemeToggle';
import { TripPanel } from './components/TripPanel';
import { useDestinationSummary, usePlaces, useRoutes } from './hooks';
import { CATEGORY_META } from './lib/categories';
import { EMPTY_FILTERS, applyFilters, topCuisines } from './lib/filters';
import { stayProviders } from './lib/links';
import { autoPlan } from './lib/planner';
import type { TravelMode } from './lib/routing';
import type { Category, Destination, Filters, LatLon, Place } from './lib/types';

type Tab = Category | 'trip';
const TABS: Tab[] = ['sights', 'food', 'gems', 'stays', 'trip'];

const SUGGESTIONS: Destination[] = [
  { name: 'Lisbon', context: 'Portugal', lat: 38.7077, lon: -9.1365, radius: 4000 },
  { name: 'Kyoto', context: 'Japan', lat: 35.0116, lon: 135.7681, radius: 5000 },
  { name: 'Mexico City', context: 'Mexico', lat: 19.4326, lon: -99.1332, radius: 5000 },
  { name: 'Reykjavík', context: 'Iceland', lat: 64.1466, lon: -21.9426, radius: 4000 },
  { name: 'New Orleans', context: 'Louisiana, United States', lat: 29.9511, lon: -90.0715, radius: 4000 },
];

function destinationFromUrl(): Destination | null {
  const p = new URLSearchParams(window.location.search);
  const lat = parseFloat(p.get('lat') ?? '');
  const lon = parseFloat(p.get('lon') ?? '');
  const name = p.get('to');
  if (!name || Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { name, context: p.get('in') ?? '', lat, lon, radius: parseInt(p.get('r') ?? '', 10) || 5000 };
}

export default function App() {
  const [dest, setDest] = useState<Destination | null>(destinationFromUrl);
  const [tab, setTab] = useState<Tab>('sights');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tripDays, setTripDays] = useState<Place[][]>([[]]);
  const [activeDay, setActiveDay] = useState(0);
  const [mode, setMode] = useState<TravelMode>('foot');
  const [movedArea, setMovedArea] = useState<{ center: LatLon; radius: number } | null>(null);

  const { status, places, error, retry } = usePlaces(dest);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (status !== 'loading') return;
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [status, dest]);
  const summary = useDestinationSummary(dest?.name);
  const routes = useRoutes(tripDays, mode);

  useEffect(() => {
    const params = dest
      ? '?' +
        new URLSearchParams({
          to: dest.name,
          in: dest.context,
          lat: dest.lat.toFixed(5),
          lon: dest.lon.toFixed(5),
          r: String(dest.radius),
        })
      : window.location.pathname;
    window.history.replaceState(null, '', params);
    document.title = dest ? `${dest.name} · Wayfinder` : 'Wayfinder · Trip Planner';
  }, [dest]);

  const goTo = (d: Destination) => {
    setDest(d);
    setTab('sights');
    setFilters(EMPTY_FILTERS);
    setSelectedId(null);
    setTripDays([[]]);
    setActiveDay(0);
    setMovedArea(null);
  };

  const byCategory = useMemo(() => {
    const out: Record<Category, Place[]> = { sights: [], food: [], gems: [], stays: [] };
    for (const p of places) out[p.category].push(p);
    return out;
  }, [places]);

  const visible = tab === 'trip' ? [] : applyFilters(byCategory[tab], filters);
  const cuisines = useMemo(() => topCuisines(byCategory.food), [byCategory.food]);
  const tripIds = useMemo(() => new Set(tripDays.flat().map((p) => p.id)), [tripDays]);

  const toggleTrip = (p: Place) => {
    if (tripIds.has(p.id)) {
      setTripDays((days) => days.map((d) => d.filter((s) => s.id !== p.id)));
    } else {
      setTripDays((days) => days.map((d, i) => (i === Math.min(activeDay, days.length - 1) ? [...d, p] : d)));
    }
  };

  const select = (id: string) => {
    setSelectedId(id);
    document.getElementById(cardDomId(id))?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (!dest) {
    return (
      <main className="landing">
        <ThemeToggle />
        <div className="landing-inner">
          <p className="eyebrow">🧭 Wayfinder</p>
          <h1>
            Where to <em>next?</em>
          </h1>
          <p className="lede">
            Start typing a city or town. We'll show you what to see, where to eat, the hidden spots most people miss, places to stay, and a
            route to follow on the map.
          </p>
          <SearchBox onSelect={goTo} autoFocus />
          <div className="suggestions">
            <span>Try</span>
            {SUGGESTIONS.map((s) => (
              <button key={s.name} className="chip" onClick={() => goTo(s)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="logo" onClick={() => setDest(null)}>
          🧭 <span>Wayfinder</span>
        </button>
        <SearchBox onSelect={goTo} size="small" placeholder="Go somewhere else…" />
        <ThemeToggle />
      </header>

      <div className="layout">
        <aside className="panel">
          <section className="dest-hero" style={summary?.image ? { backgroundImage: `url("${summary.image}")` } : undefined}>
            <div className="dest-hero-text">
              <h1>{dest.name}</h1>
              {dest.context && <p className="dest-context">{dest.context}</p>}
            </div>
          </section>
          {summary && (
            <p className="dest-summary">
              {summary.extract.length > 260 ? `${summary.extract.slice(0, 260).replace(/\s\S*$/, '')}…` : summary.extract}{' '}
              {summary.url && (
                <a href={summary.url} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>
              )}
            </p>
          )}

          <nav className="tabs" role="tablist">
            {TABS.map((t) => {
              const count = t === 'trip' ? tripIds.size : byCategory[t].length;
              return (
                <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                  {t === 'trip' ? '🗺️ My trip' : `${CATEGORY_META[t].icon} ${CATEGORY_META[t].label}`}
                  {status === 'ready' && count > 0 && <span className="count">{count}</span>}
                </button>
              );
            })}
          </nav>

          {tab === 'trip' ? (
            <TripPanel
              days={tripDays}
              routes={routes}
              activeDay={activeDay}
              mode={mode}
              canAutoPlan={status === 'ready' && byCategory.sights.length + byCategory.gems.length > 0}
              onDaysChange={setTripDays}
              onActiveDayChange={setActiveDay}
              onModeChange={setMode}
              onAutoPlan={(n) => {
                const byId = new Map(places.map((p) => [p.id, p]));
                setTripDays(autoPlan(places, n, dest).map((ids) => ids.map((id) => byId.get(id)!)));
                setActiveDay(0);
              }}
              onSelect={select}
            />
          ) : (
            <>
              <FilterBar category={tab} filters={filters} cuisines={cuisines} onChange={setFilters} />
              {tab === 'stays' && (
                <div className="providers">
                  <span>Prices &amp; availability:</span>
                  {stayProviders(dest).map((p) => (
                    <a key={p.name} href={p.url} target="_blank" rel="noreferrer">
                      {p.name} ↗
                    </a>
                  ))}
                </div>
              )}
              {tab === 'gems' && status === 'ready' && (
                <p className="hint">Street art, viewpoints, ruins, gardens, markets and indie shops nearby that don't make the usual top-10 lists.</p>
              )}

              {status === 'loading' && (
                <div className="cards">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="card skeleton" />
                  ))}
                </div>
              )}
              {status === 'error' && (
                <div className="empty">
                  <p>We couldn't load places right now ({error}). The free map servers get busy sometimes.</p>
                  <button className="btn btn-primary" onClick={retry}>
                    Try again
                  </button>
                </div>
              )}
              {status === 'ready' && visible.length === 0 && (
                <p className="empty">
                  {byCategory[tab].length ? 'Nothing matches those filters. Try loosening them.' : 'Nothing found here. Try moving the map and searching that area.'}
                </p>
              )}
              <div className="cards">
                {visible.slice(0, 120).map((p) => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    dest={dest}
                    selected={p.id === selectedId}
                    inTrip={tripIds.has(p.id)}
                    onSelect={() => setSelectedId(p.id)}
                    onToggleTrip={() => toggleTrip(p)}
                  />
                ))}
              </div>
            </>
          )}
        </aside>

        <section className="map-wrap">
          <MapView
            dest={dest}
            places={visible}
            tripDays={tripDays}
            routes={routes}
            selectedId={selectedId}
            onSelect={select}
            onToggleTrip={toggleTrip}
            onMoved={setMovedArea}
          />
          {movedArea && (
            <button
              className="btn btn-primary search-area"
              onClick={() => {
                setDest({ ...dest, lat: movedArea.center.lat, lon: movedArea.center.lon, radius: movedArea.radius });
                setMovedArea(null);
              }}
            >
              Search this area
            </button>
          )}
          {status === 'loading' && (
            <div className="map-loading">{slow ? 'Still looking… the free map servers are busy' : 'Finding places…'}</div>
          )}
        </section>
      </div>
    </div>
  );
}
