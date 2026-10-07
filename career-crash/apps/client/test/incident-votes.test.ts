import { afterAll, describe, expect, it, vi } from 'vitest';
import { handle, HourTally } from '../../votes/src/index';
import { setup } from '../../votes/test/fakes';

// The page's like pipe against the real vote service code (apps/votes) on in-memory Durable Objects.
const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  },
  window: { addEventListener: () => {}, removeEventListener: () => {} },
});

const { env } = setup();
let offline = false;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (offline) throw new TypeError('Failed to fetch');
  const req = new Request(input, init);
  HourTally.now = () => Date.now();
  return handle(new Request(req, { headers: { origin: 'https://careercrash.org', 'cf-connecting-ip': '203.0.113.9', 'content-type': 'application/json' } }), env, undefined, Date.now());
}) as typeof fetch;
vi.useFakeTimers({ toFake: ['Date'] });
vi.stubEnv('VITE_VOTE_URL', 'https://vote.test');
const likes = await import('../src/incident/likes');

afterAll(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const HOUR = '2026-10-07T14';
const at = (min: number, sec = 0) => Date.parse(`${HOUR}:00:00Z`) + min * 60_000 + sec * 1000;

/** Another device: a fresh browser. */
function newDevice() {
  store.clear();
}

describe('the like pipe with the vote service (09 §6)', () => {
  it('sends likes, counts each device once, and freezes them at the next session', async () => {
    expect(likes.VOTE_URL).toBe('https://vote.test');
    vi.setSystemTime(at(7));
    expect(likes.castLike('PL', 'hall')).toBe(true);
    await likes.flush();
    expect(likes.myLikes(HOUR)).toEqual([{ key: 'PL', session: 1, source: 'hall', sent: true }]);
    // The same device again: refused on the page, and the service would refuse it too.
    expect(likes.castLike('PL', 'hall')).toBe(false);

    newDevice();
    expect(likes.castLike('PL', 'careercrash')).toBe(true);
    expect(likes.castLike('ENG', 'hall')).toBe(true);
    await likes.flush();

    // Session 1 runs on nothing (no likes before it); two for PL and one for ENG are on the way.
    expect(await likes.loadHour(HOUR, 1)).toBe(true);
    expect(likes.frozenTally(HOUR, 1)).toEqual({});
    // This device's own likes aren't counted as other people's.
    expect(likes.othersPending(HOUR, 1)).toEqual({ PL: 1, ENG: 0 });

    // Asking for session 2 before it starts on the service's clock: not yet.
    vi.setSystemTime(at(9, 59));
    expect(await likes.loadHour(HOUR, 2, 1)).toBe(false);
    vi.setSystemTime(at(10, 1));
    expect(await likes.loadHour(HOUR, 2)).toBe(true);
    expect(likes.frozenTally(HOUR, 2)).toEqual({ PL: 2, ENG: 1 });
    expect(likes.frozenTally(HOUR, 1)).toEqual({});
  });

  it('keeps a like that could not be sent and sends it when the service is back', async () => {
    newDevice();
    vi.setSystemTime(at(12));
    offline = true;
    expect(likes.castLike('FR', 'hall')).toBe(true);
    await likes.flush();
    expect(likes.myLikes(HOUR)[0]).toMatchObject({ key: 'FR', sent: false });
    offline = false;
    await likes.flush();
    expect(likes.myLikes(HOUR)[0]).toMatchObject({ key: 'FR', sent: true, session: 2 });
    vi.setSystemTime(at(15, 1));
    await likes.loadHour(HOUR, 3);
    expect(likes.frozenTally(HOUR, 3)).toEqual({ PL: 2, ENG: 1, FR: 1 });
  });

  it('drops a like the hour ended on before it could be sent', async () => {
    newDevice();
    vi.setSystemTime(at(59, 50));
    offline = true;
    expect(likes.castLike('DE', 'hall')).toBe(true);
    offline = false;
    // Sent at 15:00:05: the service turns it away rather than counting it in the next hour.
    vi.setSystemTime(at(60, 5));
    const stored = JSON.parse(store.get(`incident:likes:${HOUR}`)!) as unknown[];
    expect(stored).toHaveLength(1);
    await likes.flush();
    expect(likes.frozenTally('2026-10-07T15', 0)).toBeNull();
  });
});
