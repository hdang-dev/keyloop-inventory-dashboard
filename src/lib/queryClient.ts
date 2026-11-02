import { QueryClient } from '@tanstack/react-query';

const REFRESH_INTERVAL_MS = 60_000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: REFRESH_INTERVAL_MS,
        refetchOnWindowFocus: true,
        // Failures surface straight away with a retry button, and polling recovers on its own.
        retry: false,
      },
    },
  });
}
