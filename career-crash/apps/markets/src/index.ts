/// <reference types="@cloudflare/workers-types" />
import { bundle } from '@cc/content';
import { alpacaSymbols, floorClock, hourOf, sessionState, snapshotFromAlpaca, snapshotFromCoinGecko, type AlpacaSnapshot, type CoinGeckoMarket, type MarketSnapshot } from '@cc/game-rules';

/**
 * The market feeds. Crypto Bros (08 §10): at the top of the hour, the top coins
 * from CoinGecko, kept 48 hours for Rewind. Regards, Wall Street (13 §10.2):
 * every half hour while the New York market trades, the stocks from Alpaca,
 * kept two weeks. HTTP: serve them to the pages.
 *
 *   GET /crypto/latest.json   the newest snapshot (likewise /stocks/…)
 *   GET /crypto/<hour>.json   one hour, e.g. /crypto/2026-10-05T14.json; /stocks/2026-11-02T14:30.json
 *   GET /crypto/hours.json    the hours (periods) on file, newest first
 */
export interface Env {
  FEED: KVNamespace;
  ALLOWED_ORIGIN: string;
  COINGECKO_KEY?: string;
  /** Alpaca market data keys (free Basic plan); without them the stocks feed stays idle. */
  ALPACA_KEY_ID?: string;
  ALPACA_SECRET?: string;
}

const MARKET = 'market.crypto';
const KEEP_S = 49 * 3600;
const HOUR_RE = { crypto: /^\d{4}-\d{2}-\d{2}T\d{2}$/, stocks: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ };
const STOCKS = 'market.stocks';
const STOCKS_KEEP_S = 14 * 86400;
const ALPACA = 'https://data.alpaca.markets/v2/stocks/snapshots';
const API = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&price_change_percentage=1h,24h&sparkline=true';

/** CoinPaprika's tickers (keyless): the fallback when CoinGecko turns the Worker away. */
const PAPRIKA = 'https://api.coinpaprika.com/v1/tickers?quotes=USD&limit=60';
interface PaprikaTicker {
  symbol: string;
  rank: number;
  quotes?: { USD?: { price?: number; percent_change_1h?: number; percent_change_24h?: number } };
}

/** CoinPaprika rows in CoinGecko's shape (no sparkline: the ticker draws without it). */
export function fromPaprika(rows: PaprikaTicker[]): CoinGeckoMarket[] {
  return rows
    .filter((r) => r.rank > 0 && r.quotes?.USD?.price)
    .map((r) => ({
      id: r.symbol.toLowerCase(),
      symbol: r.symbol.toLowerCase(),
      current_price: r.quotes!.USD!.price!,
      market_cap_rank: r.rank,
      price_change_percentage_1h_in_currency: r.quotes!.USD!.percent_change_1h ?? 0,
      price_change_percentage_24h_in_currency: r.quotes!.USD!.percent_change_24h ?? 0,
    }));
}

async function getRows(env: Env, fetchImpl: typeof fetch): Promise<CoinGeckoMarket[]> {
  const ua = { accept: 'application/json', 'user-agent': 'careercrash.org market feed' };
  const errors: string[] = [];
  try {
    const r = await fetchImpl(API, { headers: { ...ua, ...(env.COINGECKO_KEY ? { 'x-cg-demo-api-key': env.COINGECKO_KEY } : {}) } });
    if (r.ok) return (await r.json()) as CoinGeckoMarket[];
    errors.push(`CoinGecko: HTTP ${r.status}`);
  } catch (e) {
    errors.push(`CoinGecko: ${(e as Error).message}`);
  }
  try {
    const r = await fetchImpl(PAPRIKA, { headers: ua });
    if (r.ok) return fromPaprika((await r.json()) as PaprikaTicker[]);
    errors.push(`CoinPaprika: HTTP ${r.status}`);
  } catch (e) {
    errors.push(`CoinPaprika: ${(e as Error).message}`);
  }
  throw new Error(errors.join('; '));
}

export async function refresh(env: Env, now: number, fetchImpl: typeof fetch = fetch): Promise<MarketSnapshot | null> {
  const hour = hourOf(now);
  // The second cron of the hour only runs if the first one didn't store anything.
  if (await env.FEED.get(`crypto/${hour}`)) return null;
  const rows = await getRows(env, fetchImpl);
  const def = bundle.markets.find((m) => m.id === MARKET)!;
  const snap = snapshotFromCoinGecko(rows, hour, def.id);
  if (snap.coins.length < def.field) throw new Error(`only ${snap.coins.length} coins`);
  const body = JSON.stringify(snap);
  await env.FEED.put(`crypto/${hour}`, body, { expirationTtl: KEEP_S });
  await env.FEED.put('crypto/latest', body);
  return snap;
}

