import { apiRequest, TOKEN_LIFETIME_MINUTES } from '../../lib/apiClient';
import { setTokens } from '../../lib/session';
import type { AuthUser, LoginResponse } from './types';

export async function login(username: string, password: string): Promise<AuthUser> {
  const result = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { username, password, expiresInMins: TOKEN_LIFETIME_MINUTES },
    authenticated: false,
  });

  const { accessToken, refreshToken, ...user } = result;
  setTokens({ accessToken, refreshToken });
  return user;
}

/** Used on load to check whether a stored token still represents a real session. */
export function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { signal });
}
