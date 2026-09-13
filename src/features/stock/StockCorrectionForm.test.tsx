import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { server } from '../../test/server';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ItemDetailPage } from './ItemDetailPage';

const BASE = 'https://dummyjson.com';

const product = {
  id: 7,
  title: 'Sterile gauze pad',
  category: 'wound-care',
  stock: 40,
  price: 2.5,
  thumbnail: 'https://cdn.dummyjson.com/products/images/7/thumbnail.png',
  description: 'A dressing.',
  rating: 4,
};

function renderDetail() {
  return renderWithProviders(<ItemDetailPage />, { route: '/items/7', path: '/items/:id' });
}

/**
 * The form starts closed. jsdom does not implement `inert`, so a test could type into the
 * collapsed field and pass without ever opening it; going through the toggle keeps every test on
 * the path a person actually takes.
 */
async function openCorrection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Correct stock count' }));
}

describe('StockCorrectionForm', () => {
  it('saves a new count and keeps it on screen afterwards', async () => {
    // DummyJSON accepts the PUT but does not persist it, so the saved value has
    // to survive without a refetch putting the old number back.
    server.use(
      http.get(`${BASE}/auth/products/7`, () => HttpResponse.json(product)),
      http.put(`${BASE}/auth/products/7`, async ({ request }) => {
        const body = (await request.json()) as { stock: number };
        return HttpResponse.json({ ...product, stock: body.stock });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderDetail();
    await screen.findByRole('heading', { name: 'Sterile gauze pad' });
    await openCorrection(user);

    const input = screen.getByLabelText('Stock count');
    await user.clear(input);
    await user.type(input, '37');
    await user.click(screen.getByRole('button', { name: 'Save new count' }));

    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent('Stock is now 37');
    // The headline figure reflects the save rather than reverting to 40.
    await waitFor(() => {
      expect(screen.getByText('Stock').nextElementSibling).toHaveTextContent('37');
    });
  });

  it('cannot be submitted twice while a save is in flight', async () => {
    let putCount = 0;
    server.use(
      http.get(`${BASE}/auth/products/7`, () => HttpResponse.json(product)),
      http.put(`${BASE}/auth/products/7`, async () => {
        putCount += 1;
        await delay(200);
        return HttpResponse.json({ ...product, stock: 12 });
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderDetail();
    await screen.findByRole('heading', { name: 'Sterile gauze pad' });
    await openCorrection(user);

    const input = screen.getByLabelText('Stock count');
    await user.clear(input);
    await user.type(input, '12');

    const save = screen.getByRole('button', { name: 'Save new count' });
    await user.click(save);
    expect(save).toBeDisabled();
    await user.click(save);

    await screen.findByRole('status');
    expect(putCount).toBe(1);
  });

  it('keeps the typed value and explains the failure when saving fails', async () => {
    server.use(
      http.get(`${BASE}/auth/products/7`, () => HttpResponse.json(product)),
      http.put(`${BASE}/auth/products/7`, () =>
        HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    const user = userEvent.setup({ delay: null });
    renderDetail();
    await screen.findByRole('heading', { name: 'Sterile gauze pad' });
    await openCorrection(user);

    const input = screen.getByLabelText('Stock count');
    await user.clear(input);
    await user.type(input, '31');
    await user.click(screen.getByRole('button', { name: 'Save new count' }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Internal Server Error');
    // Losing the count someone just walked the ward to establish is not acceptable.
    expect(input).toHaveValue(31);
    expect(screen.getByRole('button', { name: 'Save new count' })).toBeEnabled();
  });

  it('stays closed until the toggle opens it, then puts focus in the count', async () => {
    server.use(http.get(`${BASE}/auth/products/7`, () => HttpResponse.json(product)));

    const user = userEvent.setup({ delay: null });
    renderDetail();
    await screen.findByRole('heading', { name: 'Sterile gauze pad' });

    const toggle = screen.getByRole('button', { name: 'Correct stock count' });
    const field = screen.getByLabelText('Stock count');

    // Closed: announced as collapsed, and the field is inside an inert region, so it is out of
    // the tab order and hidden from assistive technology rather than merely squashed to 0px.
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(field.closest('[inert]')).not.toBeNull();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(field.closest('[inert]')).toBeNull();
    expect(field).toHaveFocus();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(field.closest('[inert]')).not.toBeNull();
  });

  it('offers a way back when a shared link points at a missing item', async () => {
    // Retrying a 404 can only fail again, so this path must not offer a retry.
    server.use(
      http.get(`${BASE}/auth/products/7`, () =>
        HttpResponse.json({ message: "Product with id '7' not found" }, { status: 404 }),
      ),
    );

    renderDetail();

    await screen.findByText('Item not found');
    expect(screen.getByRole('link', { name: 'Browse all stock' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it.each([
    ['-4', 'whole number'],
    ['2.5', 'whole number'],
    ['', 'whole number'],
    ['40', 'already the recorded count'],
  ])('rejects %s without calling the API', async (input, expected) => {
    let putCalled = false;
    server.use(
      http.get(`${BASE}/auth/products/7`, () => HttpResponse.json(product)),
      http.put(`${BASE}/auth/products/7`, () => {
        putCalled = true;
        return HttpResponse.json(product);
      }),
    );

    const user = userEvent.setup({ delay: null });
    renderDetail();
    await screen.findByRole('heading', { name: 'Sterile gauze pad' });
    await openCorrection(user);

    const field = screen.getByLabelText('Stock count');
    await user.clear(field);
    if (input) await user.type(field, input);
    await user.click(screen.getByRole('button', { name: 'Save new count' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(putCalled).toBe(false);
  });
});
