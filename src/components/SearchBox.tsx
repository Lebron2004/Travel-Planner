import { useEffect, useRef, useState } from 'react';
import { searchDestinations } from '../lib/geocode';
import type { Destination } from '../lib/types';

interface Props {
  onSelect: (d: Destination) => void;
  placeholder?: string;
  size?: 'large' | 'small';
  autoFocus?: boolean;
}

export function SearchBox({ onSelect, placeholder = 'Where are you going?', size = 'large', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchDestinations(query, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(0);
          setError(null);
        })
        .catch(() => !ctrl.signal.aborted && setError("Couldn't reach place search. Try again in a moment."))
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (d: Destination) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(d);
  };

  return (
    <div className={`search search-${size}`} ref={boxRef}>
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Destination"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            choose(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {loading && <span className="search-spinner" aria-hidden />}
      {open && query.trim().length >= 2 && (results.length > 0 || error || loading) && (
        <ul className="search-results" role="listbox">
          {error && <li className="search-error">{error}</li>}
          {loading && results.length === 0 && !error && <li className="search-status">Searching…</li>}
          {results.map((r, i) => (
            <li
              key={`${r.name}-${r.lat}-${r.lon}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
            >
              <span className="result-name">{r.name}</span>
              <span className="result-context">{r.context}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
