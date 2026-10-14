import { DIETS } from '../lib/categories';
import { EMPTY_FILTERS, activeFilterCount } from '../lib/filters';
import type { Budget, Category, Filters } from '../lib/types';

interface Props {
  category: Category;
  filters: Filters;
  cuisines: string[];
  onChange: (f: Filters) => void;
}

const PLACEHOLDER: Record<Category, string> = {
  sights: 'Search sights: museum, castle…',
  food: 'Search food: ramen, tacos, coffee…',
  gems: 'Search gems: street art, viewpoint…',
  stays: 'Search stays: hostel, hotel…',
};

export function FilterBar({ category, filters, cuisines, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggleDiet = (d: Filters['diets'][number]) =>
    set({ diets: filters.diets.includes(d) ? filters.diets.filter((x) => x !== d) : [...filters.diets, d] });
  const count = activeFilterCount(filters);

  return (
    <div className="filters">
      <input
        className="filter-search"
        type="search"
        value={filters.query}
        placeholder={PLACEHOLDER[category]}
        aria-label="Search this list"
        onChange={(e) => set({ query: e.target.value })}
      />
      {category === 'food' && cuisines.length > 0 && (
        <div className="chips" aria-label="Popular cuisines">
          {cuisines.map((c) => (
            <button
              key={c}
              className={`chip chip-soft ${filters.query === c ? 'on' : ''}`}
              onClick={() => set({ query: filters.query === c ? '' : c })}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="chips" aria-label="Restrictions">
        {category === 'food' &&
          DIETS.map((d) => (
            <button key={d.id} className={`chip ${filters.diets.includes(d.id) ? 'on' : ''}`} onClick={() => toggleDiet(d.id)}>
              {d.label}
            </button>
          ))}
        {category !== 'gems' && (
          <div className="segmented" role="group" aria-label="Budget">
            {([1, 2, 3] as Budget[]).map((b) => (
              <button
                key={b}
                className={filters.maxBudget === b ? 'on' : ''}
                title={`Up to ${'$'.repeat(b)}`}
                onClick={() => set({ maxBudget: filters.maxBudget === b ? null : b })}
              >
                {'$'.repeat(b)}
              </button>
            ))}
          </div>
        )}
        <button className={`chip ${filters.accessible ? 'on' : ''}`} onClick={() => set({ accessible: !filters.accessible })}>
          ♿ Accessible
        </button>
        {(category === 'sights' || category === 'gems') && (
          <button className={`chip ${filters.freeOnly ? 'on' : ''}`} onClick={() => set({ freeOnly: !filters.freeOnly })}>
            Free only
          </button>
        )}
        {count > 0 && (
          <button className="chip chip-clear" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}>
            Clear {count}
          </button>
        )}
      </div>
    </div>
  );
}
