import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { ItemDetailPage } from './features/stock/ItemDetailPage';
import { StockListPage } from './features/stock/StockListPage';
import { AppLayout } from './routes/AppLayout';
import { NotFoundPage } from './routes/NotFoundPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { getSimulatedDelay } from './lib/simulatedDelay';

export default function App() {
  const delayMs = getSimulatedDelay();

  return (
    <>
      {/* A deliberately slowed app looks exactly like a broken one, so say so whenever it is on. */}
      {delayMs > 0 && (
        <p className="bg-accent px-4 py-1.5 text-center text-sm font-medium text-accent-ink">
          Every request is delayed by {delayMs} ms for testing. Reload without{' '}
          <code className="font-mono">?delay</code> to turn it off.
        </p>
      )}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/items" replace />} />
            <Route path="/items" element={<StockListPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
