import { apiRequest, type QueryParams } from '../../lib/apiClient';
import { PAGE_SIZE, type StockParams } from './stockParams';
import type { Category, ProductDetail, ProductListResponse } from './types';

/** Trimming the payload matters on patchy connections. */
const LIST_FIELDS = 'title,category,stock,price,thumbnail';

export function fetchStockPage(
  params: StockParams,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  const shared: QueryParams = {
    limit: PAGE_SIZE,
    skip: (params.page - 1) * PAGE_SIZE,
    sortBy: params.sort,
    order: params.order,
    select: LIST_FIELDS,
  };

  // Three endpoints, one shape of result. Search and category are mutually
  // exclusive because the search endpoint ignores a category parameter.
  if (params.q) {
    return apiRequest('/auth/products/search', { params: { ...shared, q: params.q }, signal });
  }
  if (params.category) {
    return apiRequest(`/auth/products/category/${encodeURIComponent(params.category)}`, {
      params: shared,
      signal,
    });
  }
  return apiRequest('/auth/products', { params: shared, signal });
}

export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return apiRequest('/auth/products/categories', { signal });
}

export function fetchProduct(id: string, signal?: AbortSignal): Promise<ProductDetail> {
  return apiRequest(`/auth/products/${encodeURIComponent(id)}`, { signal });
}

export function updateStock(id: number, stock: number): Promise<ProductDetail> {
  return apiRequest(`/auth/products/${id}`, { method: 'PUT', body: { stock } });
}
