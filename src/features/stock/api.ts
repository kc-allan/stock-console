import { apiRequest, type QueryParams } from '../../lib/apiClient';
import { PAGE_SIZE, type StockParams } from './stockParams';
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
  const shape = { schema: productListResponseSchema, signal };

  // Three endpoints, one shape of result. Search and category are mutually
  // exclusive because the search endpoint ignores a category parameter.
  if (params.q) {
    return apiRequest('/auth/products/search', { ...shape, params: { ...shared, q: params.q } });
  }
  if (params.category) {
    return apiRequest(`/auth/products/category/${encodeURIComponent(params.category)}`, {
      ...shape,
      params: shared,
    });
  }
  return apiRequest('/auth/products', { ...shape, params: shared });
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
