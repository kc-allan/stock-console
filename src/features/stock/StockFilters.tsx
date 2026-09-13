import { useId } from 'react';
import { SearchInput } from './SearchInput';
import { useCategories } from './queries';
import { SORT_OPTIONS, type SortField, type SortOrder, type StockParams } from './stockParams';

const ORDER_LABELS: Record<SortField, [asc: string, desc: string]> = {
  title: ['A to Z', 'Z to A'],
  stock: ['Lowest first', 'Highest first'],
  price: ['Lowest first', 'Highest first'],
};

type Props = {
  params: StockParams;
  onChange: (patch: Partial<StockParams>) => void;
};

export function StockFilters({ params, onChange }: Props) {
  const categoryId = useId();
  const sortId = useId();
  const categories = useCategories();

  const categoryActive = params.category !== '';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
      <SearchInput value={params.q} onCommit={(q) => onChange({ q })} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={categoryId} className="text-sm font-medium">
          Category
        </label>
        <div className="flex gap-2">
          <select
            id={categoryId}
            value={params.category}
            disabled={categories.isPending || categories.isError}
            onChange={(event) => onChange({ category: event.target.value })}
            className="h-control rounded-md border border-slate-300 bg-white px-2 disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="">All categories</option>
            {categories.data?.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          {categoryActive && (
            <button
              type="button"
              onClick={() => onChange({ category: '' })}
              className="h-control rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100"
            >
              Clear
            </button>
          )}
        </div>
        {categories.isError && (
          <p className="text-xs text-red-700">
            Categories did not load.{' '}
            <button type="button" onClick={() => categories.refetch()} className="underline">
              Retry
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={sortId} className="text-sm font-medium">
          Sort by
        </label>
        <select
          id={sortId}
          value={`${params.sort}:${params.order}`}
          onChange={(event) => {
            const [sort, order] = event.target.value.split(':');
            onChange({ sort: sort as SortField, order: order as SortOrder });
          }}
          className="h-control rounded-md border border-slate-300 bg-white px-2"
        >
          {SORT_OPTIONS.map((option) =>
            (['asc', 'desc'] as const).map((order) => (
              <option key={`${option.value}:${order}`} value={`${option.value}:${order}`}>
                {option.label} &middot; {ORDER_LABELS[option.value][order === 'asc' ? 0 : 1]}
              </option>
            )),
          )}
        </select>
      </div>
    </div>
  );
}
