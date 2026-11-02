import { ApiError } from '@/api/client';
import { inventoryApi } from '@/api/inventory';
import type { VehicleQuery } from '@/domain/types';
import { generateSeed } from '@/mocks/data/seed';
import { createDb } from '@/mocks/db';
import { armMockError } from '@/mocks/mockError';
import { LONDON, NOW, SAIGON, useMockApi } from '@/test/fixtures';

const list = (query: Partial<VehicleQuery> = {}) =>
  inventoryApi.listVehicles({ dealershipId: SAIGON.id, ...query });

const ids = async (query: Partial<VehicleQuery> = {}) =>
  (await list(query)).items.map(({ id }) => id);

async function apiError(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => new Error('Expected the request to fail'),
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('mock API', () => {
  beforeEach(() => {
    useMockApi();
  });

  describe('GET /vehicles', () => {
    it('lists one dealership, oldest first, without sold vehicles', async () => {
      expect(await ids()).toEqual(['oldest', 'old', 'day91', 'day90', 'fresh']);
    });

    it('returns calculated age fields', async () => {
      const { items } = await list();
      expect(items.find(({ id }) => id === 'day90')).toMatchObject({
        daysInStock: 90,
        isAging: false,
      });
      expect(items.find(({ id }) => id === 'day91')).toMatchObject({
        daysInStock: 91,
        isAging: true,
      });
    });

    it('filters by make and model', async () => {
      expect(await ids({ make: 'Honda' })).toEqual(['old', 'day91']);
      expect(await ids({ make: 'Honda', model: 'Civic' })).toEqual(['day91']);
    });

    it('filters by an inclusive days-in-stock range', async () => {
      expect(await ids({ minDays: 90, maxDays: 150 })).toEqual(['old', 'day91', 'day90']);
    });

    it('filters to aging stock, excluding day 90', async () => {
      expect(await ids({ agingOnly: true })).toEqual(['oldest', 'old', 'day91']);
    });

    it('agrees with the row flag when filtering by age', async () => {
      const { items } = await list({ minDays: 91 });
      expect(items.every((item) => item.isAging)).toBe(true);
      expect((await list({ agingOnly: true })).total).toBe(items.length);
    });

    it.each([
      ['daysInStock:asc', ['fresh', 'day90', 'day91', 'old', 'oldest']],
      ['make:asc', ['oldest', 'day91', 'old', 'day90', 'fresh']],
      ['model:desc', ['oldest', 'day90', 'day91', 'fresh', 'old']],
    ] as const)('sorts by %s', async (sort, expected) => {
      expect(await ids({ sort })).toEqual(expected);
    });

    it('pages results and reports the total', async () => {
      expect(await list({ page: 2, pageSize: 2 })).toMatchObject({
        page: 2,
        pageSize: 2,
        total: 5,
        items: [{ id: 'day91' }, { id: 'day90' }],
      });
    });

    it.each([
      [{ pageSize: 101 }],
      [{ page: 0 }],
      [{ minDays: 10, maxDays: 5 }],
      [{ minDays: -1 }],
      [{ sort: 'vin:asc' as never }],
      [{ dealershipId: 'nope' }],
    ])('rejects invalid query %j', async (query) => {
      const error = await apiError(list(query));
      expect([error.status, error.code]).toEqual([400, 'VALIDATION_ERROR']);
    });
  });

  it('GET /dealerships lists dealerships with time zones', async () => {
    expect((await inventoryApi.listDealerships()).items).toEqual([SAIGON, LONDON]);
  });

  it('GET /vehicles/filter-options groups in-stock models by make', async () => {
    expect(await inventoryApi.getFilterOptions(SAIGON.id)).toEqual({
      makes: [
        { make: 'Ford', models: ['Focus'] },
        { make: 'Honda', models: ['Accord', 'Civic'] },
        { make: 'Toyota', models: ['Camry', 'Corolla'] },
      ],
    });
  });

  it('GET /vehicles/summary counts in-stock and aging vehicles', async () => {
    expect(await inventoryApi.getSummary(SAIGON.id)).toEqual({ total: 5, aging: 3 });
    expect(await inventoryApi.getSummary(LONDON.id)).toEqual({ total: 1, aging: 1 });
    expect((await apiError(inventoryApi.getSummary('nope'))).status).toBe(400);
  });

  describe('GET /vehicles/:id', () => {
    it('returns detail with no action yet', async () => {
      expect(await inventoryApi.getVehicle('day91')).toMatchObject({
        id: 'day91',
        currentAction: null,
        history: [],
      });
    });

    it.each(['missing', 'sold'])('returns 404 for %s vehicle', async (id) => {
      const error = await apiError(inventoryApi.getVehicle(id));
      expect([error.status, error.code]).toEqual([404, 'NOT_FOUND']);
    });
  });

  describe('PUT /vehicles/:id/action', () => {
    const valid = { status: 'SEND_TO_AUCTION', note: 'Too old', version: 0 } as const;

    it('saves version 1, sets the user on the server and records history', async () => {
      const { currentAction } = await inventoryApi.saveAction('day91', valid);
      expect(currentAction).toMatchObject({
        status: 'SEND_TO_AUCTION',
        note: 'Too old',
        version: 1,
        updatedBy: 'Demo Manager',
      });

      const detail = await inventoryApi.getVehicle('day91');
      expect(detail.currentAction).toEqual(currentAction);
      expect(detail.history).toHaveLength(1);
      const { items } = await list();
      expect(items.find(({ id }) => id === 'day91')?.currentAction?.status).toBe('SEND_TO_AUCTION');
    });

    it('ignores a client-supplied user', async () => {
      const body = { ...valid, updatedBy: 'Mallory' };
      const { currentAction } = await inventoryApi.saveAction('day91', body);
      expect(currentAction.updatedBy).toBe('Demo Manager');
    });

    it('keeps history newest first', async () => {
      await inventoryApi.saveAction('day91', valid);
      await inventoryApi.saveAction('day91', { status: 'NO_ACTION_YET', version: 1 });
      const { history, currentAction } = await inventoryApi.getVehicle('day91');
      expect(history.map(({ status }) => status)).toEqual(['NO_ACTION_YET', 'SEND_TO_AUCTION']);
      expect(currentAction?.version).toBe(2);
    });

    it('stores a blank note as null', async () => {
      const { currentAction } = await inventoryApi.saveAction('day91', { ...valid, note: '   ' });
      expect(currentAction.note).toBeNull();
    });

    it('returns 404 for an unknown vehicle', async () => {
      const error = await apiError(inventoryApi.saveAction('missing', valid));
      expect([error.status, error.code]).toEqual([404, 'NOT_FOUND']);
    });

    it('returns 400 NOT_AGING on day 90', async () => {
      const error = await apiError(inventoryApi.saveAction('day90', valid));
      expect([error.status, error.code]).toEqual([400, 'NOT_AGING']);
    });

    it('checks aging before the body', async () => {
      const bad = { status: 'NOPE', version: 0 } as never;
      expect((await apiError(inventoryApi.saveAction('day90', bad))).code).toBe('NOT_AGING');
    });

    it.each([
      [{ status: 'NOPE', version: 0 }],
      [{ status: 'SEND_TO_AUCTION' }],
      [{ status: 'SEND_TO_AUCTION', version: -1 }],
      [{ status: 'SEND_TO_AUCTION', version: 0, note: 'x'.repeat(501) }],
    ])('returns 400 VALIDATION_ERROR for %j', async (body) => {
      const error = await apiError(inventoryApi.saveAction('day91', body as never));
      expect([error.status, error.code]).toEqual([400, 'VALIDATION_ERROR']);
    });

    it('accepts a note of exactly 500 characters', async () => {
      const note = 'x'.repeat(500);
      const { currentAction } = await inventoryApi.saveAction('day91', { ...valid, note });
      expect(currentAction.note).toBe(note);
    });

    it('returns 409 with the latest action on a stale version, without writing', async () => {
      const { currentAction } = await inventoryApi.saveAction('day91', valid);
      const error = await apiError(
        inventoryApi.saveAction('day91', { status: 'NO_ACTION_YET', version: 0 }),
      );
      expect([error.status, error.code]).toEqual([409, 'VERSION_CONFLICT']);
      expect(error.currentAction).toEqual(currentAction);
      expect((await inventoryApi.getVehicle('day91')).history).toHaveLength(1);
    });

    it('persists across database instances, as between tabs and reloads', async () => {
      await inventoryApi.saveAction('day91', valid);
      useMockApi();
      expect((await inventoryApi.getVehicle('day91')).currentAction?.version).toBe(1);
    });
  });

  describe('error injection', () => {
    it('fails only the next call', async () => {
      armMockError(500);
      expect((await apiError(inventoryApi.listDealerships())).status).toBe(500);
      await expect(inventoryApi.listDealerships()).resolves.toBeDefined();
    });

    it('can wait for a specific method', async () => {
      armMockError(500, 'PUT');
      await expect(inventoryApi.listDealerships()).resolves.toBeDefined();
      const error = await apiError(
        inventoryApi.saveAction('day91', { status: 'SEND_TO_AUCTION', version: 0 }),
      );
      expect(error.status).toBe(500);
    });
  });
});

describe('seed data', () => {
  it('is deterministic, spans ages 0–200 and covers at least two time zones', () => {
    const seed = generateSeed(NOW);
    expect(generateSeed(NOW)).toEqual(seed);
    expect(seed.vehicles.length).toBeGreaterThanOrEqual(1000);
    expect(new Set(seed.dealerships.map(({ timezone }) => timezone)).size).toBeGreaterThan(1);

    const db = createDb({ ...seed, now: () => NOW });
    const items = seed.dealerships.flatMap(
      ({ id }) => db.listVehicles({ dealershipId: id, pageSize: 1000 }).items,
    );
    const days = items.map(({ daysInStock }) => daysInStock);
    expect(Math.min(...days)).toBeLessThanOrEqual(1);
    expect(Math.max(...days)).toBeGreaterThanOrEqual(199);
    expect(items.some(({ isAging }) => isAging)).toBe(true);
    expect(items.some(({ isAging }) => !isAging)).toBe(true);
  });
});
