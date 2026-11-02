import { apiRequest } from '@/api/client';
import type {
  Dealership,
  FilterOptions,
  Page,
  SaveActionInput,
  VehicleAction,
  VehicleDetail,
  VehicleListItem,
  VehicleQuery,
  VehicleSummary,
} from '@/domain/types';

function toSearchParams(query: VehicleQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export const inventoryApi = {
  listDealerships: () => apiRequest<{ items: Dealership[] }>('/dealerships'),

  listVehicles: (query: VehicleQuery) =>
    apiRequest<Page<VehicleListItem>>(`/vehicles?${toSearchParams(query)}`),

  getFilterOptions: (dealershipId: string) =>
    apiRequest<FilterOptions>(`/vehicles/filter-options?${toSearchParams({ dealershipId })}`),

  getSummary: (dealershipId: string) =>
    apiRequest<VehicleSummary>(`/vehicles/summary?${toSearchParams({ dealershipId })}`),

  getVehicle: (id: string) => apiRequest<VehicleDetail>(`/vehicles/${encodeURIComponent(id)}`),

  saveAction: (id: string, input: SaveActionInput) =>
    apiRequest<{ currentAction: VehicleAction }>(`/vehicles/${encodeURIComponent(id)}/action`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
};

export const queryKeys = {
  dealerships: ['dealerships'] as const,
  vehicleLists: ['vehicles', 'list'] as const,
  vehicleList: (query: VehicleQuery) => ['vehicles', 'list', query] as const,
  filterOptions: (dealershipId: string) => ['vehicles', 'filter-options', dealershipId] as const,
  summary: (dealershipId: string) => ['vehicles', 'summary', dealershipId] as const,
  vehicle: (id: string) => ['vehicles', 'detail', id] as const,
};
