import { useLocation } from 'react-router';
import { EmptyState, ErrorState, SkeletonRows } from '../../components/states';
import { Pagination } from './Pagination';
import { StockFilters } from './StockFilters';
import { StockList } from './StockList';
import { useStockItems } from './queries';
import { PAGE_SIZE, totalPages } from './stockParams';
import { useStockParams } from './useStockParams';

export function StockListPage() {
  const { params, updateParams } = useStockParams();
  const { search } = useLocation();
  const query = useStockItems({ q: params.q, sort: params.sort, order: params.order });

  // The server has searched and sorted. Category and page are applied here, to the whole result.
  const products = query.data?.products;
  const matching =
    products === undefined || params.category === ''
      ? products
      : products.filter((product) => product.category === params.category);

  const total = matching?.length ?? 0;
  const pageCount = totalPages(total);
  const pageIsOutOfRange = matching !== undefined && total > 0 && params.page > pageCount;
  const firstRow = (params.page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(params.page * PAGE_SIZE, total);
  const pageItems = matching?.slice(firstRow - 1, lastRow) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Stock</h1>

      <StockFilters params={params} onChange={updateParams} />

      {/* Announces result counts to screen readers as filters change. */}
      <p aria-live="polite" className="text-sm text-muted">
        {query.isError || matching === undefined
          ? ''
          : total === 0
            ? 'No items found'
            : `Showing ${firstRow}–${lastRow} of ${total} items, page ${params.page} of ${pageCount}`}
      </p>

      {query.isPending && <SkeletonRows count={6} />}

      {query.isError && (
        <ErrorState
          title="Could not load stock"
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )}

      {matching && total === 0 && (
        <EmptyState
          title="No items found"
          message={
            params.q
              ? `Nothing matches "${params.q}"${params.category ? ' in this category' : ''}.`
              : params.category
                ? 'This category has no items.'
                : 'The catalogue is empty.'
          }
          action={
            (params.q || params.category) && (
              <button
                type="button"
                onClick={() => updateParams({ q: '', category: '' })}
                className="h-control rounded-lg border border-line-strong px-4 text-sm font-medium hover:bg-raised"
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
              className="h-control rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
            >
              Back to first page
            </button>
          }
        />
      )}

      {pageItems.length > 0 && (
        <div
          // Previous results stay visible while the next request runs, but are
          // dimmed and marked busy so they are not mistaken for current ones.
          aria-busy={query.isPlaceholderData}
          className={query.isPlaceholderData ? 'opacity-50 transition-opacity' : undefined}
        >
          <StockList products={pageItems} search={search} />
        </div>
      )}

      {matching && !pageIsOutOfRange && (
        <Pagination
          page={params.page}
          pageCount={pageCount}
          onPageChange={(page) => updateParams({ page })}
        />
      )}
    </div>
  );
}
