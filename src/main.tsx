import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import '@/index.css';

async function enableMockApi() {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK_API === 'true') {
    const { startMockApi } = await import('@/mocks/browser');
    await startMockApi();
  }
}

void enableMockApi().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
