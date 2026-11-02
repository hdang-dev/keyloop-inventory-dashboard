import { useMemo } from 'react';
import {
  DEFAULT_VEHICLE_SORT,
  VEHICLE_SORTS,
  type VehicleQuery,
  type VehicleSort,
} from '@/domain/types';
import { navigateToSearch, useLocationSearch } from '@/lib/urlState';

export const PAGE_SIZE = 20;

export type StockTab = 'all' | 'aging';

export interface InventoryParams {
  dealershipId?: string;
  tab: StockTab;
  make?: string;
  model?: string;
  minDays?: number;
  maxDays?: number;
  sort: VehicleSort;
  page: number;
  vehicleId?: string;
}

function toWholeNumber(value: string | null): number | undefined {
  return value !== null && /^\d+$/.test(value) ? Number(value) : undefined;
}

/** The URL can be edited by hand, so anything the API would reject falls back to its default. */
export function parseInventoryParams(search: string): InventoryParams {
  const query = new URLSearchParams(search);
  const make = query.get('make') || undefined;
  const sort = query.get('sort') as VehicleSort | null;
  const minDays = toWholeNumber(query.get('minDays'));
  const maxDays = toWholeNumber(query.get('maxDays'));
  const isRangeValid = minDays === undefined || maxDays === undefined || minDays <= maxDays;

  return {
    dealershipId: query.get('dealershipId') || undefined,
    tab: query.get('tab') === 'aging' ? 'aging' : 'all',
    make,
    model: make ? query.get('model') || undefined : undefined,
    minDays: isRangeValid ? minDays : undefined,
    maxDays: isRangeValid ? maxDays : undefined,
    sort: sort && VEHICLE_SORTS.includes(sort) ? sort : DEFAULT_VEHICLE_SORT,
    page: Math.max(toWholeNumber(query.get('page')) ?? 1, 1),
    vehicleId: query.get('vehicleId') || undefined,
  };
}

export function serializeInventoryParams(params: InventoryParams): string {
  const query = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined) query.set(key, String(value));
  };
  set('dealershipId', params.dealershipId);
  set('tab', params.tab === 'all' ? undefined : params.tab);
  set('make', params.make);
  set('model', params.model);
  set('minDays', params.minDays);
  set('maxDays', params.maxDays);
  set('sort', params.sort === DEFAULT_VEHICLE_SORT ? undefined : params.sort);
  set('page', params.page === 1 ? undefined : params.page);
  set('vehicleId', params.vehicleId);
  return query.toString();
}

export function toVehicleQuery(params: InventoryParams, dealershipId: string): VehicleQuery {
  const { make, model, minDays, maxDays, sort, page } = params;
  return {
    dealershipId,
    make,
    model,
    minDays,
    maxDays,
    agingOnly: params.tab === 'aging' ? true : undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };
}

export function useInventoryParams(): InventoryParams {
  const search = useLocationSearch();
  return useMemo(() => parseInventoryParams(search), [search]);
}

function update(patch: Partial<InventoryParams>, options?: { replace?: boolean }) {
  const current = parseInventoryParams(window.location.search);
  navigateToSearch(serializeInventoryParams({ ...current, ...patch }), options);
}

const NO_FILTERS = {
  make: undefined,
  model: undefined,
  minDays: undefined,
  maxDays: undefined,
};

export const inventoryNavigation = {
  /** Filters and open panels belong to one dealership, so changing it starts clean. */
  selectDealership(dealershipId: string) {
    navigateToSearch(
      serializeInventoryParams({
        dealershipId,
        tab: 'all',
        sort: DEFAULT_VEHICLE_SORT,
        page: 1,
      }),
    );
  },

  /** Each tab opens on its default order, so the Aging tab always starts oldest first. */
  selectTab(tab: StockTab) {
    update({ tab, sort: DEFAULT_VEHICLE_SORT, page: 1 });
  },

  setFilters(
    filters: Partial<Pick<InventoryParams, 'make' | 'model' | 'minDays' | 'maxDays'>>,
    options?: { replace?: boolean },
  ) {
    update({ ...filters, page: 1 }, options);
  },

  resetFilters() {
    update({ ...NO_FILTERS, page: 1 });
  },

  setSort(sort: VehicleSort) {
    update({ sort, page: 1 });
  },

  setPage(page: number, options?: { replace?: boolean }) {
    update({ page }, options);
  },
};

export function hasActiveFilters({ make, minDays, maxDays }: InventoryParams): boolean {
  return make !== undefined || minDays !== undefined || maxDays !== undefined;
}
