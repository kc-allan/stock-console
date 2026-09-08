import { Link, Outlet } from 'react-router';
import { useAuth } from '../features/auth/authContext';

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 p-4">
          <Link to="/items" className="font-semibold tracking-tight">
            Clinic stock console
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user && <span className="text-slate-600">{user.firstName}</span>}
            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
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
