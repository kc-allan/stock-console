import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchProduct, fetchStockPage } from './api';
import type { StockParams } from './stockParams';

export const stockKeys = {
  lists: ['stock', 'list'] as const,
  list: (params: StockParams) => ['stock', 'list', params] as const,
  categories: ['stock', 'categories'] as const,
  detail: (id: string) => ['stock', 'detail', id] as const,
};

export function useStockPage(params: StockParams) {
  return useQuery({
    // Every input to the request is in the key. This is what makes a late
    // response for a replaced search harmless: it resolves into the cache entry
    // for the query it belongs to, which is no longer the one being rendered.
    queryKey: stockKeys.list(params),
    queryFn: ({ signal }) => fetchStockPage(params, signal),
    // Keeps the previous page visible while the next one loads instead of
    // flashing a skeleton. The result is flagged as placeholder data so the UI
    // can show that it is out of date rather than passing it off as current.
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: stockKeys.categories,
    queryFn: ({ signal }) => fetchCategories(signal),
    // The catalogue's category list is effectively static for a session.
    staleTime: 30 * 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: stockKeys.detail(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
  });
}
