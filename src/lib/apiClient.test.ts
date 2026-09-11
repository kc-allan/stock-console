import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { server } from '../test/server';
import { apiRequest, API_BASE_URL, resetRefreshState } from './apiClient';
import { InvalidResponseError, isCancellation, TimeoutError } from './errors';
import { getTokens, setTokens } from './session';

const RESOURCE = `${API_BASE_URL}/auth/products`;
const REFRESH = `${API_BASE_URL}/auth/refresh`;

const expired = () => HttpResponse.json({ message: 'Token Expired!' }, { status: 401 });

/** These tests are about the request lifecycle, not a particular payload shape. */
const anyBody = z.unknown();

beforeEach(() => {
  // The single-flight promise is module state; a refresh left over from one test would
  // otherwise be reused by the next.
  resetRefreshState();
});

describe('a 401 that survives a refresh', () => {
  it('ends the session rather than leaving the user signed in with nothing that works', async () => {
    setTokens({ accessToken: 'stale', refreshToken: 'refresh-token' });

    let refreshCalls = 0;
    server.use(
      // Refuses every access token, including the one the refresh has just minted. Stands in
      // for a revoked account: refreshing works, the credentials are still no good.
      http.get(RESOURCE, () => expired()),
      http.post(REFRESH, () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'refresh-2' });
      }),
    );

    await expect(apiRequest('/auth/products', { schema: anyBody })).rejects.toThrow();

    // The failure this guards: the session used to survive, so the app kept insisting the user
    // was signed in while every request failed, with no way off the screen.
    expect(getTokens()).toBeNull();
    // Asked once. Refreshing again after a fresh token was refused would be a loop.
    expect(refreshCalls).toBe(1);
  });
});

describe('a refresh that fails for a transport reason', () => {
  it('leaves the session intact instead of signing the user out over a dropped packet', async () => {
    setTokens({ accessToken: 'stale', refreshToken: 'refresh-token' });

    server.use(
      http.get(RESOURCE, () => expired()),
      // Not a refusal — the request never arrives. We still do not know whether the session
      // is alive, and guessing "dead" costs the user their place for no reason.
      http.post(REFRESH, () => HttpResponse.error()),
    );

    await expect(apiRequest('/auth/products', { schema: anyBody })).rejects.toThrow();

    expect(getTokens()).not.toBeNull();
  });
});

describe('timeouts', () => {
  it('reports a request that never answers, and stays silent about one the app cancelled', async () => {
    server.use(
      http.get(RESOURCE, async () => {
        await delay(300);
        return HttpResponse.json({ products: [] });
      }),
    );

    const timedOut: unknown = await apiRequest('/auth/products', {
      schema: anyBody,
      timeoutMs: 20,
    }).catch((error: unknown) => error);

    // Without a deadline this request would have left a spinner up indefinitely.
    expect(timedOut).toBeInstanceOf(TimeoutError);
    expect(isCancellation(timedOut)).toBe(false);

    const caller = new AbortController();
    const pending = apiRequest('/auth/products', {
      schema: anyBody,
      signal: caller.signal,
      timeoutMs: 5_000,
    }).catch((error: unknown) => error);
    caller.abort();
    const cancelled: unknown = await pending;

    // A superseded search is not a failure, and must never reach the user as one.
    expect(cancelled).not.toBeInstanceOf(TimeoutError);
    expect(isCancellation(cancelled)).toBe(true);
  });

  it('composes the caller signal with the deadline and keeps the abort reason', () => {
    // Guards the assumption the timeout rests on. If jsdom ever stops preserving the reason,
    // this says so directly instead of the test above failing for an obscure reason.
    const caller = new AbortController();
    const deadline = new AbortController();
    const composed = AbortSignal.any([caller.signal, deadline.signal]);
    const reason = new TimeoutError('too slow');

    deadline.abort(reason);

    expect(composed.aborted).toBe(true);
    expect(composed.reason).toBe(reason);
  });
});

describe('a 200 whose body is the wrong shape', () => {
  it('is an error the UI can show, not a crash on first render', async () => {
    server.use(
      // Status says fine, body says otherwise. Asserting the type would have let this
      // through to the components and failed there instead.
      http.get(RESOURCE, () => HttpResponse.json({ products: 'not an array' })),
    );

    const error: unknown = await apiRequest('/auth/products', {
      schema: z.object({ products: z.array(z.unknown()) }),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidResponseError);
  });
});
