import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { describeError, installGlobalErrorLogging, logger } from '@/lib/logger';
import { reportWebVitals } from '@/lib/webVitals';
import '@/index.css';

async function enableMockApi() {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
    const { startMockApi } = await import('@/mocks/browser');
    await startMockApi();
  }
}

installGlobalErrorLogging();
reportWebVitals();

// Render even if the mock cannot start, so the app's own error states explain the failure.
void enableMockApi()
  .catch((error: unknown) => logger.error('mock_api_failed', describeError(error)))
  .finally(() => {
    createRoot(document.getElementById('root') as HTMLElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  });
