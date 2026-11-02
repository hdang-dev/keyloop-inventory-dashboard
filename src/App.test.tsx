import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { VehicleRecord } from '@/mocks/data/seed';
import { armMockError } from '@/mocks/mockError';
import { server } from '@/mocks/server';
import { LONDON, NOW, SAIGON, useMockApi } from '@/test/fixtures';
import { currentParams, renderApp, trackRequests } from '@/test/render';

const vehicleTable = () => screen.findByRole('table', { name: 'Vehicles' });

async function visibleVins() {
  const rows = within(await vehicleTable())
    .getAllByRole('row')
    .slice(1);
  return rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent);
}

function manyVehicles(count: number): VehicleRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `v${index}`,
    vin: `VIN${index}`,
    dealershipId: SAIGON.id,
    make: 'Toyota',
    model: 'Camry',
    stockedAt: new Date(NOW.getTime() - index * 86_400_000).toISOString(),
    soldAt: null,
  }));
}

describe('inventory list', () => {
  it('shows skeletons, then the first dealership with oldest stock first', async () => {
    useMockApi();
    renderApp();

    expect(await screen.findByLabelText('Dealership')).toHaveValue(SAIGON.id);
    expect((await screen.findAllByTestId('vehicle-skeleton')).length).toBeGreaterThan(0);

    await waitFor(async () => {
      expect(await visibleVins()).toEqual([
        'VINOLDEST',
        'VINOLD',
        'VINDAY91',
        'VINDAY90',
        'VINFRESH',
      ]);
    });
    expect(screen.queryByText('VINSOLD')).not.toBeInTheDocument();
  });

  it('shows summary counts for the selected dealership', async () => {
    useMockApi();
    renderApp();
    const summary = await screen.findByRole('region', { name: 'Stock summary' });
    expect(await within(summary).findByText('5')).toBeInTheDocument();
    expect(within(summary).getByText('3')).toBeInTheDocument();
  });

  it('switching dealership reloads its stock, clears filters and updates the URL', async () => {
    useMockApi();
    const { user } = renderApp('?make=Honda');
    await screen.findByText('VINOLD');

    await user.selectOptions(screen.getByLabelText('Dealership'), LONDON.id);

    expect(await screen.findByText('VINUK')).toBeInTheDocument();
    expect(currentParams().get('dealershipId')).toBe(LONDON.id);
    expect(currentParams().has('make')).toBe(false);
  });

  describe('filters', () => {
    it('updates the URL and the request when filtering by make and model', async () => {
      useMockApi();
      const requests = trackRequests();
      const { user } = renderApp();
      await screen.findByText('VINFRESH');

      await user.selectOptions(await screen.findByLabelText('Make'), 'Honda');
      await waitFor(() => expect(requests.lastVehicleList()?.get('make')).toBe('Honda'));
      expect(currentParams().get('make')).toBe('Honda');
      expect(await screen.findByText('VINDAY91')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText('VINFRESH')).not.toBeInTheDocument());

      await user.selectOptions(screen.getByLabelText('Model'), 'Civic');
      await waitFor(() => expect(requests.lastVehicleList()?.get('model')).toBe('Civic'));
      expect(currentParams().get('model')).toBe('Civic');
      await waitFor(() => expect(screen.queryByText('VINOLD')).not.toBeInTheDocument());
    });

    it('offers only the models of the selected make, and clears the model with the make', async () => {
      useMockApi();
      const { user } = renderApp();
      await screen.findByText('VINFRESH');

      const model = screen.getByLabelText('Model');
      expect(model).toBeDisabled();

      await screen.findByRole('option', { name: 'Honda' });
      await user.selectOptions(screen.getByLabelText('Make'), 'Honda');
      const options = within(model)
        .getAllByRole('option')
        .map((option) => option.textContent);
      expect(options).toEqual(['All models', 'Accord', 'Civic']);

      await user.selectOptions(model, 'Civic');
      await user.selectOptions(screen.getByLabelText('Make'), 'Toyota');
      expect(currentParams().has('model')).toBe(false);
      expect(within(model).getByRole('option', { name: 'Camry' })).toBeInTheDocument();
      expect(within(model).queryByRole('option', { name: 'Civic' })).not.toBeInTheDocument();
    });

    it('debounces the days inputs and sends one request for one edit', async () => {
      useMockApi();
      const requests = trackRequests();
      const { user } = renderApp();
      await screen.findByText('VINFRESH');
      const before = requests.vehicleLists().length;

      await user.type(screen.getByLabelText('Min days'), '100');
      expect(currentParams().has('minDays')).toBe(false);

      await waitFor(() => expect(currentParams().get('minDays')).toBe('100'));
      await waitFor(() => expect(screen.queryByText('VINFRESH')).not.toBeInTheDocument());
      expect(requests.vehicleLists().length).toBe(before + 1);
      expect(requests.lastVehicleList()?.get('minDays')).toBe('100');
    });

    it('explains an impossible range instead of sending it', async () => {
      useMockApi();
      const requests = trackRequests();
      const { user } = renderApp('?minDays=50');
      await screen.findByText('VINOLDEST');

      await user.type(screen.getByLabelText('Max days'), '10');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Min days cannot be more than max days.',
      );
      expect(requests.lastVehicleList()?.has('maxDays')).toBe(false);
      expect(currentParams().has('maxDays')).toBe(false);
    });

    it('resets filters, including the days inputs, and returns to page 1', async () => {
      useMockApi(manyVehicles(30));
      const { user } = renderApp('?make=Toyota&minDays=1&page=2');
      await screen.findByText('Page 2 of 2');
      expect(screen.getByLabelText('Min days')).toHaveValue(1);

      await user.click(screen.getByRole('button', { name: 'Reset filters' }));

      expect(currentParams().has('make')).toBe(false);
      expect(currentParams().has('page')).toBe(false);
      expect(screen.getByLabelText('Min days')).toHaveValue(null);
    });

    it('restores filters from the URL', async () => {
      useMockApi();
      const requests = trackRequests();
      renderApp('?make=Honda&model=Civic&minDays=90&maxDays=100');
      expect(await screen.findByText('VINDAY91')).toBeInTheDocument();

      const sent = requests.lastVehicleList();
      expect(sent?.get('make')).toBe('Honda');
      expect(sent?.get('model')).toBe('Civic');
      expect(sent?.get('minDays')).toBe('90');
      expect(sent?.get('maxDays')).toBe('100');
      expect(await screen.findByRole('option', { name: 'Civic' })).toBeInTheDocument();
      expect(screen.getByLabelText('Max days')).toHaveValue(100);
    });

    it('ignores invalid URL values rather than failing the page', async () => {
      useMockApi();
      const requests = trackRequests();
      renderApp('?page=abc&sort=vin:asc&minDays=-4&dealershipId=unknown');
      expect(await screen.findByText('VINFRESH')).toBeInTheDocument();

      const sent = requests.lastVehicleList();
      expect(sent?.get('page')).toBe('1');
      expect(sent?.get('sort')).toBe('daysInStock:desc');
      expect(sent?.has('minDays')).toBe(false);
      expect(sent?.get('dealershipId')).toBe(SAIGON.id);
    });
  });

  describe('sorting and paging', () => {
    it('sorts on the server and reflects the order in the URL and header', async () => {
      useMockApi();
      const requests = trackRequests();
      const { user } = renderApp();
      await screen.findByText('VINFRESH');

      await user.click(screen.getByRole('button', { name: 'Make' }));

      await waitFor(() => expect(requests.lastVehicleList()?.get('sort')).toBe('make:asc'));
      expect(currentParams().get('sort')).toBe('make:asc');
      expect(screen.getByRole('columnheader', { name: 'Make' })).toHaveAttribute(
        'aria-sort',
        'ascending',
      );

      await user.click(screen.getByRole('button', { name: 'Make' }));
      await waitFor(() => expect(requests.lastVehicleList()?.get('sort')).toBe('make:desc'));
    });

    it('moves between pages, keeping the previous rows while the next page loads', async () => {
      useMockApi(manyVehicles(45));
      const requests = trackRequests();
      const { user } = renderApp();

      expect(await screen.findByText('Showing 1–20 of 45')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.queryByTestId('vehicle-skeleton')).not.toBeInTheDocument();

      expect(await screen.findByText('Showing 21–40 of 45')).toBeInTheDocument();
      expect(requests.lastVehicleList()?.get('page')).toBe('2');
      expect(currentParams().get('page')).toBe('2');

      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(await screen.findByText('Showing 41–45 of 45')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('returns to page 1 when a filter changes', async () => {
      useMockApi(manyVehicles(30));
      const { user } = renderApp('?page=2');
      await screen.findByText('Page 2 of 2');
      await screen.findByRole('option', { name: 'Toyota' });

      await user.selectOptions(screen.getByLabelText('Make'), 'Toyota');

      expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
      expect(currentParams().has('page')).toBe(false);
    });

    it('moves back to the last page when the URL points past the end', async () => {
      useMockApi(manyVehicles(30));
      renderApp('?page=9');
      expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
      expect(currentParams().get('page')).toBe('2');
    });

    it('follows the browser back button', async () => {
      useMockApi(manyVehicles(30));
      const { user } = renderApp();
      await screen.findByText('Page 1 of 2');
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText('Page 2 of 2');

      window.history.back();

      expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    });
  });

  describe('empty and error states', () => {
    it('shows an empty state with a reset when filters match nothing', async () => {
      useMockApi();
      const { user } = renderApp('?minDays=500');

      expect(await screen.findByText('No vehicles match these filters')).toBeInTheDocument();

      const resetButtons = screen.getAllByRole('button', { name: 'Reset filters' });
      await user.click(resetButtons.at(-1) as HTMLElement);
      expect(await screen.findByText('VINFRESH')).toBeInTheDocument();
    });

    it('shows an empty state for a dealership with no stock', async () => {
      useMockApi([]);
      renderApp();
      expect(await screen.findByText('No vehicles to show')).toBeInTheDocument();
    });

    it('shows an error with a working retry when the list fails', async () => {
      useMockApi();
      server.use(
        http.get(
          '/api/vehicles',
          () =>
            HttpResponse.json({ error: { code: 'INTERNAL', message: 'Nope' } }, { status: 500 }),
          { once: true },
        ),
      );
      const { user } = renderApp();

      expect(await screen.findByText('Could not load vehicles.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('VINFRESH')).toBeInTheDocument();
    });

    it('shows an error with a working retry when dealerships fail', async () => {
      useMockApi();
      armMockError(500);
      const { user } = renderApp();

      expect(await screen.findByText('Could not load dealerships.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('VINFRESH')).toBeInTheDocument();
    });
  });
});
