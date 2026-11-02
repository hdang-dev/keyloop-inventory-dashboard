import { setupServer } from 'msw/node';

/** Test server. Each test registers handlers for its own database with `server.use`. */
export const server = setupServer();
