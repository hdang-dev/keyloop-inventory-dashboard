import { http, HttpResponse } from 'msw';
import { ApiError, apiRequest, REQUEST_ID_HEADER } from '@/api/client';
import { setLogSink, type LogEntry } from '@/lib/logger';
import { server } from '@/mocks/server';

const logs: LogEntry[] = [];

beforeEach(() => {
  logs.length = 0;
  setLogSink((entry) => logs.push(entry));
});

afterEach(() => setLogSink(null));

describe('apiRequest', () => {
  it('sends a unique request id on every call', async () => {
    const ids: (string | null)[] = [];
    server.use(
      http.get('/api/thing', ({ request }) => {
        ids.push(request.headers.get(REQUEST_ID_HEADER));
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiRequest('/thing');
    await apiRequest('/thing');

    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[0]).not.toBe(ids[1]);
    expect(logs).toEqual([]);
  });

  it('turns an error response into an ApiError and logs it with the same request id', async () => {
    let sentId: string | null = null;
    server.use(
      http.put('/api/thing', ({ request }) => {
        sentId = request.headers.get(REQUEST_ID_HEADER);
        return HttpResponse.json({ error: { code: 'NOPE', message: 'No' } }, { status: 400 });
      }),
    );

    const error = await apiRequest('/thing', { method: 'PUT' }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'NOPE', message: 'No' });
    expect(logs).toEqual([
      expect.objectContaining({
        level: 'warn',
        message: 'api_error',
        requestId: sentId,
        method: 'PUT',
        path: '/thing',
        status: 400,
        code: 'NOPE',
      }),
    ]);
  });

  it('handles an error response that is not JSON', async () => {
    server.use(http.get('/api/thing', () => new HttpResponse('Bad gateway', { status: 502 })));
    await expect(apiRequest('/thing')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN_ERROR',
    });
  });

  it('reports a network failure', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.error()));
    await expect(apiRequest('/thing')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(logs[0]).toMatchObject({ message: 'api_error', code: 'NETWORK_ERROR' });
  });
});
