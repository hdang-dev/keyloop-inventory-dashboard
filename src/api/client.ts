import type { VehicleAction } from '@/domain/types';
import { logger } from '@/lib/logger';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** The latest action, sent with a 409 VERSION_CONFLICT. */
  readonly currentAction?: VehicleAction | null;

  constructor(status: number, code: string, message: string, currentAction?: VehicleAction | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.currentAction = currentAction;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
  currentAction?: VehicleAction | null;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  return new ApiError(
    response.status,
    body.error?.code ?? 'UNKNOWN_ERROR',
    body.error?.message ?? `Request failed with status ${response.status}`,
    body.currentAction,
  );
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // Sent with every call and logged on failure, to link a UI error to the backend's logs.
  const requestId = crypto.randomUUID();
  const method = init?.method ?? 'GET';

  function fail(error: ApiError): ApiError {
    logger.warn('api_error', { requestId, method, path, status: error.status, code: error.code });
    return error;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        [REQUEST_ID_HEADER]: requestId,
        ...init?.headers,
      },
    });
  } catch {
    throw fail(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server'));
  }
  if (!response.ok) throw fail(await toApiError(response));
  return (await response.json()) as T;
}
