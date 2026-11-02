import { useQuery } from '@tanstack/react-query';
import { inventoryApi, queryKeys } from '@/api/inventory';
import type { VehicleQuery } from '@/domain/types';

export function useDealerships() {
  return useQuery({
    queryKey: queryKeys.dealerships,
    queryFn: async () => (await inventoryApi.listDealerships()).items,
  });
}

export function useVehicles(query: VehicleQuery) {
  return useQuery({
    queryKey: queryKeys.vehicleList(query),
    queryFn: () => inventoryApi.listVehicles(query),
    // Keep the current page on screen while the next loads, but never show another dealership's.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2].dealershipId === query.dealershipId ? previous : undefined,
  });
}

export function useFilterOptions(dealershipId: string) {
  return useQuery({
    queryKey: queryKeys.filterOptions(dealershipId),
    queryFn: () => inventoryApi.getFilterOptions(dealershipId),
  });
}

export function useSummary(dealershipId: string) {
  return useQuery({
    queryKey: queryKeys.summary(dealershipId),
    queryFn: () => inventoryApi.getSummary(dealershipId),
  });
}
