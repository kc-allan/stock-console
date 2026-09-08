import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { createQueryClient } from '../lib/queryClient';

/**
 * Exposes the current URL so tests can assert on URL-owned state. Deliberately
 * a plain span: <output> carries an implicit role of "status", which would
 * collide with the app's own status messages in role-based queries.
 */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

type Options = {
  route?: string;
  /** Set when the component reads route params, so useParams() has a match. */
  path?: string;
};

export function renderWithProviders(ui: ReactElement, { route = '/items', path }: Options = {}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        ) : (
          ui
        )}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
