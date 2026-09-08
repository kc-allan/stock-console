import { setupServer } from 'msw/node';

/**
 * Handlers are declared per test. Going through MSW rather than stubbing fetch
 * means the tests exercise the real request layer, including query string
 * construction and response timing.
 */
export const server = setupServer();
