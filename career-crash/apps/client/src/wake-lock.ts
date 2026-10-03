/**
 * Keep the screen awake while a fight plays (Screen Wake Lock API, like a
 * video app). Browsers drop the lock whenever the page is hidden, so it is
 * taken again when the page comes back, for as long as it's wanted. Where the
 * API is missing (older iOS), this quietly does nothing.
 */
type Sentinel = { release(): Promise<void>; addEventListener(type: 'release', cb: () => void): void };
type WakeLockApi = { request(type: 'screen'): Promise<Sentinel> };

let wanted = false;
let sentinel: Sentinel | null = null;
let pending = false;

function api(): WakeLockApi | null {
  return (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock ?? null;
}

async function acquire(): Promise<void> {
  const wl = api();
  if (!wl || sentinel || pending || document.visibilityState !== 'visible') return;
  pending = true;
  try {
    const s = await wl.request('screen');
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
    });
    sentinel = s;
    // Released while we were waiting for it.
    if (!wanted) void release();
  } catch {
    /* refused (battery saver, no permission): the screen dims as normal */
  } finally {
    pending = false;
  }
}

async function release(): Promise<void> {
  const s = sentinel;
  sentinel = null;
  try {
    await s?.release();
  } catch {
    /* already released */
  }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') void acquire();
});

/** Ask for the screen to stay on (true) or let it dim again (false). */
export function keepAwake(on: boolean): void {
  if (on === wanted) return;
  wanted = on;
  if (on) void acquire();
  else void release();
}
