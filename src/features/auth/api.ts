import { apiRequest, TOKEN_LIFETIME_MINUTES } from '../../lib/apiClient';
import { setTokens } from '../../lib/session';
import { authUserSchema, loginResponseSchema, type AuthUser } from './schemas';

export async function login(username: string, password: string): Promise<AuthUser> {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username, password, expiresInMins: TOKEN_LIFETIME_MINUTES },
    authenticated: false,
    schema: loginResponseSchema,
  });

  const { accessToken, refreshToken, ...user } = result;
  setTokens({ accessToken, refreshToken });
  return user;
}

/** Used on load to check whether a stored token still represents a real session. */
export function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  return apiRequest('/auth/me', { signal, schema: authUserSchema });
}
