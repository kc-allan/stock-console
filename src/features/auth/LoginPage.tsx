import { useId, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { ApiError } from '../../lib/errors';
import { Spinner } from '../../components/Spinner';
import { useAuth } from './authContext';

/** Only safe to send the user to in-app paths, never an absolute URL. */
function safeRedirect(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/items';
  return next;
}

export function LoginPage() {
  const { status, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameId = useId();
  const passwordId = useId();
  const errorId = useId();

  const destination = safeRedirect(searchParams.get('next'));

  if (status === 'authenticated') {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username, password);
      // The redirect is handled by the status check above once auth state updates.
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not reach the server. Check your connection and try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
          Clinic stock console
        </h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage stock.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5"
        noValidate
      >
        {error && (
          <p id={errorId} role="alert" className="rounded-lg bg-out-soft p-3 text-sm text-out">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={usernameId} className="text-sm font-medium">
            Username
          </label>
          <input
            id={usernameId}
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-describedby={error ? errorId : undefined}
            className="h-control rounded-lg border border-line-strong bg-surface px-3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="text-sm font-medium">
            Password
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby={error ? errorId : undefined}
            className="h-control rounded-lg border border-line-strong bg-surface px-3"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="h-control rounded-lg bg-accent px-4 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? <Spinner label="Signing in" /> : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-muted">
        Demo credentials: <code className="font-mono text-ink">emilys</code> /{' '}
        <code className="font-mono text-ink">emilyspass</code>
      </p>
    </main>
  );
}
