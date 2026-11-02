import { setupWorker } from 'msw/browser';
import { generateSeed } from '@/mocks/data/seed';
import { createDb } from '@/mocks/db';
import { createHandlers } from '@/mocks/handlers';
import { armMockErrorFromUrl } from '@/mocks/mockError';

export async function startMockApi() {
  armMockErrorFromUrl();
  const db = createDb(generateSeed(new Date()));
  const worker = setupWorker(...createHandlers(db, { latency: [200, 600] }));
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}
