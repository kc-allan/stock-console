import { createContext, use } from 'react';
import type { AuthUser } from './schemas';

/**
 * `checking` covers the boot-time /auth/me call. Without it the app would flash
 * the login screen on every reload before the stored session was validated.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'signedOut';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
