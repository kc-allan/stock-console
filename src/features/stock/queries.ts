import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchProduct, fetchStockItems } from './api';
import type { StockQuery } from './stockParams';

export const stockKeys = {
  lists: ['stock', 'list'] as const,
  list: (query: StockQuery) => ['stock', 'list', query] as const,
  categories: ['stock', 'categories'] as const,
  detail: (id: string) => ['stock', 'detail', id] as const,
};

export function useStockItems(query: StockQuery) {
  return useQuery({
    // Everything the server is asked is in the key, and nothing else. A late response for a
    // replaced search resolves into the entry for that search, which is no longer the one being
    // rendered. Category and page are not in the key because they never reach the server, so
    // changing them reuses what is already loaded instead of fetching again.
    queryKey: stockKeys.list(query),
    queryFn: ({ signal }) => fetchStockItems(query, signal),
    // Keeps the previous results visible while a new search loads instead of flashing a
    // skeleton. They are flagged as placeholder data so the UI can mark them out of date.
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
