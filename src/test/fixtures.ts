import type { Dealership } from '@/domain/types';
import type { VehicleRecord } from '@/mocks/data/seed';
import { createDb } from '@/mocks/db';
import { createHandlers } from '@/mocks/handlers';
import { server } from '@/mocks/server';

export const NOW = new Date('2026-06-15T12:00:00Z');

export const SAIGON: Dealership = {
  id: 'saigon',
  name: 'Saigon Motors',
  timezone: 'Asia/Ho_Chi_Minh',
};

export const LONDON: Dealership = {
  id: 'london',
  name: 'London Motors',
  timezone: 'Europe/London',
};

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

function vehicle(
  id: string,
  make: string,
  model: string,
  days: number,
  dealershipId = SAIGON.id,
): VehicleRecord {
  return {
    id,
    vin: `VIN${id.toUpperCase()}`,
    dealershipId,
    make,
    model,
    stockedAt: daysAgo(days),
    soldAt: null,
  };
}

export const VEHICLES: VehicleRecord[] = [
  vehicle('fresh', 'Toyota', 'Camry', 5),
  vehicle('day90', 'Toyota', 'Corolla', 90),
  vehicle('day91', 'Honda', 'Civic', 91),
  vehicle('old', 'Honda', 'Accord', 150),
  vehicle('oldest', 'Ford', 'Focus', 200),
  { ...vehicle('sold', 'Ford', 'Ranger', 120), soldAt: daysAgo(1) },
  vehicle('uk', 'BMW', 'X3', 100, LONDON.id),
];

/** Serves the fixture stock through the real mock handlers for one test. */
export function useMockApi(vehicles: VehicleRecord[] = VEHICLES) {
  const db = createDb({ dealerships: [SAIGON, LONDON], vehicles, now: () => NOW });
  server.use(...createHandlers(db));
  return db;
}
