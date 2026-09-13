import { Link } from 'react-router';
import type { Product } from './schemas';

/**
 * Rows rather than a table: these users are on 360px-wide ward tablets, and one
 * layout that works everywhere beats a table plus a separate mobile rendering of
 * the same data.
 */
export function StockList({ products, search }: { products: Product[]; search: string }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {products.map((product) => {
        // Derived from the count rather than read from the API's availability field, which
        // DummyJSON never recalculates after a correction and would then contradict the number.
        const outOfStock = product.stock === 0;
        return (
          <li key={product.id}>
            <Link
              to={{ pathname: `/items/${product.id}`, search }}
              className="flex min-h-16 items-center gap-3.5 px-4 py-3 hover:bg-raised"
            >
              <img
                src={product.thumbnail}
                alt=""
                loading="lazy"
                className="size-11 shrink-0 rounded-lg bg-raised object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{product.title}</span>
                <span className="block text-sm text-muted capitalize">
                  {product.category.replaceAll('-', ' ')}
                  {outOfStock && (
                    <span className="font-medium whitespace-nowrap text-out normal-case">
                      {' '}
                      · Out of stock
                    </span>
                  )}
                </span>
              </span>
              {/* The count is the one figure in the accent. No caption under it: the list is
                  about stock, so the number does not need labelling on every row. */}
              <span
                className={`shrink-0 font-mono text-2xl font-semibold tabular-nums ${
                  outOfStock ? 'text-out' : 'text-figure'
                }`}
              >
                {product.stock}
                <span className="sr-only"> in stock</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
