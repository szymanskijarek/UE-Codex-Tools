/// <reference types="@cloudflare/workers-types" />
import { bundle } from '@cc/content';
import { countriesDef, floorClock } from '@cc/game-rules';
import { HOUR_RE, NETWORK_CAP, POW_BITS, type HourTallies, type LikeRequest, type LikeResponse, type TokenRequest, type VoteConfig } from '@cc/protocol/votes';
import { HourLedger, type Sql } from './ledger';
import { checkProof, checkToken, issueToken, networkOf, sha256Hex } from './token';

/**
 * The Diplomatic Incident vote service (09 §6) on vote.careercrash.org:
 * device tokens, likes, and each hour's tallies. Routes and shapes are in
 * packages/protocol/src/votes.ts.
 *
 * One Durable Object per hour (`HourTally`, named by the hour) holds that
 * hour's likes; it decides which session a like lands in by its own clock, so
 * a session's frozen tally is final the moment the session starts. A second,
 * single Durable Object (`VoteKeys`) makes and keeps the key that signs
 * device tokens, so there's no secret to set up by hand.
 */
export interface Env {
  HOURS: DurableObjectNamespace;
  KEYS: DurableObjectNamespace;
  /** Pages that may call the service from the browser, comma-separated. */
  ALLOWED_ORIGIN: string;
  /** "0" pauses likes (the kill switch, 09 §6.3): counts and tallies stay readable. */
  LIKES_OPEN?: string;
}

const DEF = countriesDef(bundle);
const HOUR_MS = 3_600_000;
/** Who liked what is forgotten this long after the hour ends (09 §6.4). */
const FORGET_AFTER_MS = 2 * HOUR_MS;

const hourStart = (hour: string) => Date.parse(`${hour}:00:00Z`);

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGIN.split(',').map((s) => s.trim());
  return allowed.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'origin' } : {};
}

function reply(req: Request, env: Env, status: number, body: unknown, maxAge = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store', ...cors(req, env) },
  });
}

let secret: Promise<string> | null = null;
/** The token-signing key, fetched once per isolate. */
function signingKey(env: Env): Promise<string> {
  secret ??= env.KEYS.get(env.KEYS.idFromName('v1'))
    .fetch('https://keys/key')
    .then((r) => r.text())
    .catch((e: Error) => {
      secret = null;
      throw e;
    });
  return secret;
}

const hourStub = (env: Env, hour: string) => env.HOURS.get(env.HOURS.idFromName(hour));

