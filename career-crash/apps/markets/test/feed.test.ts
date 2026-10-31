import { describe, expect, it } from 'vitest';
import type { CoinGeckoMarket } from '@cc/game-rules';
import { fromPaprika, handle, refresh, refreshStocks, type Env } from '../src/index';

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

  it('falls back to CoinPaprika when CoinGecko turns the Worker away', async () => {
    const e = env();
    const paprika = ROWS.map((r) => ({ symbol: r.symbol.toUpperCase(), rank: r.market_cap_rank, quotes: { USD: { price: r.current_price, percent_change_1h: r.price_change_percentage_1h_in_currency, percent_change_24h: -1 } } }));
    const mixed = (async (url: string) =>
      String(url).includes('coingecko') ? new Response('Forbidden', { status: 403 }) : new Response(JSON.stringify(paprika), { status: 200 })) as unknown as typeof fetch;
    const snap = await refresh(e, AT, mixed);
    expect(snap?.coins[0]).toMatchObject({ symbol: 'BTC', capRank: 1, changeBp: -225, change24Bp: -100 });
    expect(e.store.has('crypto/latest')).toBe(true);
    expect(fromPaprika([{ symbol: 'X', rank: 0 }])).toEqual([]);
  });

  it('says why when there is no snapshot', async () => {
    const e = env();
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('no', { status: 403 })) as unknown as typeof fetch;
    try {
      const r = await handle(new Request('https://feed.careercrash.org/crypto/latest.json'), e);
      expect(r.status).toBe(404);
      expect(await r.text()).toContain('CoinGecko: HTTP 403; CoinPaprika: HTTP 403');
    } finally {
      globalThis.fetch = realFetch;
    }
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

/** Alpaca's multi-symbol snapshot answer, for the stocks feed (13 §10.2). */
const STOCK_ROWS = Object.fromEntries(
  ['NVDA', 'MSFT', 'AAPL', 'GOOGL', 'AMZN', 'META', 'AVGO', 'TSLA', 'BRK.B', 'JPM', 'WMT', 'LLY', 'ORCL', 'V', 'SPY'].map((s, i) => [
    s,
    { latestTrade: { p: 100 + i }, prevDailyBar: { c: 100 }, dailyBar: { o: 100, c: 100 + i } },
  ]),
);

describe('stocks feed (13 §10.2)', () => {
  const OPEN = Date.parse('2026-11-02T15:00:20Z'); // Monday 10:00 New York
  const keyed = () => Object.assign(env(), { ALPACA_KEY_ID: 'id', ALPACA_SECRET: 'secret' });
  const calls: string[] = [];
  const alpaca = (async (url: string, init?: RequestInit) => {
    calls.push(`${url} ${(init?.headers as Record<string, string>)['APCA-API-KEY-ID']}`);
    return new Response(JSON.stringify(STOCK_ROWS), { status: 200 });
  }) as unknown as typeof fetch;

  it('stores one snapshot per half hour while the market trades, scored against SPY', async () => {
    const e = keyed();
    const snap = await refreshStocks(e, OPEN, alpaca);
    expect(snap?.hour).toBe('2026-11-02T15:00');
    expect(snap?.benchmarkBp).toBe(1400);
    expect(snap?.coins.find((c) => c.symbol === 'NVDA')).toMatchObject({ capRank: 1, changeBp: 0, price: 100, spark: [100, 100] });
    expect(snap?.coins.find((c) => c.symbol === 'BRK.B')?.changeBp).toBe(800);
    expect(calls[0]).toContain('feed=iex');
    expect(calls[0]).toContain('BRK.B');
    expect(calls[0]?.endsWith(' id')).toBe(true);
    expect(e.store.has('stocks/2026-11-02T15:00')).toBe(true);
    // The retry finds it on file; the next period carries the day's sparkline on.
    expect(await refreshStocks(e, OPEN + 120_000, alpaca)).toBeNull();
    const next = await refreshStocks(e, OPEN + 1_800_000, alpaca);
    expect(next?.coins.find((c) => c.symbol === 'NVDA')?.spark).toEqual([100, 100, 100]);
  });

  it('stays idle without keys and outside market hours', async () => {
    expect(await refreshStocks(env(), OPEN, alpaca)).toBeNull();
    expect(await refreshStocks(keyed(), Date.parse('2026-10-31T15:00:00Z'), alpaca)).toBeNull(); // Saturday
    expect(await refreshStocks(keyed(), Date.parse('2026-11-02T22:00:00Z'), alpaca)).toBeNull(); // after the close
  });

  it('serves stock periods next to crypto hours', async () => {
    const e = keyed();
    await refreshStocks(e, OPEN, alpaca);
    const req = (path: string) => new Request(`https://feed.careercrash.org${path}`, { headers: { origin: 'https://careercrash.org' } });
    const one = await handle(req('/stocks/2026-11-02T15:00.json'), e);
    expect(one.status).toBe(200);
    expect(one.headers.get('access-control-allow-origin')).toBe('https://careercrash.org');
    expect(((await (await handle(req('/stocks/hours.json'), e)).json()) as { hours: string[] }).hours).toEqual(['2026-11-02T15:00']);
    expect((await handle(req('/stocks/latest.json'), e)).status).toBe(200);
    expect((await handle(req('/stocks/2026-11-02T15.json'), e)).status).toBe(404);
  });
});
