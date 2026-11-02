import { screen, waitFor, within } from '@testing-library/react';
import { LONDON, SAIGON, serveMockApi, VEHICLES } from '@/test/fixtures';
import { currentParams, renderApp, trackRequests } from '@/test/render';

async function rowFor(vin: string) {
  return (await screen.findByText(vin)).closest('tr') as HTMLElement;
}

describe('aging stock', () => {
  it('Aging tab asks the server for aging stock only, oldest first', async () => {
    serveMockApi();
    const requests = trackRequests();
    const { user } = renderApp();
    await screen.findByText('VINFRESH');
    expect(requests.lastVehicleList()?.has('agingOnly')).toBe(false);

    await user.click(screen.getByRole('tab', { name: /Aging Stock/ }));

    await waitFor(() => expect(requests.lastVehicleList()?.get('agingOnly')).toBe('true'));
    expect(requests.lastVehicleList()?.get('sort')).toBe('daysInStock:desc');
    expect(currentParams().get('tab')).toBe('aging');
    await waitFor(() => expect(screen.queryByText('VINFRESH')).not.toBeInTheDocument());
    expect(screen.queryByText('VINDAY90')).not.toBeInTheDocument();
    expect(await screen.findByText('VINDAY91')).toBeInTheDocument();
  });

  it('opening the Aging tab restores oldest first and page 1 but keeps filters', async () => {
    serveMockApi();
    const requests = trackRequests();
    const { user } = renderApp('?sort=make:asc&make=Honda');
    await screen.findByText('VINOLD');

    await user.click(screen.getByRole('tab', { name: /Aging Stock/ }));

    await waitFor(() => expect(requests.lastVehicleList()?.get('agingOnly')).toBe('true'));
    expect(requests.lastVehicleList()?.get('sort')).toBe('daysInStock:desc');
    expect(requests.lastVehicleList()?.get('make')).toBe('Honda');
    expect(currentParams().has('sort')).toBe(false);
  });

  it('restores the Aging tab from the URL', async () => {
    serveMockApi();
    renderApp('?tab=aging');
    expect(await screen.findByRole('tab', { name: /Aging Stock/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText('VINDAY91')).toBeInTheDocument();
    expect(screen.queryByText('VINFRESH')).not.toBeInTheDocument();
  });

  it('shows the aging count on the tab', async () => {
    serveMockApi();
    renderApp();
    const tab = await screen.findByRole('tab', { name: /Aging Stock/ });
    expect(await within(tab).findByText('3')).toBeInTheDocument();
  });

  it('shows the badge only on vehicles the API flags as aging', async () => {
    serveMockApi();
    renderApp();
    expect(within(await rowFor('VINDAY91')).getByText('Aging')).toBeInTheDocument();
    expect(within(await rowFor('VINOLDEST')).getByText('Aging')).toBeInTheDocument();
    expect(within(await rowFor('VINDAY90')).queryByText('Aging')).not.toBeInTheDocument();
    expect(within(await rowFor('VINFRESH')).queryByText('Aging')).not.toBeInTheDocument();
  });

  it('marks aging vehicles with no decision, and leaves other rows blank', async () => {
    serveMockApi();
    renderApp();
    expect(within(await rowFor('VINDAY91')).getByText('No Action Yet')).toBeInTheDocument();
    expect(within(await rowFor('VINDAY90')).queryByText('No Action Yet')).not.toBeInTheDocument();
  });

  it('highlights the aging count in the summary', async () => {
    serveMockApi();
    renderApp();
    const summary = await screen.findByRole('region', { name: 'Stock summary' });
    expect(await within(summary).findByText('Aging vehicles (over 90 days)')).toBeInTheDocument();
    expect(await within(summary).findByText('3')).toBeInTheDocument();
  });

  it('shows a clear message when nothing is aging', async () => {
    serveMockApi(VEHICLES.filter(({ id }) => id === 'fresh'));
    renderApp('?tab=aging');
    expect(await screen.findByText('No aging stock')).toBeInTheDocument();
  });

  it('shows stocking dates in the time zone of the dealership', async () => {
    // 20:00 UTC on 9 June is 03:00 on 10 June in Saigon and 21:00 on 9 June in London.
    const stockedAt = '2026-06-09T20:00:00Z';
    const base = { make: 'Toyota', model: 'Camry', stockedAt, soldAt: null };
    serveMockApi([
      { ...base, id: 'a', vin: 'VINSAIGON', dealershipId: SAIGON.id },
      { ...base, id: 'b', vin: 'VINLONDON', dealershipId: LONDON.id },
    ]);
    const { user } = renderApp();

    expect(within(await rowFor('VINSAIGON')).getByText('10 Jun 2026')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Dealership'), LONDON.id);
    expect(within(await rowFor('VINLONDON')).getByText('09 Jun 2026')).toBeInTheDocument();
  });
});
