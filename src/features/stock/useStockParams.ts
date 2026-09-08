import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseStockParams, toSearchParams, type StockParams } from './stockParams';

type UpdateOptions = { replace?: boolean };

export function useStockParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => parseStockParams(searchParams), [searchParams]);

  const updateParams = useCallback(
    (patch: Partial<StockParams>, options: UpdateOptions = {}) => {
      setSearchParams(
        (current) => {
          const merged = { ...parseStockParams(current), ...patch };
          // Changing what is being listed invalidates the page number: page 8 of
          // an unfiltered catalogue is rarely page 8 of a filtered one. Only an
          // explicit page change keeps its page.
          if (patch.page === undefined) merged.page = 1;
          return toSearchParams(merged);
        },
        { replace: options.replace },
      );
    },
    [setSearchParams],
  );

  return { params, updateParams };
}
