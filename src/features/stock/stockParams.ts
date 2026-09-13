/**
 * The list view is fully described by the URL. This module is the single place
 * that decides what a URL means, so a hand-typed or stale link can never put the
 * page into a state the rest of the code does not expect.
 *
 * Kept free of React so it can be unit tested directly.
 */

export const SORT_OPTIONS = [
  { value: 'title', label: 'Name' },
  { value: 'stock', label: 'Stock count' },
  { value: 'price', label: 'Price' },
] as const;

export type SortField = (typeof SORT_OPTIONS)[number]['value'];
export type SortOrder = 'asc' | 'desc';

const SORT_FIELDS: readonly string[] = SORT_OPTIONS.map((option) => option.value);

export const DEFAULT_SORT: SortField = 'title';
export const DEFAULT_ORDER: SortOrder = 'asc';

/** Enough rows to be useful on a tablet without a huge payload over patchy wifi. */
export const PAGE_SIZE = 12;

export type StockParams = {
  q: string;
  category: string;
  sort: SortField;
  order: SortOrder;
  page: number;
};

/**
 * The part of the view the server is asked for. Category and page are left out on purpose:
 * they are applied in the browser to what comes back, so changing them needs no request.
 */
export type StockQuery = Pick<StockParams, 'q' | 'sort' | 'order'>;

function parsePage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

export function parseStockParams(searchParams: URLSearchParams): StockParams {
  const sortRaw = searchParams.get('sort');
  const orderRaw = searchParams.get('order');
  const q = (searchParams.get('q') ?? '').trim();

  return {
    q,
    category: searchParams.get('category') ?? '',
    sort: SORT_FIELDS.includes(sortRaw ?? '') ? (sortRaw as SortField) : DEFAULT_SORT,
    order: orderRaw === 'desc' ? 'desc' : DEFAULT_ORDER,
    page: parsePage(searchParams.get('page')),
  };
}

/** Defaults are left out so a shared link carries only what was actually chosen. */
export function toSearchParams(params: StockParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.category) searchParams.set('category', params.category);
  if (params.sort !== DEFAULT_SORT) searchParams.set('sort', params.sort);
  if (params.order !== DEFAULT_ORDER) searchParams.set('order', params.order);
  if (params.page > 1) searchParams.set('page', String(params.page));
  return searchParams;
}

export function totalPages(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
