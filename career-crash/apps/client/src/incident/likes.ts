import { bundle } from '@cc/content';
import { countriesDef, floorClock, sampleTally, summitTotals, type LikeTally, type SummitHour } from '@cc/game-rules';
import type { HourTallies, LikeResponse, TokenResponse, VoteConfig } from '@cc/protocol/votes';
import { Rng } from '@cc/sim';
import { solve } from './pow';

/**
 * Likes, and the pipe they travel down (09 §5–6).
 *
 * On careercrash.org likes are real: each one goes to the vote service
 * (vote.careercrash.org, apps/votes), which counts one per device per country
 * per hour, and every session runs on the service's frozen tally for it, so
 * every viewer sees the same fight. A device earns its token with a second or
 * so of proof of work, done in the background.
 *
 * Without a service (local dev, the single-file build) it's the phase 1
 * prototype: everyone else's likes are a seeded sample that grows through the
 * hour (the "crowd"), and yours live in this browser only.
 *
 * A like can be cast from anywhere on careercrash.org (the Summit Hall itself,
 * or the career feed on the main site) with `castLike`. Every page shares the
 * same origin, so the like is stored once and an open Summit Hall hears about
 * it at once (`onLikes`: a BroadcastChannel, with the storage event as a
 * fallback). A like that can't reach the service yet waits in this browser
 * and is sent as soon as it can be, within the hour.
 *
 * This module is imported by the main site too: keep it free of the page's
 * assets (flags, styles).
 */

/** The vote service, or '' for the prototype's sample crowd. `VITE_VOTE_URL` points a dev build at a local one (`pnpm dev:votes`). */
export const VOTE_URL: string = ((import.meta.env?.VITE_VOTE_URL as string | undefined) ?? (import.meta.env?.PROD && import.meta.env?.VITE_INLINE !== '1' ? 'https://vote.careercrash.org' : '')).replace(/\/$/, '');

/** Where a like came from. */
export type LikeSource = 'hall' | 'careercrash' | 'crowd' | 'service';

export interface LikeEvent {
  key: string;
  /** How many likes this event stands for (the crowd's arrive in bunches). */
  n: number;
  source: LikeSource;
  /** Yours (this browser), as opposed to other viewers'. */
  mine: boolean;
  hour: string;
  session: number;
}

interface MyLike {
  key: string;
  /** The session it was cast in (the service's, once it has answered): it counts from the next one. */
  session: number;
  source?: LikeSource;
  /** The vote service has it (or there is no service). */
  sent?: boolean;
}

const DEF = countriesDef(bundle);
const CHANNEL = 'incident:likes';
const storeKey = (hour: string) => `incident:likes:${hour}`;

/** The floor's clock at `nowMs` (the hour and session a like lands in). */
export function likeClock(nowMs = Date.now()): { hour: string; session: number } {
  const c = floorClock(DEF, nowMs);
  return { hour: c.hour, session: c.candle };
}

export function myLikes(hour: string): MyLike[] {
  try {
    const raw = localStorage.getItem(storeKey(hour));
    return raw ? (JSON.parse(raw) as MyLike[]) : [];
  } catch {
    return [];
  }
}

/** Have you liked this country this hour (from any page)? */
export function hasLiked(key: string, nowMs = Date.now()): boolean {
  return myLikes(likeClock(nowMs).hour).some((l) => l.key === key);
}

// Same-tab listeners: BroadcastChannel doesn't deliver to the tab that sent it.
const local = new Set<(e: LikeEvent) => void>();

/**
 * Cast your like for `key` (one per country per hour, whichever page it comes
 * from). Returns false if you've already liked them this hour.
 */
export function castLike(key: string, source: Exclude<LikeSource, 'crowd'>, nowMs = Date.now()): boolean {
  if (!DEF.cast[key]) return false;
  const { hour, session } = likeClock(nowMs);
  const mine = myLikes(hour);
  if (mine.some((l) => l.key === key)) return false;
  mine.push({ key, session, source, sent: !VOTE_URL });
  try {
    localStorage.setItem(storeKey(hour), JSON.stringify(mine));
    // Keep only this hour: likes reset every hour.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('incident:likes:') && k !== storeKey(hour)) localStorage.removeItem(k);
    }
  } catch {
    // Private mode: the like still counts for this page view.
  }
  const ev: LikeEvent = { key, n: 1, source, mine: true, hour, session };
  for (const f of local) f(ev);
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(ev);
    ch.close();
  } catch {
    // No BroadcastChannel: other tabs still see the storage event.
  }
  void flush();
  return true;
}

/**
 * Hear every like as it's cast: yours from any page or tab, and (phase 2)
 * the vote service's. The crowd's sample likes come from `crowdStream`.
 * Returns an unsubscribe function.
 */
