import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { EmptyState, ErrorState } from '../../components/states';
import { ApiError } from '../../lib/errors';
import { StockCorrectionForm } from './StockCorrectionForm';
import { useProduct } from './queries';

export function ItemDetailPage() {
  const { id = '' } = useParams();
  const { search } = useLocation();
  const query = useProduct(id);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Keyboard and screen reader users land on the heading rather than back at
  // the top of the document with no indication that the page changed.
  useEffect(() => {
    headingRef.current?.focus();
  }, [query.data?.id]);

  return (
    <div className="flex flex-col gap-5">
      {/* Carries the list's search params so going back restores the same view. */}
      <Link to={{ pathname: '/items', search }} className="text-sm text-brand-700 underline">
        Back to stock list
      </Link>

      {query.isPending && (
        <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
      )}

      {/* A 404 is not a transient failure, so it gets a way out rather than a
          retry that can only fail again. Colleagues share item links over chat,
          so landing on one that no longer resolves is a real path. */}
      {query.isError &&
        (query.error instanceof ApiError && query.error.status === 404 ? (
          <EmptyState
            title="Item not found"
            message="This item is not in the catalogue. The link may be out of date."
            action={
              // Deliberately a different destination and a different accessible
              // name from the back link above: that one preserves the filters
              // the stale link carried, this one clears them.
              <Link
                to="/items"
                className="inline-block h-control rounded-md bg-brand-600 px-4 text-sm leading-[var(--spacing-control)] font-medium text-white hover:bg-brand-700"
              >
                Browse all stock
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="Could not load this item"
            message={query.error.message}
            onRetry={() => query.refetch()}
          />
        ))}

      {query.data && (
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold tracking-tight outline-none"
            >
              {query.data.title}
            </h1>
            <p className="text-sm text-slate-600 capitalize">
              {query.data.category.replaceAll('-', ' ')}
              {query.data.sku && <span className="ml-2 normal-case">SKU {query.data.sku}</span>}
            </p>
          </header>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <img
              src={query.data.thumbnail}
              alt=""
              className="size-32 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
            />
            <div className="flex-1">
              <p className="text-sm text-slate-600">{query.data.description}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-600">Recorded stock</dt>
              <dd className="text-2xl font-semibold tabular-nums">{query.data.stock}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Unit price</dt>
              <dd className="text-2xl font-semibold tabular-nums">{query.data.price.toFixed(2)}</dd>
            </div>
            {query.data.availabilityStatus && (
              <div>
                <dt className="text-sm text-slate-600">Availability</dt>
                <dd className="text-2xl font-semibold">{query.data.availabilityStatus}</dd>
              </div>
            )}
          </dl>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-medium">Correct the stock count</h2>
            <p className="mt-1 mb-4 text-sm text-slate-600">
              Use this when a physical count disagrees with the recorded figure.
            </p>
            <StockCorrectionForm product={query.data} />
          </section>
        </article>
      )}
    </div>
  );
}
