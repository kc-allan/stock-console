import { Link } from 'react-router';
import type { Product } from './types';

/**
 * A list of cards rather than a table: these users are on 360px-wide ward
 * tablets, and one layout that works everywhere beats a table plus a separate
 * mobile rendering of the same data.
 */
export function StockList({ products, search }: { products: Product[]; search: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            to={{ pathname: `/items/${product.id}`, search }}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-brand-300 hover:bg-brand-50"
          >
            <img
              src={product.thumbnail}
              alt=""
              loading="lazy"
              className="size-14 shrink-0 rounded object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{product.title}</span>
              <span className="block text-sm text-slate-600 capitalize">
                {product.category.replaceAll('-', ' ')}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-lg font-semibold tabular-nums">{product.stock}</span>
              <span className="block text-xs text-slate-600">in stock</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