export function onLikes(cb: (e: LikeEvent) => void): () => void {
  const seen = new Set<string>();
  const id = (e: Pick<LikeEvent, 'hour' | 'key'>) => `${e.hour}:${e.key}`;
  const deliver = (e: LikeEvent) => {
    // A like can arrive twice (channel and storage event): pass it on once.
    if (seen.has(id(e))) return;
    seen.add(id(e));
    cb(e);
  };
  local.add(deliver);
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (m: MessageEvent<LikeEvent>) => {
      if (m.data && typeof m.data.key === 'string' && DEF.cast[m.data.key]) deliver(m.data);
    };
  } catch {
    ch = null;
  }
  const onStorage = (s: StorageEvent) => {
    if (!s.key?.startsWith('incident:likes:') || !s.newValue) return;
    const hour = s.key.slice('incident:likes:'.length);
    const before = new Set((s.oldValue ? (JSON.parse(s.oldValue) as MyLike[]) : []).map((l) => l.key));
    for (const l of JSON.parse(s.newValue) as MyLike[]) if (!before.has(l.key)) deliver({ key: l.key, n: 1, source: l.source ?? 'hall', mine: true, hour, session: l.session });
  };
  window.addEventListener('storage', onStorage);
  return () => {
    local.delete(deliver);
    ch?.close();
    window.removeEventListener('storage', onStorage);
  };
}

function saveMine(hour: string, mine: MyLike[]): void {
  try {
    localStorage.setItem(storeKey(hour), JSON.stringify(mine));
  } catch {
    // no storage
  }
}

// ---- The vote service -------------------------------------------------------

const TOKEN_KEY = 'incident:token';
let tokenJob: Promise<string | null> | null = null;

async function call<T>(path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${VOTE_URL}${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    // no body
  }
  return { status: res.status, data };
}

/** This device's vote token: kept for a week, earned with a short proof of work when there isn't one. */
export function voteToken(): Promise<string | null> {
  if (!VOTE_URL) return Promise.resolve(null);
  try {
    const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as TokenResponse | null;
    if (saved && saved.expires > Date.now() + 3_600_000) return Promise.resolve(saved.token);
  } catch {
    // none saved
  }
  tokenJob ??= (async () => {
    try {
      const cfg = await call<VoteConfig>('/config');
      if (!cfg.data) return null;
      const proof = await solve(new Date(cfg.data.now).toISOString().slice(0, 10), cfg.data.bits);
      const res = await call<TokenResponse>('/token', proof);
      if (res.status !== 200 || !res.data) return null;
      try {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(res.data));
      } catch {
        // kept for this page view only
      }
      return res.data.token;
    } catch {
      return null;
    } finally {
      tokenJob = null;
    }
  })();
  return tokenJob;
}

function forgetToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no storage
  }
}

let flushing: Promise<void> | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;

/** Sends this hour's likes the service hasn't got yet. Safe to call any time; retries on its own while any are left. */
export function flush(): Promise<void> {
  if (!VOTE_URL) return Promise.resolve();
  flushing ??= (async () => {
    const { hour } = likeClock();
    let left = false;
    const tried = new Set<string>();
    // Re-read each time: a like cast while this runs is picked up too.
    for (let l = myLikes(hour).find((x) => !x.sent); l; l = myLikes(hour).find((x) => !x.sent && !tried.has(x.key))) {
      tried.add(l.key);
      let token = await voteToken();
      if (!token) {
        left = true;
        break;
      }
      let res: Awaited<ReturnType<typeof call<LikeResponse>>>;
      try {
        res = await call<LikeResponse>('/like', { token, country: l.key, hour });
        if (res.status === 401) {
          forgetToken();
          token = await voteToken();
          if (token) res = await call<LikeResponse>('/like', { token, country: l.key, hour });
        }
      } catch {
        left = true;
        break;
      }
      const mine = myLikes(hour);
      const rec = mine.find((x) => x.key === l.key);
      if (!rec) continue;
      if (res.status === 200 || res.status === 409) {
        rec.sent = true;
        if (res.data && res.data.hour === hour) rec.session = res.data.session;
      } else if (res.status === 410 || res.status === 400) {
        // The hour is over (or the country is unknown): it can't count any more.
        mine.splice(mine.indexOf(rec), 1);
      } else {
        // Paused, capped or the service is down: try again later.
        left = true;
        continue;
      }
      saveMine(hour, mine);
    }
    if (left && !retry) retry = setTimeout(() => ((retry = null), void flush()), 15_000);
  })().finally(() => {
    flushing = null;
    // A like cast just as this run finished: send it now (failed ones wait for the retry).
    if (!retry && myLikes(likeClock().hour).some((x) => !x.sent)) void flush();
  });
  return flushing;
}

interface HourEntry {
  data: HourTallies;
  /** Your confirmed likes in the current session when it was asked for (the service's pending count includes them). */
  mineThen: Set<string>;
}
const hours = new Map<string, HourEntry>();

/**
 * Fetches the hour's tallies up to `session` (and the likes still arriving).
 * Retries while the service says the session hasn't started on its clock yet.
 * True once they're in.
 */
