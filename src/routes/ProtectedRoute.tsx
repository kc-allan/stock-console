import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { FullPageSpinner } from '../components/Spinner';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return <FullPageSpinner label="Checking your session" />;
  }

  if (status === 'signedOut') {
    // Full location helps preserve the user's context i.e . search and filter states.
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
