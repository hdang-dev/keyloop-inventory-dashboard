import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { server } from '@/mocks/server';

/** Renders the whole app at a URL, so tests exercise it as a user would. */
export function renderApp(search = '') {
  window.history.replaceState(null, '', `/${search}`);
  return { user: userEvent.setup(), ...render(<App />) };
}

/** Records the URL of every API request for assertions on what was asked of the server. */
export function trackRequests() {
  const requests: { method: string; url: URL }[] = [];
  server.events.on('request:start', ({ request }) => {
    requests.push({ method: request.method, url: new URL(request.url) });
  });
  return {
    vehicleLists: () => requests.filter(({ url }) => url.pathname === '/api/vehicles'),
    lastVehicleList: () =>
      requests.filter(({ url }) => url.pathname === '/api/vehicles').at(-1)?.url.searchParams,
  };
}

export function currentParams() {
  return new URLSearchParams(window.location.search);
}
