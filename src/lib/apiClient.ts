import type { z } from 'zod';
import {
  ApiError,
  InvalidResponseError,
  isCancellation,
  NetworkError,
  TimeoutError,
} from './errors';
import { endSession, getTokens, sessionTokensSchema, setTokens } from './session';
import { getSimulatedDelay } from './simulatedDelay';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://dummyjson.com';

export const TOKEN_LIFETIME_MINUTES = 1;

/**
 * Long enough for a slow ward connection, short enough that a request which will never
 * answer still resolves into an error state the user can act on.
 */
const REQUEST_TIMEOUT_MS = 12_000;

export type QueryParams = Record<string, string | number | undefined>;

type RequestOptions<Schema extends z.ZodType> = {
  /** Every response is checked against a schema. There is no untyped escape hatch, on purpose. */
  schema: Schema;
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  signal?: AbortSignal;
  params?: QueryParams;
  authenticated?: boolean;
  timeoutMs?: number;
};

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  const delay = getSimulatedDelay();
  if (delay > 0) url.searchParams.set('delay', String(delay));
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
  options: RequestOptions<z.ZodType>,
  accessToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  /*
   * A slow connection can leave a request open indefinitely. Without a deadline that shows up
   * as a spinner that never stops, which quietly defeats the promise that every screen has an
   * error state.
   *
   * The deadline gets its own controller so that once fetch rejects we can ask which signal
   * fired. Only the deadline is a failure: a request the app superseded itself must stay silent.
   */
  const deadline = new AbortController();
  const timer = setTimeout(() => {
    deadline.abort(new TimeoutError('The connection is too slow to finish this. Try again.'));
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  try {
    return await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ? AbortSignal.any([options.signal, deadline.signal]) : deadline.signal,
    });
  } catch (error) {
    /*
     * Only an abort is reattributed here. Anything else is its own error and must not be
     * relabelled a timeout just because the deadline happened to fire while it was thrown.
     *
     * fetch rejects with the aborting signal's reason, so a timeout normally arrives as the
     * TimeoutError already; it is re-read from the deadline's own controller because not every
     * fetch implementation preserves the reason.
     */
    if (isCancellation(error) || error instanceof TimeoutError) {
      if (options.signal?.aborted !== true && deadline.signal.aborted) {
        throw deadline.signal.reason;
      }
      throw error;
    }
    if (error instanceof TypeError) {
      throw new NetworkError('No connection to the server. Check the network and try again.', {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

let refreshInFlight: Promise<string> | null = null;

/**
 * Exchanges the refresh token for a new pair.
 *
 * Single-flight: several queries can fail with 401 at the same moment. Without this they would
 * each start their own refresh, and every response but the last would install a token that the
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
        schema: sessionTokensSchema,
      },
      null,
    );
    if (!response.ok) throw await toApiError(response);

    const next = await parseBody(response, sessionTokensSchema);
    setTokens(next);
    return next.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiRequest<Schema extends z.ZodType>(
  path: string,
  options: RequestOptions<Schema>,
): Promise<z.output<Schema>> {
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
    } catch (error) {
      /*
       * Only a refusal is unrecoverable. A dropped connection or a timeout leaves us still not
       * knowing whether the session is alive, and signing someone out over a lost packet is the
       * worse failure — so those surface to the caller with the session intact.
       */
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        endSession();
        throw new ApiError(401, 'Your session has expired. Please sign in again.');
      }
      throw error;
    }

    response = await sendRequest(path, options, refreshedToken);

    /*
     * A token minted seconds ago was still refused, so this is neither expiry nor a bad
     * connection — the credentials themselves are no longer accepted. Ending the session sends
     * the user to sign in. Leaving it intact would strand them on a screen insisting they are
     * signed in, retrying something that can only fail.
     */
    if (response.status === 401) {
      endSession();
      throw await toApiError(response);
    }
  }

  if (!response.ok) throw await toApiError(response);
  return parseBody(response, options.schema);
}

/**
 * A 200 is not a promise that the body is what we expected. Asserting the type instead would
 * tell TypeScript a shape is guaranteed when nothing checked it, and the first sign of trouble
 * would be a render crash rather than an error state.
 */
async function parseBody<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
): Promise<z.output<Schema>> {
  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new InvalidResponseError('The server sent back something unexpected.', {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** Test seam: prevents a refresh started by one test leaking into the next. */
export function resetRefreshState(): void {
  refreshInFlight = null;
}
