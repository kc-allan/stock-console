import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDER, DEFAULT_SORT, parseStockParams, toSearchParams } from './stockParams';

const parse = (query: string) => parseStockParams(new URLSearchParams(query));

describe('parseStockParams', () => {
  it('falls back to defaults for an empty URL', () => {
    expect(parse('')).toEqual({
      q: '',
      category: '',
      sort: DEFAULT_SORT,
      order: DEFAULT_ORDER,
      page: 1,
    });
  });

  it.each(['page=0', 'page=-3', 'page=abc', 'page=2.5', 'page='])(
    'clamps an unusable page (%s) to 1',
    (query) => {
      expect(parse(query).page).toBe(1);
    },
  );

  it('rejects a sort field the API does not support', () => {
    // Otherwise a hand-edited URL would be forwarded to DummyJSON as sortBy.
    expect(parse('sort=__proto__').sort).toBe(DEFAULT_SORT);
    expect(parse('sort=rating').sort).toBe(DEFAULT_SORT);
  });

  it('keeps a supported sort field and order', () => {
    expect(parse('sort=stock&order=desc')).toMatchObject({ sort: 'stock', order: 'desc' });
  });

  it('keeps a category alongside a search', () => {
    // Both are honoured now: the search runs on the server and the category is applied to its
    // results in the browser, so a link carrying both reproduces the same narrowed view.
    expect(parse('q=syrup&category=beauty')).toMatchObject({ q: 'syrup', category: 'beauty' });
  });

  it('round-trips through the URL without inventing parameters', () => {
    const params = parse('q=gauze&sort=stock&order=desc&page=4');
    expect(toSearchParams(params).toString()).toBe('q=gauze&sort=stock&order=desc&page=4');
  });

  it('omits defaults so a shared link carries only real choices', () => {
    expect(toSearchParams(parse('page=1&sort=title&order=asc')).toString()).toBe('');
  });
});
