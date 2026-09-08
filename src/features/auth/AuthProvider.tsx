import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearTokens, getTokens, setSessionExpiredHandler } from '../../lib/session';
import { fetchCurrentUser, login } from './api';
import { AuthContext, type AuthStatus } from './authContext';
import type { AuthUser } from './types';

type State = { status: AuthStatus; user: AuthUser | null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Ensure token exists on render to that 'checking' state is only used when a token is present.
  const [state, setState] = useState<State>(() =>
    getTokens() ? { status: 'checking', user: null } : { status: 'signedOut', user: null },
  );
  const queryClient = useQueryClient();

  // Clear the local session and reset the auth state.
  const endLocalSession = useCallback(() => {
    clearTokens();
    setState({ status: 'signedOut', user: null });
    queryClient.clear();
  }, [queryClient]);

  // A refresh failure can happen during any request, so the provider listens
  // for it rather than every caller having to check for a 401.
  //
  // Deliberately does not clear the query cache, unlike signing out above: an
  // expiry is the same person about to sign back in, so keeping the cache keeps
  // their place. Signing out may hand the tablet to someone else.
  useEffect(() => {
    setSessionExpiredHandler(() => setState({ status: 'signedOut', user: null }));
    return () => setSessionExpiredHandler(null);
  }, []);

  // Validate a stored token on load and renew if expired
  useEffect(() => {
    if (!getTokens()) return;
    const controller = new AbortController();
    fetchCurrentUser(controller.signal)
      .then((user) => setState({ status: 'authenticated', user }))
      .catch(() => {
        if (controller.signal.aborted) return;
        clearTokens();
        setState({ status: 'signedOut', user: null });
      });
    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const user = await login(username, password);
    setState({ status: 'authenticated', user });
  }, []);

  const value = useMemo(
    () => ({ status: state.status, user: state.user, signIn, signOut: endLocalSession }),
    [state, signIn, endLocalSession],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
