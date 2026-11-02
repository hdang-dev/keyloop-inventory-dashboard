export const ACTION_STATUSES = [
  'PRICE_REDUCTION_PLANNED',
  'SEND_TO_AUCTION',
  'TRANSFER_TO_ANOTHER_SITE',
  'NO_ACTION_YET',
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  PRICE_REDUCTION_PLANNED: 'Price Reduction Planned',
  SEND_TO_AUCTION: 'Send to Auction',
  TRANSFER_TO_ANOTHER_SITE: 'Transfer to Another Site',
  NO_ACTION_YET: 'No Action Yet',
};

export const ACTION_NOTE_MAX_LENGTH = 500;

export interface Dealership {
  id: string;
  name: string;
  timezone: string;
}

export interface ActionSummary {
  status: ActionStatus;
  updatedAt: string;
  updatedBy: string;
}

export interface VehicleAction extends ActionSummary {
  note: string | null;
  version: number;
}

export interface ActionHistoryEntry extends ActionSummary {
  id: string;
  note: string | null;
}

interface VehicleBase {
  id: string;
  vin: string;
  make: string;
  model: string;
  stockedAt: string;
  daysInStock: number;
  isAging: boolean;
}

export interface VehicleListItem extends VehicleBase {
  currentAction: ActionSummary | null;
}

export interface VehicleDetail extends VehicleBase {
  currentAction: VehicleAction | null;
  history: ActionHistoryEntry[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VehicleSummary {
  total: number;
  aging: number;
}

export interface FilterOptions {
  makes: { make: string; models: string[] }[];
}

export const VEHICLE_SORTS = [
  'daysInStock:desc',
  'daysInStock:asc',
  'make:asc',
  'make:desc',
  'model:asc',
  'model:desc',
] as const;

export type VehicleSort = (typeof VEHICLE_SORTS)[number];

export const DEFAULT_VEHICLE_SORT: VehicleSort = 'daysInStock:desc';

export interface VehicleQuery {
  dealershipId: string;
  make?: string;
  model?: string;
  minDays?: number;
  maxDays?: number;
  agingOnly?: boolean;
  sort?: VehicleSort;
  page?: number;
  pageSize?: number;
}

export interface SaveActionInput {
  status: ActionStatus;
  note?: string | null;
  version: number;
}
