import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { CATEGORY_META } from '../lib/categories';
import { haversineKm } from '../lib/geo';
import type { Route } from '../lib/routing';
import type { Destination, LatLon, Place } from '../lib/types';

export const DAY_COLORS = ['#c8553d', '#3d6c8c', '#5b7f5e', '#8a5a9e', '#d4a017', '#2a9d8f', '#e76f51'];
export const dayColor = (i: number) => DAY_COLORS[i % DAY_COLORS.length];

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(content: string, color: string, variant: 'place' | 'stop' | 'selected') {
  const key = `${content}|${color}|${variant}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const size = variant === 'place' ? 30 : 34;
    icon = L.divIcon({
      className: '',
      html: `<div class="pin pin-${variant}" style="--c:${color}">${content}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

function FlyTo({ target, zoom }: { target: LatLon | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], zoom ?? Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [target?.lat, target?.lon]);
  return null;
}

function FitDestination({ dest }: { dest: Destination }) {
  const map = useMap();
  useEffect(() => {
    // Zoom so the search circle roughly fills the map.
    const bounds = L.latLng(dest.lat, dest.lon).toBounds(dest.radius * 1.4);
    map.fitBounds(bounds, { animate: false });
  }, [dest.lat, dest.lon, dest.radius]);
  return null;
}

function AreaWatcher({ dest, onMoved }: { dest: Destination; onMoved: (area: { center: LatLon; radius: number } | null) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      const center = { lat: c.lat, lon: c.lng };
      const b = map.getBounds();
      const radius = Math.min(8000, Math.max(800, map.distance(b.getNorthEast(), b.getSouthWest()) / 2));
      const movedKm = haversineKm(center, dest);
      onMoved(movedKm * 1000 > dest.radius * 0.35 ? { center, radius: Math.round(radius) } : null);
    },
  });
  return null;
}

interface Props {
  dest: Destination;
  places: Place[];
  tripDays: Place[][];
  routes: (Route | null)[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleTrip: (p: Place) => void;
  onMoved: (area: { center: LatLon; radius: number } | null) => void;
}

export function MapView({ dest, places, tripDays, routes, selectedId, onSelect, onToggleTrip, onMoved }: Props) {
  const tripIndex = useMemo(() => {
    const m = new Map<string, { day: number; n: number }>();
    tripDays.forEach((d, day) => d.forEach((p, i) => m.set(p.id, { day, n: i + 1 })));
    return m;
  }, [tripDays]);

  const tripStops = tripDays.flat();
  const shown = [...places.filter((p) => !tripIndex.has(p.id)), ...tripStops];
  const selected = shown.find((p) => p.id === selectedId) ?? null;
  const markerRefs = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (selectedId) markerRefs.current.get(selectedId)?.openPopup();
  }, [selectedId]);

  return (
    <MapContainer center={[dest.lat, dest.lon]} zoom={14} zoomControl={false} className="map" scrollWheelZoom>
      {/* Standard OpenStreetMap tiles: free and keyless. A CSS filter (.map .leaflet-tile-pane) softens them to match the site. */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <FitDestination dest={dest} />
      <FlyTo target={selected} />
      <AreaWatcher dest={dest} onMoved={onMoved} />

      {routes.map(
        (r, i) =>
          r && (
            <Polyline
              key={`route-${i}-${r.distanceKm}`}
              positions={r.path}
              pathOptions={{ color: dayColor(i), weight: 5, opacity: 0.85, dashArray: r.approximate ? '6 8' : undefined }}
            />
          ),
      )}

      {shown.map((p) => {
        const stop = tripIndex.get(p.id);
        const icon = stop
          ? pinIcon(String(stop.n), dayColor(stop.day), 'stop')
          : pinIcon(p.icon, CATEGORY_META[p.category].color, p.id === selectedId ? 'selected' : 'place');
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={icon}
            zIndexOffset={stop ? 1000 : p.id === selectedId ? 500 : 0}
            ref={(m) => {
              if (m) markerRefs.current.set(p.id, m);
              else markerRefs.current.delete(p.id);
            }}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup>
              <div className="popup">
                {p.image && <img src={p.image} alt="" />}
                <strong>{p.name}</strong>
                <span>{stop ? `Day ${stop.day + 1} · stop ${stop.n}` : p.kind}</span>
                <button className="btn btn-small btn-primary" onClick={() => onToggleTrip(p)}>
                  {stop ? 'Remove from trip' : '+ Add to trip'}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
