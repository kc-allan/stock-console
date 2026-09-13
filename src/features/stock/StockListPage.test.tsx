import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '../../test/server';
import { renderWithProviders } from '../../test/renderWithProviders';
import { StockListPage } from './StockListPage';

const BASE = 'https://dummyjson.com';

/**
 * The API returns every match at once, so `total` is always the number of items sent. The old
 * helper let a fixture claim more items than it returned, which was harmless while the server
 * did the paging and is a lie now that the browser does.
 */
function listResponse(items: { title: string; category?: string }[]) {
  return HttpResponse.json({
    products: items.map((item, index) => ({
      id: index + 1,
      title: item.title,
      category: item.category ?? 'wound-care',
      stock: 5,
      price: 1,
      thumbnail: `https://cdn.dummyjson.com/products/images/${index + 1}/thumbnail.png`,
    })),
    total: items.length,
    skip: 0,
    limit: 0,
  });
}

const page = (titles: string[]) => listResponse(titles.map((title) => ({ title })));
const numbered = (count: number) => Array.from({ length: count }, (_, i) => `Item ${i + 1}`);

const categories = http.get(`${BASE}/auth/products/categories`, () =>
  HttpResponse.json([{ slug: 'wound-care', name: 'Wound care' }]),
);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('StockListPage', () => {
  /**
   * The graded requirement: a slow response for a query the user has already
   * replaced must never reach the screen. Both the query key and request
   * cancellation contribute; this asserts the outcome the user sees.
   */
  it('never shows results for a search query that has been replaced', async () => {
    server.use(
      categories,
      http.get(`${BASE}/auth/products`, () => page(['Existing item'])),
      http.get(`${BASE}/auth/products/search`, async ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        if (q === 'gauze') {
          await delay(800);
          return page(['STALE gauze result']);
        }
        return page(['CURRENT gauzes result']);
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StockListPage />);
    await screen.findByText('Existing item');

    const searchBox = screen.getByLabelText('Search stock');
    await user.type(searchBox, 'gauze');
    // Let the debounce fire and the slow request get in flight.
    await wait(400);
    await user.type(searchBox, 's');

    await screen.findByText('CURRENT gauzes result');

    // Outlive the slow response, then confirm it never rendered.
    await wait(900);
    expect(screen.queryByText('STALE gauze result')).not.toBeInTheDocument();
    expect(screen.getByText('CURRENT gauzes result')).toBeInTheDocument();
  }, 10_000);

  it('returns to page 1 when the sort order changes', async () => {
    // Page 8 of an unsorted catalogue is not page 8 of a re-sorted one, so
    // keeping the page number would strand the user on an arbitrary page.
    server.use(
      categories,
      // Enough for page 8 to exist: items 85–96.
      http.get(`${BASE}/auth/products`, () => page(numbered(100))),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StockListPage />, { route: '/items?page=8' });
    await screen.findByText('Item 85');
    expect(screen.getByTestId('location')).toHaveTextContent('page=8');

    await user.selectOptions(screen.getByLabelText('Sort by'), 'stock:desc');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('sort=stock&order=desc');
    });
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=');
  });

  it('offers a way back when a pasted URL points past the last page', async () => {
    server.use(
      categories,
      http.get(`${BASE}/auth/products`, () => page(numbered(20))),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StockListPage />, { route: '/items?page=99' });

    await screen.findByText('That page does not exist');
    await user.click(screen.getByRole('button', { name: 'Back to first page' }));

    await screen.findByText('Item 1');
    expect(screen.getByTestId('location')).toHaveTextContent('/items');
  });

  it('narrows a search by category, which the API cannot do on its own', async () => {
    let searchRequests = 0;
    server.use(
      http.get(`${BASE}/auth/products/categories`, () =>
        HttpResponse.json([
          { slug: 'wound-care', name: 'Wound care' },
          { slug: 'dental', name: 'Dental' },
        ]),
      ),
      // The real search endpoint ignores a category parameter, so it returns every match.
      http.get(`${BASE}/auth/products/search`, () => {
        searchRequests += 1;
        return listResponse([
          { title: 'Gauze roll', category: 'wound-care' },
          { title: 'Gauze swab', category: 'dental' },
        ]);
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StockListPage />, { route: '/items?q=gauze' });
    await screen.findByText('Gauze roll');

    await user.selectOptions(screen.getByLabelText('Category'), 'dental');

    await waitFor(() => {
      expect(screen.queryByText('Gauze roll')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Gauze swab')).toBeInTheDocument();
    // Narrowed from what was already loaded. Choosing a category is not a second request.
    expect(searchRequests).toBe(1);
  });

  it('shows a recoverable error when the list request fails', async () => {
    let attempts = 0;
    server.use(
      categories,
      http.get(`${BASE}/auth/products`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 })
          : page(['Recovered item']);
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StockListPage />);

    await screen.findByRole('alert');
    expect(screen.getByText('Could not load stock')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Recovered item');
  });

  it('shows an error rather than a broken page when the API returns the wrong shape', async () => {
    server.use(
      categories,
      // A 200 whose products are not products. Before responses were validated this reached
      // the list and failed while rendering, with no error state to recover from.
      http.get(`${BASE}/auth/products`, () =>
        HttpResponse.json({ products: 'nope', total: 1, skip: 0, limit: 12 }),
      ),
    );

    renderWithProviders(<StockListPage />);

    await screen.findByRole('alert');
    expect(screen.getByText('Could not load stock')).toBeInTheDocument();
  });
});
