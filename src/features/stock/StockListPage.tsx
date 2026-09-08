import { useLocation } from 'react-router';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/states';
import { Pagination } from './Pagination';
import { StockFilters } from './StockFilters';
import { StockList } from './StockList';
import { useStockPage } from './queries';
import { PAGE_SIZE, totalPages } from './stockParams';
import { useStockParams } from './useStockParams';

export function StockListPage() {
  const { params, updateParams } = useStockParams();
  const { search } = useLocation();
  const query = useStockPage(params);

  const data = query.data;
  const pageCount = data ? totalPages(data.total) : 1;
  const pageIsOutOfRange = data !== undefined && data.total > 0 && params.page > pageCount;
  const firstRow = (params.page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(params.page * PAGE_SIZE, data?.total ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold tracking-tight">Stock</h1>

      <StockFilters params={params} onChange={updateParams} />

      {/* Announces result counts to screen readers as filters change. */}
      <p aria-live="polite" className="text-sm text-slate-600">
        {query.isError || data === undefined
          ? ''
          : data.total === 0
            ? 'No items found'
            : `Showing ${firstRow}–${lastRow} of ${data.total} items, page ${params.page} of ${pageCount}`}
      </p>

      {query.isPending && <SkeletonRows count={6} />}

      {query.isError && (
        <ErrorState
          title="Could not load stock"
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )}

      {data && data.total === 0 && (
        <EmptyState
          title="No items found"
          message={
            params.q
              ? `Nothing matches "${params.q}".`
              : params.category
                ? 'This category has no items.'
                : 'The catalogue is empty.'
          }
          action={
            (params.q || params.category) && (
              <button
                type="button"
                onClick={() => updateParams({ q: '', category: '' })}
                className="h-control rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-100"
              >
                Clear filters
              </button>
            )
          }
        />
      )}

      {/* Reachable by editing or pasting a URL. Changing a filter resets the
          page to 1, so the user cannot get here by using the controls. */}
      {pageIsOutOfRange && (
        <EmptyState
          title="That page does not exist"
          message={`This view has ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}.`}
          action={
            <button
              type="button"
              onClick={() => updateParams({ page: 1 })}
              className="h-control rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              Back to first page
            </button>
          }
        />
      )}

      {data && data.products.length > 0 && (
        <div
          // Previous results stay visible while the next request runs, but are
          // dimmed and marked busy so they are not mistaken for current ones.
          aria-busy={query.isPlaceholderData}
          className={query.isPlaceholderData ? 'opacity-50 transition-opacity' : undefined}
        >
          <StockList products={data.products} search={search} />
        </div>
      )}

      {data && !pageIsOutOfRange && (
        <Pagination
          page={params.page}
          pageCount={pageCount}
          onPageChange={(page) => updateParams({ page })}
        />
      )}
    </div>
  );
}
