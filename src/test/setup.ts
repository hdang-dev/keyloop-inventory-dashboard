import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { disarmMockError } from '@/mocks/mockError';
import { server } from '@/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  server.events.removeAllListeners();
  localStorage.clear();
  disarmMockError();
  window.history.replaceState(null, '', '/');
});

afterAll(() => server.close());