/**
 * The stocks period's snapshot (13 §10.2), once per half-hour period while the
 * market trades; the retry two minutes later only runs if the first didn't
 * store anything. Returns null when there's nothing to do.
 */
export async function refreshStocks(env: Env, now: number, fetchImpl: typeof fetch = fetch): Promise<MarketSnapshot | null> {
  if (!env.ALPACA_KEY_ID || !env.ALPACA_SECRET) return null;
  const def = bundle.markets.find((m) => m.id === STOCKS)!;
  if (sessionState(def, now).phase !== 'open') return null;
  const period = floorClock(def, now).hour;
  if (await env.FEED.get(`stocks/${period}`)) return null;
  const r = await fetchImpl(`${ALPACA}?symbols=${encodeURIComponent(alpacaSymbols(def).join(','))}&feed=iex`, {
    headers: { accept: 'application/json', 'APCA-API-KEY-ID': env.ALPACA_KEY_ID, 'APCA-API-SECRET-KEY': env.ALPACA_SECRET },
  });
  if (!r.ok) throw new Error(`Alpaca: HTTP ${r.status}`);
  const prev = await env.FEED.get('stocks/latest');
  const snap = snapshotFromAlpaca(def, (await r.json()) as Record<string, AlpacaSnapshot>, period, prev ? (JSON.parse(prev) as MarketSnapshot) : null);
  if (snap.coins.length < def.field) throw new Error(`only ${snap.coins.length} stocks`);
  const body = JSON.stringify(snap);
  await env.FEED.put(`stocks/${period}`, body, { expirationTtl: STOCKS_KEEP_S });
  await env.FEED.put('stocks/latest', body);
  return snap;
}

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGIN.split(',').map((s) => s.trim());
  return allowed.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'origin' } : {};
}

function json(body: string, req: Request, env: Env, maxAge: number): Response {
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${maxAge}`, ...cors(req, env) } });
}

export async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(req, env), 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const m = /^\/(crypto|stocks)\/([\w:-]+)\.json$/.exec(url.pathname);
  if (!m) return new Response('Not found', { status: 404, headers: cors(req, env) });
  const market = m[1] as 'crypto' | 'stocks';
  const name = m[2]!;
  if (name === 'latest') {
    let body = await env.FEED.get(`${market}/latest`);
    let why = '';
    // A brand-new deploy has nothing on file yet: fill it now rather than at the top of the hour.
    if (!body)
      body = await (market === 'crypto' ? refresh(env, Date.now()) : refreshStocks(env, Date.now())).then(
        (s) => (s ? JSON.stringify(s) : null),
        (e: Error) => ((why = e.message), console.error('feed refresh failed:', why), null),
      );
    return body ? json(body, req, env, 60) : new Response(`No snapshot yet${why ? ` (${why})` : ''}`, { status: 404, headers: cors(req, env) });
  }
  if (name === 'hours') {
    const list = await env.FEED.list({ prefix: `${market}/2` });
    const hours = list.keys.map((k) => k.name.slice(market.length + 1)).sort().reverse();
    return json(JSON.stringify({ hours }), req, env, 60);
  }
  if (!HOUR_RE[market].test(name)) return new Response('Not found', { status: 404, headers: cors(req, env) });
  const body = await env.FEED.get(`${market}/${name}`);
  // A finished hour never changes; the current one may still be filled in.
  const current = market === 'crypto' ? hourOf(Date.now()) : floorClock(bundle.markets.find((d) => d.id === STOCKS)!, Date.now()).hour;
  return body ? json(body, req, env, name < current ? 86400 : 60) : new Response('Not found', { status: 404, headers: cors(req, env) });
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
  // One cron at :00, :02, :30 and :32: crypto on the hour (and its retry), stocks every half hour while New York trades.
  scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const minute = new Date(event.scheduledTime).getUTCMinutes();
    if (minute < 30) ctx.waitUntil(refresh(env, event.scheduledTime).then(() => undefined, (e: Error) => console.error('feed refresh failed:', e.message)));
    ctx.waitUntil(refreshStocks(env, event.scheduledTime).then(() => undefined, (e: Error) => console.error('stocks refresh failed:', e.message)));
  },
} satisfies ExportedHandler<Env>;
