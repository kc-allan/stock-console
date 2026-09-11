import { QueryClient } from '@tanstack/react-query';
import { NetworkError, TimeoutError } from './errors';

/**
 * Shared so tests exercise the same retry and staleness rules as the app.
 *
 * Retries are deliberately mean. If the server answered at all — a 404, a 500 — that answer is
 * what the user needs to see, and asking again only delays it. DummyJSON also rate-limits bursts
 * with an undocumented 429, which retrying makes worse. Only failures that plausibly fix
 * themselves are retried, once, after a pause.
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= 1) return false;
  return error instanceof NetworkError || error instanceof TimeoutError;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        retryDelay: 1500,
      },
    },
  });
}
