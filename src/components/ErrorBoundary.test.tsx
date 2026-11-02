import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { setLogSink } from '@/lib/logger';

function Broken(): never {
  throw new Error('Render failed');
}

afterEach(() => {
  setLogSink(null);
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>Fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });

  it('shows a recovery screen and logs the failure', () => {
    // React reports caught render errors to the console itself; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const sink = vi.fn();
    setLogSink(sink);

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'render_error',
        errorMessage: 'Render failed',
      }),
    );
  });
});