export async function loadHour(hour: string, session: number, tries = 12): Promise<boolean> {
  if (!VOTE_URL) return true;
  for (let i = 0; i < tries; i++) {
    const mineThen = new Set(myLikes(hour).filter((l) => l.sent && l.session === session).map((l) => l.key));
    try {
      const res = await call<HourTallies>(`/hour/${hour}?s=${session}`);
      if (res.status === 200 && res.data) {
        const had = hours.get(hour);
        // Keep the newest answer (an edge cache can hand back one a few seconds old).
        if (!had || res.data.session >= had.data.session) hours.set(hour, { data: res.data, mineThen });
        return true;
      }
      // Not started yet on the service's clock (425), or a passing server error: try again. Anything else won't change.
      if (res.status !== 425 && res.status < 500) return false;
    } catch {
      // offline or the service is down
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/**
 * The likes session `session` runs on: everyone's, frozen at its start.
 * Null while the service hasn't said (see `loadHour`).
 */
export function frozenTally(hour: string, session: number): LikeTally | null {
  if (VOTE_URL) return hours.get(hour)?.data.frozen[session] ?? null;
  const t = { ...sampleTally(DEF, hour, session) };
  for (const l of myLikes(hour)) if (l.session < session) t[l.key] = (t[l.key] ?? 0) + 1;
  return t;
}

/**
 * The best tally on hand for a session the service couldn't answer for
 * ("counting delayed", 09 §6.1): the latest earlier session's, else none.
 */
export function fallbackTally(hour: string, session: number): LikeTally {
  for (let s = session; s >= 0; s--) {
    const t = frozenTally(hour, s);
    if (t) return t;
  }
  return {};
}

/** Everyone else's likes cast during this session so far, by country (arriving at the next seam). */
export function othersPending(hour: string, session: number): LikeTally {
  if (!VOTE_URL) {
    const out: LikeTally = {};
    for (const key of Object.keys(DEF.cast)) out[key] = crowdPending(hour, session, key);
    return out;
  }
  const e = hours.get(hour);
  if (!e || e.data.session !== session) return {};
  const out: LikeTally = {};
  for (const [k, n] of Object.entries(e.data.pending)) out[k] = Math.max(0, n - (e.mineThen.has(k) ? 1 : 0));
  return out;
}

/** The crowd's likes for `key` cast during this session (arriving at the next seam). */
function crowdPending(hour: string, session: number, key: string): number {
  const now = sampleTally(DEF, hour, session)[key] ?? 0;
  const next = session < 11 ? (sampleTally(DEF, hour, session + 1)[key] ?? 0) : now;
  return Math.max(0, next - now);
}

/**
 * Prototype only: when the sample crowd's likes land during a session, so the floor can show them
 * (09: a beam of light per bunch). The same for every viewer: seeded per
 * session. Each country's pending likes come in a few bunches (more for more
 * likes, at most 16), at seeded ticks; sorted by tick.
 */
export function crowdStream(hour: string, session: number, ticks: number): { tick: number; key: string; n: number }[] {
  const rng = Rng.fromSeed(`crowd-likes:${DEF.id}:${hour}#${session}`);
  const out: { tick: number; key: string; n: number }[] = [];
  for (const key of Object.keys(DEF.cast).sort()) {
    const p = crowdPending(hour, session, key);
    if (!p) continue;
    const bunches = Math.min(16, Math.max(1, Math.floor(Math.log2(1 + p) * 2)));
    for (let i = 0; i < bunches; i++) out.push({ tick: 20 + rng.int(Math.max(1, ticks - 40)), key, n: Math.floor(p / bunches) + (i < p % bunches ? 1 : 0) });
  }
  return out.sort((a, b) => a.tick - b.tick || (a.key < b.key ? -1 : 1));
}

// ---- The last finished hour (career mode's nationality boost) --------------

const SUMMIT_KEY = 'incident:summit';
let summitMem: SummitHour | null = null;

/** The hour before the one `now` is in, e.g. "2026-10-07T13". */
export function previousHour(now = Date.now()): string {
  return new Date(Math.floor(now / 3_600_000) * 3_600_000 - 3_600_000).toISOString().slice(0, 13);
}

/** The last finished Summit hour's likes, if fetched already (null without a vote service). */
export function lastSummit(now = Date.now()): SummitHour | null {
  const hour = previousHour(now);
  if (summitMem?.hour === hour) return summitMem;
  try {
    const saved = JSON.parse(localStorage.getItem(SUMMIT_KEY) ?? 'null') as SummitHour | null;
    if (saved?.hour === hour) return (summitMem = saved);
  } catch {
    // none saved
  }
  return null;
}

/** Fetches the last finished hour's likes (once per hour; a finished hour never changes). */
export async function loadLastSummit(now = Date.now()): Promise<SummitHour | null> {
  if (!VOTE_URL) return null;
  const have = lastSummit(now);
  if (have) return have;
  const hour = previousHour(now);
  try {
    const res = await call<HourTallies>(`/hour/${hour}?s=11`);
    if (res.status !== 200 || !res.data) return null;
    summitMem = { hour, totals: summitTotals(res.data.frozen, res.data.pending) };
    try {
      localStorage.setItem(SUMMIT_KEY, JSON.stringify(summitMem));
    } catch {
      // kept for this page view
    }
    return summitMem;
  } catch {
    return null;
  }
}
