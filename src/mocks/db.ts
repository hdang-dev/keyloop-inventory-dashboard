import { getDaysInStock, isAgingStock } from '@/domain/aging';
import {
  DEFAULT_VEHICLE_SORT,
  type ActionHistoryEntry,
  type Dealership,
  type FilterOptions,
  type Page,
  type SaveActionInput,
  type VehicleAction,
  type VehicleDetail,
  type VehicleListItem,
  type VehicleQuery,
  type VehicleSort,
  type VehicleSummary,
} from '@/domain/types';
import type { SeedData, VehicleRecord } from '@/mocks/data/seed';

const STORAGE_KEY = 'inventory-dashboard.mock-actions.v1';
const MOCK_USER = 'Demo Manager';
const DEFAULT_PAGE_SIZE = 20;

interface StoredActions {
  [vehicleId: string]: { current: VehicleAction; history: ActionHistoryEntry[] };
}

interface DbOptions extends SeedData {
  now?: () => Date;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

export type SaveResult =
  { ok: true; action: VehicleAction } | { ok: false; currentAction: VehicleAction | null };

export type Db = ReturnType<typeof createDb>;

const COMPARATORS: Record<VehicleSort, (a: VehicleListItem, b: VehicleListItem) => number> = {
  'daysInStock:desc': (a, b) => b.daysInStock - a.daysInStock,
  'daysInStock:asc': (a, b) => a.daysInStock - b.daysInStock,
  'make:asc': (a, b) => a.make.localeCompare(b.make),
  'make:desc': (a, b) => b.make.localeCompare(a.make),
  'model:asc': (a, b) => a.model.localeCompare(b.model),
  'model:desc': (a, b) => b.model.localeCompare(a.model),
};

export function createDb({
  dealerships,
  vehicles,
  now = () => new Date(),
  storage = localStorage,
}: DbOptions) {
  // Read on every call rather than caching, so a save in one tab is visible to the next
  // request from another tab. That is what makes version conflicts reproducible.
  function readActions(): StoredActions {
    try {
      return JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as StoredActions;
    } catch {
      return {};
    }
  }

  function baseFields(vehicle: VehicleRecord) {
    const { id, vin, make, model, stockedAt } = vehicle;
    const timezone = dealerships.find(({ id }) => id === vehicle.dealershipId)?.timezone ?? 'UTC';
    const daysInStock = getDaysInStock(stockedAt, timezone, now());
    return { id, vin, make, model, stockedAt, daysInStock, isAging: isAgingStock(daysInStock) };
  }

  function listItems(dealershipId: string): VehicleListItem[] {
    const actions = readActions();
    return vehicles
      .filter((vehicle) => vehicle.dealershipId === dealershipId && vehicle.soldAt === null)
      .map((vehicle) => {
        const current = actions[vehicle.id]?.current;
        return {
          ...baseFields(vehicle),
          currentAction: current
            ? {
                status: current.status,
                updatedAt: current.updatedAt,
                updatedBy: current.updatedBy,
              }
            : null,
        };
      });
  }

  return {
    listDealerships(): Dealership[] {
      return dealerships;
    },

    hasDealership(id: string): boolean {
      return dealerships.some((dealership) => dealership.id === id);
    },

    listVehicles(query: VehicleQuery): Page<VehicleListItem> {
      const {
        dealershipId,
        make,
        model,
        minDays,
        maxDays,
        agingOnly,
        sort = DEFAULT_VEHICLE_SORT,
        page = 1,
        pageSize = DEFAULT_PAGE_SIZE,
      } = query;

      const matches = listItems(dealershipId)
        .filter(
          (item) =>
            (make === undefined || item.make === make) &&
            (model === undefined || item.model === model) &&
            (minDays === undefined || item.daysInStock >= minDays) &&
            (maxDays === undefined || item.daysInStock <= maxDays) &&
            (!agingOnly || item.isAging),
        )
        // The id tie-break keeps page contents stable when many rows share a sort value.
        .sort((a, b) => COMPARATORS[sort](a, b) || a.id.localeCompare(b.id));

      const start = (page - 1) * pageSize;
      return {
        items: matches.slice(start, start + pageSize),
        page,
        pageSize,
        total: matches.length,
      };
    },

    filterOptions(dealershipId: string): FilterOptions {
      const modelsByMake = new Map<string, Set<string>>();
      for (const { dealershipId: owner, make, model, soldAt } of vehicles) {
        if (owner !== dealershipId || soldAt !== null) continue;
        modelsByMake.set(make, (modelsByMake.get(make) ?? new Set<string>()).add(model));
      }
      return {
        makes: [...modelsByMake.entries()]
          .map(([make, models]) => ({ make, models: [...models].sort() }))
          .sort((a, b) => a.make.localeCompare(b.make)),
      };
    },

    summary(dealershipId: string): VehicleSummary {
      const items = listItems(dealershipId);
      return { total: items.length, aging: items.filter((item) => item.isAging).length };
    },

    getVehicle(id: string): VehicleDetail | null {
      const vehicle = vehicles.find((candidate) => candidate.id === id);
      if (!vehicle || vehicle.soldAt !== null) return null;
      const stored = readActions()[id];
      return {
        ...baseFields(vehicle),
        currentAction: stored?.current ?? null,
        history: stored?.history ?? [],
      };
    },

    /** Compares versions, then writes the action and its history entry together. */
    saveAction(id: string, input: SaveActionInput): SaveResult {
      const actions = readActions();
      const stored = actions[id];
      const currentVersion = stored?.current.version ?? 0;
      if (input.version !== currentVersion) {
        return { ok: false, currentAction: stored?.current ?? null };
      }

      const fields = {
        status: input.status,
        note: input.note?.trim() || null,
        updatedAt: now().toISOString(),
        updatedBy: MOCK_USER,
      };
      const action: VehicleAction = { ...fields, version: currentVersion + 1 };
      const entry: ActionHistoryEntry = { ...fields, id: crypto.randomUUID() };

      actions[id] = { current: action, history: [entry, ...(stored?.history ?? [])] };
      storage.setItem(STORAGE_KEY, JSON.stringify(actions));
      return { ok: true, action };
    },
  };
}
