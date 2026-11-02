import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { ACTION_NOTE_MAX_LENGTH, ACTION_STATUSES, VEHICLE_SORTS } from '@/domain/types';
import type { Db } from '@/mocks/db';
import { takeMockError } from '@/mocks/mockError';

const MAX_PAGE_SIZE = 100;

const intParam = z.string().regex(/^\d+$/).transform(Number);

const vehicleQuerySchema = z
  .object({
    dealershipId: z.string().min(1),
    make: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    minDays: intParam.optional(),
    maxDays: intParam.optional(),
    agingOnly: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    sort: z.enum(VEHICLE_SORTS).optional(),
    page: intParam.pipe(z.number().min(1)).optional(),
    pageSize: intParam.pipe(z.number().min(1).max(MAX_PAGE_SIZE)).optional(),
  })
  .refine(
    ({ minDays, maxDays }) => minDays === undefined || maxDays === undefined || minDays <= maxDays,
    { message: 'minDays must not exceed maxDays' },
  );

const saveActionSchema = z.object({
  status: z.enum(ACTION_STATUSES),
  note: z.string().max(ACTION_NOTE_MAX_LENGTH).nullish(),
  version: z.number().int().min(0),
});

function errorResponse(status: number, code: string, message: string, extra?: object) {
  return HttpResponse.json({ error: { code, message }, ...extra }, { status });
}

function validationError(message: string) {
  return errorResponse(400, 'VALIDATION_ERROR', message);
}

interface HandlerOptions {
  /** Simulated network latency in ms as [min, max]. */
  latency?: [number, number];
}

export function createHandlers(db: Db, { latency }: HandlerOptions = {}) {
  function dealershipIdFrom(request: Request): string | null {
    const id = new URL(request.url).searchParams.get('dealershipId');
    return id && db.hasDealership(id) ? id : null;
  }

  const unknownDealership = () => validationError('A valid dealershipId is required');

  return [
    http.all('/api/*', async ({ request }) => {
      if (latency) {
        const [min, max] = latency;
        await delay(min + Math.random() * (max - min));
      }
      const status = takeMockError(request.method);
      if (status !== null) {
        return errorResponse(status, 'MOCK_ERROR', 'Simulated server error');
      }
      return undefined;
    }),

    http.get('/api/dealerships', () => HttpResponse.json({ items: db.listDealerships() })),

    http.get('/api/vehicles/filter-options', ({ request }) => {
      const dealershipId = dealershipIdFrom(request);
      return dealershipId ? HttpResponse.json(db.filterOptions(dealershipId)) : unknownDealership();
    }),

    http.get('/api/vehicles/summary', ({ request }) => {
      const dealershipId = dealershipIdFrom(request);
      return dealershipId ? HttpResponse.json(db.summary(dealershipId)) : unknownDealership();
    }),

    http.get('/api/vehicles', ({ request }) => {
      if (!dealershipIdFrom(request)) return unknownDealership();
      const params = Object.fromEntries(new URL(request.url).searchParams);
      const query = vehicleQuerySchema.safeParse(params);
      if (!query.success) return validationError(query.error.issues[0]?.message ?? 'Invalid query');
      return HttpResponse.json(db.listVehicles(query.data));
    }),

    http.get<{ id: string }>('/api/vehicles/:id', ({ params }) => {
      const vehicle = db.getVehicle(params.id);
      return vehicle
        ? HttpResponse.json(vehicle)
        : errorResponse(404, 'NOT_FOUND', 'Vehicle not found');
    }),

    http.put<{ id: string }>('/api/vehicles/:id/action', async ({ params, request }) => {
      const vehicle = db.getVehicle(params.id);
      if (!vehicle) return errorResponse(404, 'NOT_FOUND', 'Vehicle not found');
      if (!vehicle.isAging) {
        return errorResponse(400, 'NOT_AGING', 'Actions can only be logged for aging vehicles');
      }

      const body = saveActionSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return validationError(body.error.issues[0]?.message ?? 'Invalid body');

      const result = db.saveAction(params.id, body.data);
      return result.ok
        ? HttpResponse.json({ currentAction: result.action })
        : errorResponse(409, 'VERSION_CONFLICT', 'This vehicle was updated by someone else', {
            currentAction: result.currentAction,
          });
    }),
  ];
}
