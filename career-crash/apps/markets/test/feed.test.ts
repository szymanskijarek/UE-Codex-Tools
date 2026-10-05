import { describe, expect, it } from 'vitest';
import type { CoinGeckoMarket } from '@cc/game-rules';
import { handle, refresh, type Env } from '../src/index';

/** In-memory stand-in for the KV namespace. */
function fakeKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => void store.set(k, v),
      list: async ({ prefix }: { prefix: string }) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
    },
  };
}

const ROWS: CoinGeckoMarket[] = ['BTC', 'ETH', 'USDT', 'XRP', 'BNB', 'SOL', 'USDC', 'TRX', 'DOGE', 'ADA', 'HYPE', 'LINK', 'XLM', 'GRAM'].map((s, i) => ({
  id: s.toLowerCase(),
  symbol: s.toLowerCase(),
  current_price: 100 / (i + 1),
  market_cap_rank: i + 1,
  price_change_percentage_1h_in_currency: (i % 5) - 2.25,
  price_change_percentage_24h_in_currency: i - 6,
  sparkline_in_7d: { price: Array.from({ length: 168 }, (_, k) => 100 + k) },
}));

function env(): Env & { store: Map<string, string> } {
  const { kv, store } = fakeKv();
  return { FEED: kv as unknown as KVNamespace, ALLOWED_ORIGIN: 'https://careercrash.org,http://localhost:5173', store };
}

const fakeFetch = (async () => new Response(JSON.stringify(ROWS), { status: 200 })) as unknown as typeof fetch;
const AT = Date.parse('2026-10-05T14:00:12Z');

describe('market feed worker (08 §10)', () => {
  it('stores the hour once, as the hour file and as latest', async () => {
    const e = env();
    const snap = await refresh(e, AT, fakeFetch);
    expect(snap?.hour).toBe('2026-10-05T14');
    expect(snap?.coins[0]).toMatchObject({ symbol: 'BTC', capRank: 1, changeBp: -225 });
    expect(snap?.coins[0]!.spark).toHaveLength(25);
    expect(e.store.get('crypto/2026-10-05T14')).toBe(e.store.get('crypto/latest'));
    // The retry two minutes later sees the hour is done.
    expect(await refresh(e, AT + 120_000, fakeFetch)).toBeNull();
  });

  it('fails loudly instead of storing a bad hour', async () => {
    const e = env();
    const down = (async () => new Response('busy', { status: 429 })) as unknown as typeof fetch;
    await expect(refresh(e, AT, down)).rejects.toThrow('429');
    expect(e.store.size).toBe(0);
  });

  it('fills an empty store on the first request instead of waiting for the hour', async () => {
    const e = env();
    const realFetch = globalThis.fetch;
    globalThis.fetch = fakeFetch;
    try {
      const r = await handle(new Request('https://feed.careercrash.org/crypto/latest.json'), e);
      expect(r.status).toBe(200);
      expect(e.store.has('crypto/latest')).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('serves latest, one hour and the list of hours, with CORS for the site', async () => {
    const e = env();
    await refresh(e, AT, fakeFetch);
    await refresh(e, AT - 3_600_000, fakeFetch);
    const get = (path: string, origin = 'https://careercrash.org') => handle(new Request(`https://feed.careercrash.org${path}`, { headers: { origin } }), e);
    const latest = await get('/crypto/latest.json');
    expect(latest.status).toBe(200);
    expect(latest.headers.get('access-control-allow-origin')).toBe('https://careercrash.org');
    expect(((await latest.json()) as { hour: string }).hour).toBe('2026-10-05T13');
    expect((await get('/crypto/2026-10-05T14.json')).status).toBe(200);
    expect(((await (await get('/crypto/hours.json')).json()) as { hours: string[] }).hours).toEqual(['2026-10-05T14', '2026-10-05T13']);
    expect((await get('/crypto/2026-10-05T09.json')).status).toBe(404);
    expect((await get('/crypto/../secret.json')).status).toBe(404);
    expect((await get('/crypto/latest.json', 'https://evil.example')).headers.get('access-control-allow-origin')).toBeNull();
  });
});
