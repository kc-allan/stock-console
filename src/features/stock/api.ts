import { apiRequest } from '../../lib/apiClient';
import type { StockQuery } from './stockParams';
import {
  categoryListSchema,
  productDetailSchema,
  productListResponseSchema,
  type Category,
  type ProductDetail,
  type ProductListResponse,
} from './schemas';

/** Trimming the payload matters on patchy connections. */
const LIST_FIELDS = 'title,category,stock,price,thumbnail';

/**
 * Every item matching the search, sorted by the server, in one request. Category and page are
 * then applied in the browser: the search endpoint ignores a category parameter, and the whole
 * catalogue is 194 items, so the complete result is small enough to fetch outright.
 */
export function fetchStockItems(
  query: StockQuery,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  return apiRequest(query.q ? '/auth/products/search' : '/auth/products', {
    schema: productListResponseSchema,
    signal,
    params: {
      q: query.q,
      limit: 0, // DummyJSON reads 0 as "no limit".
      sortBy: query.sort,
      order: query.order,
      select: LIST_FIELDS,
    },
  });
}

export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return apiRequest('/auth/products/categories', { signal, schema: categoryListSchema });
}

export function fetchProduct(id: string, signal?: AbortSignal): Promise<ProductDetail> {
  return apiRequest(`/auth/products/${encodeURIComponent(id)}`, {
    signal,
    schema: productDetailSchema,
  });
}

export function updateStock(id: number, stock: number): Promise<ProductDetail> {
  return apiRequest(`/auth/products/${id}`, {
    method: 'PUT',
    body: { stock },
    schema: productDetailSchema,
  });
}
