import { useState } from 'react';
import { CATEGORY_META, DIETS } from '../lib/categories';
import { formatDistance } from '../lib/geo';
import { osmUrl, staySearchUrl } from '../lib/links';
import type { Destination, Place } from '../lib/types';

interface Props {
  place: Place;
  dest: Destination;
  selected: boolean;
  inTrip: boolean;
  onSelect: () => void;
  onToggleTrip: () => void;
}

export const cardDomId = (id: string) => `card-${id.replace('/', '-')}`;

export function PlaceCard({ place, dest, selected, inTrip, onSelect, onToggleTrip }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const meta = CATEGORY_META[place.category];
  const showImage = place.image && !imgFailed;
  const subtitle = place.cuisine.length ? `${place.kind} · ${place.cuisine.slice(0, 2).join(', ')}` : place.kind;
  const stars = parseInt(place.tags.stars ?? '', 10);

  return (
    <article
      id={cardDomId(place.id)}
      className={`card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="card-photo" style={{ '--c': meta.color } as React.CSSProperties}>
        {showImage ? (
          <img src={place.image} alt={place.name} loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <span className="card-photo-icon" aria-hidden>
            {place.icon}
          </span>
        )}
        <span className="card-distance">{formatDistance(place.distanceKm)}</span>
      </div>
      <div className="card-body">
        <h3>{place.name}</h3>
        <p className="card-kind">
          {subtitle}
          {stars > 0 && <span className="stars"> {'★'.repeat(Math.min(stars, 5))}</span>}
        </p>
        {place.description && <p className="card-desc">{place.description}</p>}
        <div className="badges">
          {place.budget && <span className="badge">{'$'.repeat(place.budget)}</span>}
          {place.free && place.category !== 'food' && place.category !== 'stays' && <span className="badge">Free</span>}
          {place.diets.map((d) => (
            <span key={d} className="badge badge-diet">
              {DIETS.find((x) => x.id === d)?.label}
            </span>
          ))}
          {(place.wheelchair === 'yes' || place.wheelchair === 'limited') && (
            <span className="badge" title={place.wheelchair === 'yes' ? 'Wheelchair accessible' : 'Partly accessible'}>
              ♿ {place.wheelchair === 'limited' ? 'Partly' : 'Accessible'}
            </span>
          )}
        </div>
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button className={`btn btn-small ${inTrip ? 'btn-added' : 'btn-primary'}`} onClick={onToggleTrip}>
            {inTrip ? '✓ In trip' : '+ Add to trip'}
          </button>
          {place.category === 'stays' && (
            <a className="btn btn-small btn-ghost" href={staySearchUrl(place, dest)} target="_blank" rel="noreferrer">
              Check prices
            </a>
          )}
          {place.website && (
            <a className="btn btn-small btn-ghost" href={place.website} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
          <a className="btn btn-small btn-ghost" href={osmUrl(place)} target="_blank" rel="noreferrer">
            Details
          </a>
        </div>
      </div>
    </article>
  );
}
