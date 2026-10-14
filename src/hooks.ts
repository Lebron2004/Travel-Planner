import { useEffect, useState } from 'react';
import { fetchPlaces } from './lib/overpass';
import { enrichWithWikidata, fetchDestinationSummary, type DestinationSummary } from './lib/photos';
import { fetchRoute, type Route, type TravelMode } from './lib/routing';
import type { Destination, Place } from './lib/types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function usePlaces(dest: Destination | null) {
  const [state, setState] = useState<{ status: LoadStatus; places: Place[]; error?: string }>({
    status: 'idle',
    places: [],
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!dest) return;
    const ctrl = new AbortController();
    setState({ status: 'loading', places: [] });
    fetchPlaces(dest, dest.radius, ctrl.signal)
      .then((places) => {
        setState({ status: 'ready', places });
        // Photos arrive a moment later; the list is usable straight away.
        return enrichWithWikidata(places, ctrl.signal).then((enriched) =>
          setState((s) => ({ ...s, places: enriched })),
        );
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', places: [], error: err instanceof Error ? err.message : String(err) });
      });
    return () => ctrl.abort();
  }, [dest?.lat, dest?.lon, dest?.radius, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

export function useDestinationSummary(name: string | undefined) {
  const [summary, setSummary] = useState<DestinationSummary | null>(null);
  useEffect(() => {
    setSummary(null);
    if (!name) return;
    const ctrl = new AbortController();
    fetchDestinationSummary(name, ctrl.signal).then((s) => !ctrl.signal.aborted && setSummary(s));
    return () => ctrl.abort();
  }, [name]);
  return summary;
}

export function useRoutes(days: Place[][], mode: TravelMode): (Route | null)[] {
  const [routes, setRoutes] = useState<(Route | null)[]>([]);
  const key = JSON.stringify(days.map((d) => d.map((p) => p.id))) + mode;
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      Promise.all(days.map((d) => fetchRoute(d, mode, ctrl.signal)))
        .then((r) => !ctrl.signal.aborted && setRoutes(r))
        .catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key]);
  return routes;
}
