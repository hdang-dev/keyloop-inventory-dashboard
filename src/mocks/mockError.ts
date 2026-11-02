interface ArmedError {
  status: number;
  method: string | null;
}

let armed: ArmedError | null = null;

export function armMockError(status: number, method: string | null = null) {
  armed = { status, method };
}

export function disarmMockError() {
  armed = null;
}

/** Returns the armed status once, for the first request that matches. */
export function takeMockError(method: string): number | null {
  if (!armed || (armed.method !== null && armed.method !== method)) return null;
  const { status } = armed;
  armed = null;
  return status;
}

/**
 * Demo switch: `?mockError=500` fails the next API call, and `&mockErrorOn=PUT` limits it to the
 * next call using that method, so a failed save can be shown after the page has loaded.
 * The params are removed from the address bar so a reload does not fail again.
 */
export function armMockErrorFromUrl() {
  const url = new URL(window.location.href);
  const status = Number(url.searchParams.get('mockError'));
  const method = url.searchParams.get('mockErrorOn');
  url.searchParams.delete('mockError');
  url.searchParams.delete('mockErrorOn');
  window.history.replaceState(null, '', url);
  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    armMockError(status, method?.toUpperCase() ?? null);
  }
}