async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export async function handle(req: Request, env: Env, ctx?: ExecutionContext, now = Date.now()): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: { ...cors(req, env), 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
  const open = env.LIKES_OPEN !== '0';

  if (req.method === 'GET' && url.pathname === '/config') return reply(req, env, 200, { bits: POW_BITS, now, open } satisfies VoteConfig);

  if (req.method === 'POST' && url.pathname === '/token') {
    const body = await readJson<TokenRequest>(req);
    const id = body && (await checkProof(body, now));
    if (!id) return reply(req, env, 400, { error: 'bad proof', bits: POW_BITS });
    return reply(req, env, 200, await issueToken(await signingKey(env), id, now));
  }

  if (req.method === 'POST' && url.pathname === '/like') {
    if (!open) return reply(req, env, 503, { error: 'likes are paused' });
    const body = await readJson<LikeRequest>(req);
    if (!body || typeof body.country !== 'string' || !DEF.cast[body.country]) return reply(req, env, 400, { error: 'unknown country' });
    const id = await checkToken(await signingKey(env), body.token, now);
    if (!id) return reply(req, env, 401, { error: 'bad token' });
    const clock = floorClock(DEF, now);
    if (body.hour !== clock.hour) return reply(req, env, 410, { error: 'that hour is over', hour: clock.hour });
    const res = await hourStub(env, clock.hour).fetch('https://hour/like', {
      method: 'POST',
      body: JSON.stringify({
        hour: clock.hour,
        // One-way, and different every hour: the hour's file can't be joined to any other (09 §6.4).
        voter: await sha256Hex(`voter:${id}:${clock.hour}`),
        country: body.country,
        network: networkOf(req.headers.get('cf-connecting-ip') ?? ''),
      }),
    });
    return reply(req, env, res.status, await res.json());
  }

  const m = /^\/hour\/([\dT-]+)$/.exec(url.pathname);
  if (req.method === 'GET' && m && HOUR_RE.test(m[1]!)) {
    const hour = m[1]!;
    const want = Number(url.searchParams.get('s') ?? 0);
    const clock = floorClock(DEF, now);
    if (hour > clock.hour) return reply(req, env, 404, { error: 'not yet' });
    const finished = hour < clock.hour;
    const current = finished ? clock.candles - 1 : clock.candle;
    // Asked for a session that hasn't started on our clock (the page's clock runs ahead): try again shortly.
    if (!Number.isInteger(want) || want < 0 || want > clock.candles - 1) return reply(req, env, 400, { error: 'bad session' });
    if (want > current) return reply(req, env, 425, { error: 'session not started', session: current });
    // Shared by every viewer at this edge for a few seconds; a finished hour never changes.
    const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
    const key = new Request(`https://vote.cache/hour/${hour}/${current}`);
    const hit = await cache?.match(key);
    if (hit) return reply(req, env, 200, await hit.json(), finished ? 86400 : 5);
    const res = await hourStub(env, hour).fetch(`https://hour/tallies?hour=${hour}&current=${current}`);
    const tallies = (await res.json()) as HourTallies;
    const maxAge = finished ? 86400 : 5;
    const out = reply(req, env, 200, tallies, maxAge);
    if (cache) {
      const put = cache.put(key, new Response(JSON.stringify(tallies), { headers: { 'cache-control': `public, max-age=${maxAge}` } }));
      if (ctx) ctx.waitUntil(put);
      else await put;
    }
    return out;
  }

  return reply(req, env, 404, { error: 'not found' });
}

/** One hour's likes (named by the hour). */
export class HourTally {
  /** The clock that decides a like's session (tests move it). */
  static now = () => Date.now();
  private ledger: HourLedger;
  /** Likes per network and country this hour; memory only, never stored (09 §6.4). */
  private networks = new Map<string, number>();
  /** Salt for the network hashes, made per instance and never stored. */
  private salt = crypto.randomUUID();

  constructor(
    private state: DurableObjectState,
    _env: Env,
  ) {
    this.ledger = new HourLedger(state.storage.sql as unknown as Sql);
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.pathname === '/like') {
      const { hour, voter, country, network } = (await req.json()) as { hour: string; voter: string; country: string; network: string };
      // Our own clock decides the session, so nothing lands in a session that has already started.
      const clock = floorClock(DEF, HourTally.now());
      if (clock.hour !== hour) return json(410, { error: 'that hour is over', hour: clock.hour });
      const net = `${await sha256Hex(`${this.salt}:${network}`)}:${country}`;
      const seen = this.networks.get(net) ?? 0;
      if (seen >= NETWORK_CAP) return json(429, { error: 'too many likes from your network for this country this hour' });
      if (!this.ledger.like(voter, country, clock.candle)) return json(409, { hour, session: clock.candle } satisfies LikeResponse);
      this.networks.set(net, seen + 1);
      if ((await this.state.storage.getAlarm()) === null) await this.state.storage.setAlarm(hourStart(hour) + HOUR_MS + FORGET_AFTER_MS);
      return json(200, { hour, session: clock.candle } satisfies LikeResponse);
    }
    if (url.pathname === '/tallies') return json(200, this.ledger.tallies(url.searchParams.get('hour')!, Number(url.searchParams.get('current'))));
    return json(404, { error: 'not found' });
  }

  alarm(): void {
    this.ledger.purge();
    this.networks.clear();
  }
}

/** Makes the token-signing key once and keeps it. */
export class VoteKeys {
  constructor(
    private state: DurableObjectState,
    _env: Env,
  ) {}

  async fetch(): Promise<Response> {
    let key = await this.state.storage.get<string>('key');
    if (!key) {
      const b = crypto.getRandomValues(new Uint8Array(32));
      key = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      await this.state.storage.put('key', key);
    }
    return new Response(key);
  }
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handle(req, env, ctx),
} satisfies ExportedHandler<Env>;
