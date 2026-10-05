/// <reference types="@cloudflare/workers-types" />
import { bundle } from '@cc/content';
import { hourOf, snapshotFromCoinGecko, type CoinGeckoMarket, type MarketSnapshot } from '@cc/game-rules';

/**
 * The Crypto Bros market feed (08 §10). Cron: fetch the top coins from
 * CoinGecko at the top of the hour and keep that hour's snapshot (48 hours of
 * them, for Rewind). HTTP: serve them to the page.
 *
 *   GET /crypto/latest.json   the newest snapshot
 *   GET /crypto/<hour>.json   one hour, e.g. /crypto/2026-10-05T14.json
 *   GET /crypto/hours.json    the hours on file, newest first
 */
export interface Env {
  FEED: KVNamespace;
  ALLOWED_ORIGIN: string;
  COINGECKO_KEY?: string;
}

const MARKET = 'market.crypto';
const KEEP_S = 49 * 3600;
const HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}$/;
const API = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&price_change_percentage=1h,24h&sparkline=true';

export async function refresh(env: Env, now: number, fetchImpl: typeof fetch = fetch): Promise<MarketSnapshot | null> {
  const hour = hourOf(now);
  // The second cron of the hour only runs if the first one didn't store anything.
  if (await env.FEED.get(`crypto/${hour}`)) return null;
  const r = await fetchImpl(API, { headers: { accept: 'application/json', 'user-agent': 'careercrash.org market feed', ...(env.COINGECKO_KEY ? { 'x-cg-demo-api-key': env.COINGECKO_KEY } : {}) } });
  if (!r.ok) throw new Error(`CoinGecko: HTTP ${r.status}`);
  const rows = (await r.json()) as CoinGeckoMarket[];
  const def = bundle.markets.find((m) => m.id === MARKET)!;
  const snap = snapshotFromCoinGecko(rows, hour, def.id);
  if (snap.coins.length < def.field) throw new Error(`CoinGecko: only ${snap.coins.length} coins`);
  const body = JSON.stringify(snap);
  await env.FEED.put(`crypto/${hour}`, body, { expirationTtl: KEEP_S });
  await env.FEED.put('crypto/latest', body);
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
  const m = /^\/crypto\/([\w-]+)\.json$/.exec(url.pathname);
  if (!m) return new Response('Not found', { status: 404, headers: cors(req, env) });
  const name = m[1]!;
  if (name === 'latest') {
    let body = await env.FEED.get('crypto/latest');
    // A brand-new deploy has nothing on file yet: fill it now rather than at the top of the hour.
    if (!body) body = await refresh(env, Date.now()).then((s) => (s ? JSON.stringify(s) : null), () => null);
    return body ? json(body, req, env, 60) : new Response('No snapshot yet', { status: 404, headers: cors(req, env) });
  }
  if (name === 'hours') {
    const list = await env.FEED.list({ prefix: 'crypto/2' });
    const hours = list.keys.map((k) => k.name.slice('crypto/'.length)).sort().reverse();
    return json(JSON.stringify({ hours }), req, env, 60);
  }
  if (!HOUR_RE.test(name)) return new Response('Not found', { status: 404, headers: cors(req, env) });
  const body = await env.FEED.get(`crypto/${name}`);
  // A finished hour never changes; the current one may still be filled in.
  return body ? json(body, req, env, name < hourOf(Date.now()) ? 86400 : 60) : new Response('Not found', { status: 404, headers: cors(req, env) });
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
  scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(refresh(env, event.scheduledTime).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
