/**
 * The failure shapes the UI has to tell apart. They exist because the right response differs:
 * an answer from the server is news the user needs, a lost connection is worth retrying, and a
 * request the app abandoned itself is not a failure at all.
 */

/** A response arrived and it was not ok. Carries the status so callers can branch on it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** The request never reached the API: offline, DNS, TLS, a dropped connection. */
export class NetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/** The request was still open when its deadline passed. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * True for a request the app itself abandoned — a superseded search, an unmounted screen.
 * The data layer does this routinely, so these must never surface to the user as errors.
 * A timeout is a real failure and is deliberately excluded.
 *
 * Matched by name rather than `instanceof DOMException`: the abort error can be raised in a
 * different realm from the page's own DOMException, and `instanceof` does not hold across realms.
 */
export function isCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
