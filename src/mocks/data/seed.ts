import { faker } from '@faker-js/faker/locale/en';
import type { Dealership } from '@/domain/types';

export interface VehicleRecord {
  id: string;
  vin: string;
  dealershipId: string;
  make: string;
  model: string;
  stockedAt: string;
  soldAt: string | null;
}

export interface SeedData {
  dealerships: Dealership[];
  vehicles: VehicleRecord[];
}

const SEED = 20260190;
const VEHICLE_COUNT = 1000;
const MAX_DAYS_IN_STOCK = 200;
const SOLD_RATIO = 0.03;

const DEALERSHIPS: Omit<Dealership, 'id'>[] = [
  { name: 'Saigon Central Motors', timezone: 'Asia/Ho_Chi_Minh' },
  { name: 'Thames Valley Motors', timezone: 'Europe/London' },
  { name: 'Hudson Auto Group', timezone: 'America/New_York' },
];

const CATALOGUE: Record<string, string[]> = {
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Hilux'],
  Honda: ['Civic', 'Accord', 'CR-V'],
  Ford: ['Focus', 'Ranger', 'Puma', 'Kuga'],
  BMW: ['3 Series', '5 Series', 'X3'],
  Volkswagen: ['Golf', 'Polo', 'Tiguan'],
  Hyundai: ['Tucson', 'Santa Fe', 'i30'],
  Kia: ['Sportage', 'Ceed', 'Sorento'],
  Mercedes: ['A-Class', 'C-Class', 'GLC'],
};

/**
 * Deterministic demo stock. Stocking dates are relative to `now` so the demo keeps the same
 * spread of ages whenever it runs, while ids stay stable for actions saved in localStorage.
 */
export function generateSeed(now: Date): SeedData {
  faker.seed(SEED);

  const dealerships = DEALERSHIPS.map((dealership) => ({
    id: faker.string.uuid(),
    ...dealership,
  }));

  const vehicles = Array.from({ length: VEHICLE_COUNT }, (): VehicleRecord => {
    const make = faker.helpers.arrayElement(Object.keys(CATALOGUE));
    const daysAgo = faker.number.int({ min: 0, max: MAX_DAYS_IN_STOCK });
    const hour = daysAgo === 0 ? 0 : faker.number.int({ min: 0, max: 23 });
    const stockedAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, hour),
    );
    const isSold = faker.number.float({ min: 0, max: 1 }) < SOLD_RATIO;

    return {
      id: faker.string.uuid(),
      vin: faker.vehicle.vin(),
      dealershipId: faker.helpers.arrayElement(dealerships).id,
      make,
      model: faker.helpers.arrayElement(CATALOGUE[make] as string[]),
      stockedAt: stockedAt.toISOString(),
      soldAt: isSold ? now.toISOString() : null,
    };
  });

  return { dealerships, vehicles };
}
