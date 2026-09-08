import { endSession, getTokens, setTokens } from './session';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://dummyjson.com';

export const TOKEN_LIFETIME_MINUTES = 1;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | undefined>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  signal?: AbortSignal;
  params?: QueryParams;
  authenticated?: boolean;
};

// Builds a full URL from the base, path and query params. The base is always
function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** DummyJSON reports failures as `{ message }`; fall back to the status text. */
async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || 'Request failed';
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'message' in body) {
      message = String((body as { message: unknown }).message);
    }
  } catch {
    // Non-JSON error body.
  }
  return new ApiError(response.status, message);
}

async function sendRequest(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(buildUrl(path, options.params), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

let refreshInFlight: Promise<string> | null = null;

/**
 * Exchanges the refresh token for a new pair.
 *
 * Single-flight: several queries can fail with 401 at the same moment. Without this they would each start their
 * own refresh, and every response but the last would install a token that the
 * others have already replaced.
 */
function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= (async () => {
    const tokens = getTokens();
    if (!tokens) throw new ApiError(401, 'No refresh token available');

    const response = await sendRequest(
      '/auth/refresh',
      {
        method: 'POST',
        body: { refreshToken: tokens.refreshToken, expiresInMins: TOKEN_LIFETIME_MINUTES },
      },
      null,
    );
    if (!response.ok) throw await toApiError(response);

    const next = (await response.json()) as { accessToken: string; refreshToken: string };
    setTokens(next);
    return next.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.authenticated ?? true;
  let response = await sendRequest(
    path,
    options,
    useAuth ? (getTokens()?.accessToken ?? null) : null,
  );

  if (response.status === 401 && useAuth) {
    let refreshedToken: string;
    try {
      refreshedToken = await refreshAccessToken();
    } catch {
      // The refresh token is gone or rejected, so the session is genuinely over.
      endSession();
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
    response = await sendRequest(path, options, refreshedToken);
  }

  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

/** Test seam: prevents a refresh started by one test leaking into the next. */
export function resetRefreshState(): void {
  refreshInFlight = null;
}
