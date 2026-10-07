import { bundle } from '@cc/content';
import { countriesDef, floorClock, sampleTally, type LikeTally } from '@cc/game-rules';
import { Rng } from '@cc/sim';

/**
 * Likes for the prototype (09 §12 phase 1), and the pipe they travel down.
 *
 * Until the vote service exists, everyone else's likes are a seeded sample
 * that grows through the hour (the "crowd"), and yours live in this browser
 * only: one per country per hour, counting from the next session, exactly as
 * they will once likes are real.
 *
 * A like can be cast from anywhere on careercrash.org (the Summit Hall itself,
 * or the career feed on the main site) with `castLike`. Every page shares the
 * same origin, so the like is stored once and an open Summit Hall hears about
 * it at once (`onLikes`: a BroadcastChannel, with the storage event as a
 * fallback). Phase 2's vote service plugs in as one more source on the same
 * pipe (`source: 'service'`).
 *
 * This module is imported by the main site too: keep it free of the page's
 * assets (flags, styles).
 */

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
  /** The session it was cast in: it counts from the next one. */
  session: number;
  source?: LikeSource;
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
  mine.push({ key, session, source });
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

/** The likes a session runs on: everyone's, frozen at its start, plus yours from earlier sessions. */
export function frozenTally(hour: string, session: number): LikeTally {
  const t = { ...sampleTally(DEF, hour, session) };
  for (const l of myLikes(hour)) if (l.session < session) t[l.key] = (t[l.key] ?? 0) + 1;
  return t;
}

/** The crowd's likes for `key` cast during this session (arriving at the next seam). */
function crowdPending(hour: string, session: number, key: string): number {
  const now = sampleTally(DEF, hour, session)[key] ?? 0;
  const next = session < 11 ? (sampleTally(DEF, hour, session + 1)[key] ?? 0) : now;
  return Math.max(0, next - now);
}

/** Likes cast during this session for `key` (the crowd's and yours), arriving at the next seam. */
export function pendingLikes(hour: string, session: number, key: string): number {
  const mine = myLikes(hour).some((l) => l.key === key && l.session === session) ? 1 : 0;
  return crowdPending(hour, session, key) + mine;
}

/**
 * When the crowd's likes land during a session, so the floor can show them
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
