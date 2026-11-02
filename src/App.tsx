import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { createQueryClient } from '@/lib/queryClient';

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <InventoryPage />
    </QueryClientProvider>
  );
}
