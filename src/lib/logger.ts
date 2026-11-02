export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export type LogSink = (entry: LogEntry) => void;

const consoleSink: LogSink = (entry) => {
  console[entry.level](JSON.stringify(entry));
};

let sink = consoleSink;

/** Replaces where logs go, which is the single place a service such as Sentry would plug in. */
export function setLogSink(next: LogSink | null) {
  sink = next ?? consoleSink;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  sink({ ...context, level, message, timestamp: new Date().toISOString() });
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};

export function describeError(error: unknown): Record<string, unknown> {
  return error instanceof Error
    ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
    : { errorMessage: String(error) };
}

/** Catches failures that happen outside React rendering. */
export function installGlobalErrorLogging() {
  window.addEventListener('error', (event) => {
    logger.error('uncaught_error', describeError(event.error ?? event.message));
  });
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('unhandled_rejection', describeError(event.reason));
  });
}
