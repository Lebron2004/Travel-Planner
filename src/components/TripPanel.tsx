import { useState } from 'react';
import { formatDistance, formatDuration } from '../lib/geo';
import { googleDirectionsUrl } from '../lib/links';
import { MODES, orderStops, type Route, type TravelMode } from '../lib/routing';
import type { Place } from '../lib/types';
import { dayColor } from './MapView';

interface Props {
  days: Place[][];
  routes: (Route | null)[];
  activeDay: number;
  mode: TravelMode;
  canAutoPlan: boolean;
  onDaysChange: (days: Place[][]) => void;
  onActiveDayChange: (i: number) => void;
  onModeChange: (m: TravelMode) => void;
  onAutoPlan: (days: number) => void;
  onSelect: (id: string) => void;
}

export function TripPanel({
  days,
  routes,
  activeDay,
  mode,
  canAutoPlan,
  onDaysChange,
  onActiveDayChange,
  onModeChange,
  onAutoPlan,
  onSelect,
}: Props) {
  const [planDays, setPlanDays] = useState(Math.max(2, days.length));
  const total = days.flat().length;

  const updateDay = (i: number, stops: Place[]) => onDaysChange(days.map((d, j) => (j === i ? stops : d)));
  const move = (i: number, from: number, to: number) => {
    const stops = [...days[i]];
    const [p] = stops.splice(from, 1);
    stops.splice(to, 0, p);
    updateDay(i, stops);
  };
  const moveToDay = (i: number, idx: number, target: number) => {
    const p = days[i][idx];
    onDaysChange(days.map((d, j) => (j === i ? d.filter((_, k) => k !== idx) : j === target ? [...d, p] : d)));
  };
  const removeDay = (i: number) => {
    const next = days.filter((_, j) => j !== i);
    onDaysChange(next.length ? next : [[]]);
    onActiveDayChange(Math.max(0, Math.min(activeDay, next.length - 1)));
  };

  return (
    <div className="trip">
      <section className="planner-box">
        <div>
          <h3>Plan it for me</h3>
          <p>We'll pick the top sights and a few hidden gems, group them by day so you're not zig-zagging, and add a lunch stop.</p>
        </div>
        <div className="planner-controls">
          <div className="stepper" aria-label="Number of days">
            <button onClick={() => setPlanDays((d) => Math.max(1, d - 1))} aria-label="Fewer days">
              −
            </button>
            <span>
              {planDays} day{planDays > 1 ? 's' : ''}
            </span>
            <button onClick={() => setPlanDays((d) => Math.min(7, d + 1))} aria-label="More days">
              +
            </button>
          </div>
          <button className="btn btn-primary" disabled={!canAutoPlan} onClick={() => onAutoPlan(planDays)}>
            ✨ Build my trip
          </button>
        </div>
      </section>

      <div className="trip-toolbar">
        <div className="segmented" role="group" aria-label="Travel mode">
          {MODES.map((m) => (
            <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => onModeChange(m.id)}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        {total > 0 && (
          <button className="btn btn-small btn-ghost" onClick={() => onDaysChange([[]])}>
            Clear trip
          </button>
        )}
      </div>

      {total === 0 && (
        <p className="empty">
          Your trip is empty. Tap <strong>+ Add to trip</strong> on anything you like, or let us build one for you above.
        </p>
      )}

      {days.map((stops, i) => {
        const route = routes[i];
        return (
          <section
            key={i}
            className={`day ${activeDay === i ? 'active' : ''}`}
            style={{ '--c': dayColor(i) } as React.CSSProperties}
            onClick={() => onActiveDayChange(i)}
          >
            <header className="day-head">
              <h3>
                <span className="day-dot" /> Day {i + 1}
              </h3>
              {route && (
                <span className="day-stats" title={route.approximate ? 'Estimated: routing service unavailable' : undefined}>
                  {route.approximate && '≈ '}
                  {formatDistance(route.distanceKm)} · {formatDuration(route.durationS)} {MODES.find((m) => m.id === mode)!.label.toLowerCase()}
                </span>
              )}
            </header>
            {stops.length === 0 ? (
              <p className="day-empty">{activeDay === i ? 'New stops you add go here.' : 'No stops yet.'}</p>
            ) : (
              <ol className="stops">
                {stops.map((p, idx) => (
                  <li key={p.id}>
                    <button className="stop-name" onClick={() => onSelect(p.id)}>
                      <span className="stop-num">{idx + 1}</span>
                      <span>
                        {p.name}
                        <small>{p.kind}</small>
                      </span>
                    </button>
                    <div className="stop-actions">
                      <button disabled={idx === 0} onClick={() => move(i, idx, idx - 1)} aria-label="Move up">
                        ↑
                      </button>
                      <button disabled={idx === stops.length - 1} onClick={() => move(i, idx, idx + 1)} aria-label="Move down">
                        ↓
                      </button>
                      {days.length > 1 && (
                        <select
                          aria-label="Move to day"
                          value={i}
                          onChange={(e) => moveToDay(i, idx, Number(e.target.value))}
                        >
                          {days.map((_, j) => (
                            <option key={j} value={j}>
                              Day {j + 1}
                            </option>
                          ))}
                        </select>
                      )}
                      <button onClick={() => updateDay(i, stops.filter((s) => s.id !== p.id))} aria-label="Remove">
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <footer className="day-foot">
              {stops.length > 2 && (
                <button className="btn btn-small btn-ghost" onClick={() => updateDay(i, orderStops(stops))}>
                  Shortest order
                </button>
              )}
              {stops.length > 1 && (
                <a className="btn btn-small btn-ghost" href={googleDirectionsUrl(stops, mode)} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              )}
              {days.length > 1 && (
                <button className="btn btn-small btn-ghost" onClick={() => removeDay(i)}>
                  Remove day
                </button>
              )}
            </footer>
          </section>
        );
      })}

      <button
        className="btn btn-ghost add-day"
        onClick={() => {
          onDaysChange([...days, []]);
          onActiveDayChange(days.length);
        }}
      >
        + Add a day
      </button>
    </div>
  );
}
