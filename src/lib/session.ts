/**
 * Owns the signed-in session: the tokens themselves, and the signal that the
 * session has ended and cannot be recovered.
 *
 * This is a plain module rather than React state because the fetch wrapper in
 * `apiClient.ts` needs the access token, and it runs outside the component tree.
 */

import { z } from 'zod';

const ACCESS_TOKEN_KEY = 'clinic-stock.accessToken';
const REFRESH_TOKEN_KEY = 'clinic-stock.refreshToken';

/** One source of truth for the token shape: the refresh response is checked against it too. */
export const sessionTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type SessionTokens = z.infer<typeof sessionTokensSchema>;

/**
 * Storage can throw rather than just be empty (Safari private mode, blocked
 * site data), so every access is guarded. A failed read means "not signed in",
 * which degrades to the login screen instead of crashing the app.
 */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Session then lasts for this tab only.
  }
}

export function getTokens(): SessionTokens | null {
  const accessToken = readStorage(ACCESS_TOKEN_KEY);
  const refreshToken = readStorage(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function setTokens(tokens: SessionTokens): void {
  writeStorage(ACCESS_TOKEN_KEY, tokens.accessToken);
  writeStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  writeStorage(ACCESS_TOKEN_KEY, null);
  writeStorage(REFRESH_TOKEN_KEY, null);
}

let sessionExpiredHandler: (() => void) | null = null;

/**
 * Let the auth provider react to a session that could not be refreshed.
 * Otherwise an expired session would surface only as a 401 on whichever
 * query happened to run next.
 */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export function endSession(): void {
  clearTokens();
  sessionExpiredHandler?.();
}
