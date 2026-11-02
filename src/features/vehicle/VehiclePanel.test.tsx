import { act, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { armMockError } from '@/mocks/mockError';
import { server } from '@/mocks/server';
import { serveMockApi } from '@/test/fixtures';
import { currentParams, renderApp } from '@/test/render';

const panel = () => screen.findByRole('dialog');

function rowFor(vin: string) {
  return screen.getByRole('button', { name: vin, hidden: true }).closest('tr') as HTMLElement;
}

async function openDay91() {
  const db = serveMockApi();
  const view = renderApp('?vehicleId=day91');
  const dialog = await panel();
  await within(dialog).findByRole('form', { name: 'Log an action' });
  return { db, dialog, ...view };
}

function refocusTab() {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
  focusManager.setFocused(undefined);
}

describe('vehicle panel', () => {
  it('opens from a row click and stores the vehicle in the URL', async () => {
    serveMockApi();
    const { user } = renderApp();
    await screen.findByText('VINDAY91');

    await user.click(rowFor('VINDAY91'));

    expect(await panel()).toBeInTheDocument();
    expect(currentParams().get('vehicleId')).toBe('day91');
    expect(await screen.findByRole('heading', { name: 'Honda Civic' })).toBeInTheDocument();
  });

  it('opens from the keyboard and closes with Escape, returning focus to the row', async () => {
    serveMockApi();
    const { user } = renderApp();
    const vin = await screen.findByRole('button', { name: 'VINDAY91' });

    vin.focus();
    await user.keyboard('{Enter}');
    expect(await panel()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(currentParams().has('vehicleId')).toBe(false);
    await waitFor(() => expect(vin).toHaveFocus());
  });

  it('restores the open vehicle from the URL', async () => {
    const { dialog } = await openDay91();
    expect(within(dialog).getByText('VINDAY91')).toBeInTheDocument();
    expect(within(dialog).getByText('No actions logged yet.')).toBeInTheDocument();
  });

  it('hides the form for a vehicle that is not aging', async () => {
    serveMockApi();
    renderApp('?vehicleId=day90');
    expect(await screen.findByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Log an action' })).not.toBeInTheDocument();
    expect(screen.getByText(/in stock for more than 90 days/)).toBeInTheDocument();
  });

  it('explains when the vehicle no longer exists', async () => {
    serveMockApi();
    renderApp('?vehicleId=sold');
    expect(await screen.findByText('This vehicle is no longer in stock.')).toBeInTheDocument();
  });

  it('saving updates the table and history, and records who and when', async () => {
    const { dialog, user } = await openDay91();

    await user.selectOptions(within(dialog).getByLabelText('Status'), 'PRICE_REDUCTION_PLANNED');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Reduce by 500');
    await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

    expect(await screen.findByText('Action saved')).toBeInTheDocument();
    const history = await within(dialog).findByRole('list', { name: 'Action history' });
    expect(within(history).getByText('Price Reduction Planned')).toBeInTheDocument();
    expect(within(history).getByText('Reduce by 500')).toBeInTheDocument();
    expect(await within(history).findByText(/Demo Manager/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Status')).toHaveValue('PRICE_REDUCTION_PLANNED');
    await waitFor(() =>
      expect(within(rowFor('VINDAY91')).getByText('Price Reduction Planned')).toBeInTheDocument(),
    );
  });

  it('allows several saves in a row, with history newest first', async () => {
    const { dialog, db, user } = await openDay91();
    const status = within(dialog).getByLabelText('Status');
    const save = within(dialog).getByRole('button', { name: 'Save action' });

    await user.selectOptions(status, 'SEND_TO_AUCTION');
    await user.click(save);
    await within(dialog).findByText(/Demo Manager/);

    await user.selectOptions(status, 'TRANSFER_TO_ANOTHER_SITE');
    await user.click(save);
    await waitFor(() => expect(db.getVehicle('day91')?.currentAction?.version).toBe(2));

    const history = await within(dialog).findByRole('list', { name: 'Action history' });
    await waitFor(() => {
      const titles = within(history)
        .getAllByRole('listitem')
        .map((item) => item.firstChild?.textContent);
      expect(titles).toEqual(['Transfer to Another Site', 'Send to Auction']);
    });
    expect(screen.queryByText('Updated by someone else')).not.toBeInTheDocument();
  });

  it('shows the change immediately and disables submit while saving', async () => {
    const { dialog, user } = await openDay91();
    server.use(
      http.put('/api/vehicles/:id/action', async () => {
        await delay(150);
        return undefined;
      }),
    );

    await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
    await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled();
    const history = within(dialog).getByRole('list', { name: 'Action history' });
    expect(within(history).getByText('Send to Auction')).toBeInTheDocument();
    expect(within(history).getByText(/^You/)).toBeInTheDocument();

    expect(await within(history).findByText(/Demo Manager/)).toBeInTheDocument();
  });

  describe('validation', () => {
    it('requires a status', async () => {
      const { dialog, db, user } = await openDay91();
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      expect(await within(dialog).findByText('Select a status')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Status')).toHaveAttribute('aria-invalid', 'true');
      expect(db.getVehicle('day91')?.currentAction).toBeNull();
    });

    it('limits the note to 500 characters', async () => {
      const { dialog, db, user } = await openDay91();
      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
      await user.click(within(dialog).getByLabelText('Note (optional)'));
      await user.paste('x'.repeat(501));
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      expect(await within(dialog).findByText(/500 characters or fewer/)).toBeInTheDocument();
      expect(db.getVehicle('day91')?.currentAction).toBeNull();
    });
  });

  describe('failed saves', () => {
    it('rolls back and reports a server error, keeping the input for a retry', async () => {
      const { dialog, db, user } = await openDay91();
      armMockError(500, 'PUT');

      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      expect(await screen.findByText('Could not save the action')).toBeInTheDocument();
      await waitFor(() =>
        expect(within(dialog).getByText('No actions logged yet.')).toBeInTheDocument(),
      );
      expect(within(dialog).getByLabelText('Status')).toHaveValue('SEND_TO_AUCTION');
      expect(db.getVehicle('day91')?.currentAction).toBeNull();

      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));
      await waitFor(() => expect(db.getVehicle('day91')?.currentAction?.version).toBe(1));
    });

    it('rolls the table back too', async () => {
      const db = serveMockApi();
      const { user } = renderApp();
      await screen.findByText('VINDAY91');
      await user.click(rowFor('VINDAY91'));
      const dialog = await panel();
      await within(dialog).findByRole('form', { name: 'Log an action' });
      server.use(
        http.put('/api/vehicles/:id/action', async () => {
          await delay(50);
          return HttpResponse.json({ error: { code: 'X', message: 'Boom' } }, { status: 500 });
        }),
      );

      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      await screen.findByText('Could not save the action');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(within(rowFor('VINDAY91')).getByText('No Action Yet')).toBeInTheDocument();
      expect(db.getVehicle('day91')?.currentAction).toBeNull();
    });
  });

  describe('version conflicts', () => {
    it('explains a 409 and shows the latest action and history', async () => {
      const { dialog, db, user } = await openDay91();
      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');

      db.saveAction('day91', {
        status: 'TRANSFER_TO_ANOTHER_SITE',
        note: 'Other site',
        version: 0,
      });
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      expect(await within(dialog).findByText('Updated by someone else')).toBeInTheDocument();
      await waitFor(() =>
        expect(within(dialog).getByLabelText('Status')).toHaveValue('TRANSFER_TO_ANOTHER_SITE'),
      );
      const history = await within(dialog).findByRole('list', { name: 'Action history' });
      expect(within(history).getByText('Other site')).toBeInTheDocument();
      expect(db.getVehicle('day91')?.history).toHaveLength(1);

      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));
      await waitFor(() => expect(db.getVehicle('day91')?.currentAction?.version).toBe(2));
      expect(screen.queryByText('Updated by someone else')).not.toBeInTheDocument();
    });

    it('still reports a conflict when refocusing refreshes the panel during an edit', async () => {
      const { dialog, db, user } = await openDay91();
      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');

      db.saveAction('day91', { status: 'TRANSFER_TO_ANOTHER_SITE', version: 0 });
      refocusTab();
      await within(dialog).findByRole('list', { name: 'Action history' });
      expect(within(dialog).getByLabelText('Status')).toHaveValue('SEND_TO_AUCTION');

      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      expect(await within(dialog).findByText('Updated by someone else')).toBeInTheDocument();
      expect(db.getVehicle('day91')?.currentAction?.status).toBe('TRANSFER_TO_ANOTHER_SITE');
    });

    it('lets an untouched form follow newer data without a conflict', async () => {
      const { dialog, db, user } = await openDay91();

      db.saveAction('day91', { status: 'TRANSFER_TO_ANOTHER_SITE', version: 0 });
      refocusTab();
      await waitFor(() =>
        expect(within(dialog).getByLabelText('Status')).toHaveValue('TRANSFER_TO_ANOTHER_SITE'),
      );

      await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
      await user.click(within(dialog).getByRole('button', { name: 'Save action' }));

      await waitFor(() => expect(db.getVehicle('day91')?.currentAction?.version).toBe(2));
      expect(screen.queryByText('Updated by someone else')).not.toBeInTheDocument();
    });
  });

  it('persists a saved action across a reload', async () => {
    const { dialog, user, unmount } = await openDay91();
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'SEND_TO_AUCTION');
    await user.click(within(dialog).getByRole('button', { name: 'Save action' }));
    await within(dialog).findByText(/Demo Manager/);
    unmount();

    serveMockApi();
    renderApp();

    await screen.findByRole('button', { name: 'VINDAY91' });
    expect(within(rowFor('VINDAY91')).getByText('Send to Auction')).toBeInTheDocument();
  });
});
