import { sampleTally, type LikeTally } from '@cc/game-rules';
import { DEF } from './countries';

/**
 * Likes for the prototype (09 §12 phase 1). Until the vote service exists,
 * everyone else's likes are a seeded sample that grows through the hour, and
 * your own live in this browser only: one per country per hour, counting from
 * the next session, exactly as they will once likes are real.
 */
interface MyLike {
  key: string;
  /** The session it was cast in: it counts from the next one. */
  session: number;
}

const storeKey = (hour: string) => `incident:likes:${hour}`;

export function myLikes(hour: string): MyLike[] {
  try {
    const raw = localStorage.getItem(storeKey(hour));
    return raw ? (JSON.parse(raw) as MyLike[]) : [];
  } catch {
    return [];
  }
}

export function like(hour: string, key: string, session: number): boolean {
  const mine = myLikes(hour);
  if (mine.some((l) => l.key === key)) return false;
  mine.push({ key, session });
  try {
    localStorage.setItem(storeKey(hour), JSON.stringify(mine));
    // Keep only this hour and the last: likes reset every hour.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('incident:likes:') && k !== storeKey(hour)) localStorage.removeItem(k);
    }
  } catch {
    // Private mode: the like still counts for this page view.
  }
  return true;
}

/** The likes a session runs on: everyone's, frozen at its start, plus yours from earlier sessions. */
export function frozenTally(hour: string, session: number): LikeTally {
  const t = { ...sampleTally(DEF, hour, session) };
  for (const l of myLikes(hour)) if (l.session < session) t[l.key] = (t[l.key] ?? 0) + 1;
  return t;
}

/** Likes cast during this session for `key`, arriving at the next seam. */
export function pendingLikes(hour: string, session: number, key: string): number {
  const now = sampleTally(DEF, hour, session)[key] ?? 0;
  const next = session < 11 ? (sampleTally(DEF, hour, session + 1)[key] ?? 0) : now;
  const mine = myLikes(hour).some((l) => l.key === key && l.session === session) ? 1 : 0;
  return Math.max(0, next - now) + mine;
}
