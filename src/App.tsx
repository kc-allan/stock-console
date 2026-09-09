import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { ItemDetailPage } from './features/stock/ItemDetailPage';
import { StockListPage } from './features/stock/StockListPage';
import { AppLayout } from './routes/AppLayout';
import { NotFoundPage } from './routes/NotFoundPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
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
  );
}
