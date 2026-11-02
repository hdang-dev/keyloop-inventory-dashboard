import { describeError, logger, setLogSink, type LogEntry } from '@/lib/logger';

afterEach(() => {
  setLogSink(null);
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('writes one line of structured JSON at the matching console level', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('api_error', { status: 500 });

    const entry = JSON.parse(warn.mock.calls[0]?.[0] as string) as LogEntry;
    expect(entry).toMatchObject({ level: 'warn', message: 'api_error', status: 500 });
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('can send logs to another destination', () => {
    const sink = vi.fn();
    const info = vi.spyOn(console, 'info');
    setLogSink(sink);

    logger.info('hello');

    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ level: 'info', message: 'hello' }));
    expect(info).not.toHaveBeenCalled();
  });

  it('does not let context overwrite the level or message', () => {
    const sink = vi.fn();
    setLogSink(sink);
    logger.error('real', { level: 'info', message: 'fake' });
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ level: 'error', message: 'real' }));
  });
});

describe('describeError', () => {
  it('extracts fields from an Error and handles other thrown values', () => {
    expect(describeError(new TypeError('bad'))).toMatchObject({
      errorName: 'TypeError',
      errorMessage: 'bad',
    });
    expect(describeError('oops')).toEqual({ errorMessage: 'oops' });
  });
});
