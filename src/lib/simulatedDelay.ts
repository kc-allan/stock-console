/**
 * `?delay=<ms>` in the address bar slows every API request by that much, using DummyJSON's own
 * delay parameter. It exists so slow-network behaviour — the search race, loading states, the
 * timeout — can be tried by hand on the running app, not only in tests.
 *
 * Read once when the app loads and kept for the rest of the visit. The stock list rewrites its URL
 * whenever a filter changes, which would otherwise drop the parameter at exactly the moment you
 * start typing a search to test the race.
 */

/** DummyJSON answers 400 above this rather than capping it, so the cap is applied here. */
export const MAX_DELAY_MS = 5000;

let delayMs = 0;

export function parseDelay(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return 0;
  return Math.min(value, MAX_DELAY_MS);
}

export function setSimulatedDelay(ms: number): void {
  delayMs = ms;
}

export function getSimulatedDelay(): number {
  return delayMs;
}
