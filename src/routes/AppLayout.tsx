import { Link, Outlet } from 'react-router';
import { useAuth } from '../features/auth/authContext';

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-ink focus:ring-1 focus:ring-line-strong"
      >
        Skip to main content
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/items" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
            Clinic stock console
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user && <span className="text-muted">{user.firstName}</span>}
            <button
              type="button"
              onClick={signOut}
              className="h-control rounded-lg border border-line-strong px-3.5 font-medium hover:bg-raised"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
