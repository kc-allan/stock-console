import { useEffect, useId, useRef, useState } from 'react';
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
  const correctionRef = useRef<HTMLDivElement>(null);
  const correctionId = useId();
  // Local UI state. Whether the form is open matters to this screen alone, and it is kept out of
  // the URL on purpose: a link shared over chat should open the item, not a half-finished form.
  const [correcting, setCorrecting] = useState(false);

  // Keyboard and screen reader users land on the heading rather than back at
  // the top of the document with no indication that the page changed.
  useEffect(() => {
    headingRef.current?.focus();
  }, [query.data?.id]);

  // Opening the form puts focus in the count field, so a keyboard user lands where they meant to
  // type. preventScroll keeps the page still while the section expands.
  useEffect(() => {
    if (correcting) correctionRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }, [correcting]);

  return (
    <div className="flex flex-col gap-5">
      {/* Carries the list's search params so going back restores the same view. */}
      <Link
        to={{ pathname: '/items', search }}
        className="inline-flex h-control items-center gap-1.5 self-start font-medium text-muted hover:text-ink"
      >
        <span aria-hidden="true">←</span> Back to stock list
      </Link>

      {query.isPending && (
        <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
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
                className="inline-flex h-control items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
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
        <article className="grid gap-5">
          <header className="grid gap-1">
            {query.data.sku && <p className="font-mono text-sm text-muted">{query.data.sku}</p>}
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-balance outline-none"
            >
              {query.data.title}
            </h1>
            <p className="text-sm text-muted capitalize">
              {query.data.category.replaceAll('-', ' ')}
            </p>
          </header>

          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">
                  Stock
                </span>
                <span
                  className={`font-mono text-4xl font-semibold tabular-nums ${
                    query.data.stock === 0 ? 'text-out' : 'text-figure'
                  }`}
                >
                  {query.data.stock}
                </span>
              </div>

              {/* Sits beside the figure it edits, so the icon reads as "change this number". */}
              <button
                type="button"
                aria-expanded={correcting}
                aria-controls={correctionId}
                aria-label="Correct stock count"
                title="Correct stock count"
                onClick={() => setCorrecting((open) => !open)}
                className={`grid size-control shrink-0 place-items-center rounded-lg border ${
                  correcting
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line-strong text-ink hover:bg-raised'
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </div>

            {/*
              Expands by animating the grid row from 0fr to 1fr, which reaches the form's natural
              height without measuring it in JavaScript. The form stays mounted so closing animates
              too, and `inert` takes it out of the tab order and the accessibility tree while shut.
            */}
            <div
              id={correctionId}
              ref={correctionRef}
              inert={!correcting}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                correcting ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="grid gap-3 border-t border-line bg-raised/60 p-4">
                  <p className="text-sm text-muted">
                    Use this when a physical count disagrees with the recorded figure.
                  </p>
                  <StockCorrectionForm product={query.data} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <img
                src={query.data.thumbnail}
                alt=""
                className="size-32 rounded-lg bg-raised object-cover"
              />
              <div className="grid content-start gap-4">
                <p className="text-sm leading-relaxed text-muted">{query.data.description}</p>
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                      Unit price
                    </dt>
                    <dd className="font-mono text-lg font-semibold tabular-nums">
                      {query.data.price.toFixed(2)}
                    </dd>
                  </div>
                  {query.data.brand && (
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                        Brand
                      </dt>
                      <dd className="text-lg font-semibold">{query.data.brand}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
