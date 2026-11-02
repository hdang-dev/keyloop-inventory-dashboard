import { createQueryClient } from '@/lib/queryClient';

describe('createQueryClient', () => {
  it('keeps data fresh by polling every 60 seconds and refetching on tab focus', () => {
    const { queries } = createQueryClient().getDefaultOptions();
    expect(queries?.refetchInterval).toBe(60_000);
    expect(queries?.refetchOnWindowFocus).toBe(true);
  });
});
