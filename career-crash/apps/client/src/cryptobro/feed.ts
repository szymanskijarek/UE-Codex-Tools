import type { MarketSnapshot } from '@cc/game-rules';
import mock from './mock-feed.json';

/**
 * Where the hourly feed worker serves snapshots (08 §10, apps/markets).
 * `VITE_FEED_URL` points dev builds at a local `wrangler dev` (http://localhost:8788/crypto).
 */
const FEED = ((import.meta.env?.VITE_FEED_URL as string | undefined) ?? 'https://feed.careercrash.org/crypto').replace(/\/$/, '');

export interface LoadedFeed {
  snapshot: MarketSnapshot;
  /** Sample data: the feed isn't reachable (not deployed yet, or offline). */
  sample: boolean;
  /** The hour's own snapshot hasn't arrived yet: last hour's bros carry on (08 §3). */
  delayed: boolean;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/**
 * The snapshot for `hour`: that hour's own when the feed has it; otherwise the
 * newest one, relabelled as this hour (so everyone still sees the same fight);
 * otherwise the bundled sample.
 */
export async function loadFeed(hour: string): Promise<LoadedFeed> {
  const own = await getJson<MarketSnapshot>(`${FEED}/${hour}.json`);
  if (own?.coins?.length) return { snapshot: own, sample: false, delayed: false };
  const latest = await getJson<MarketSnapshot>(`${FEED}/latest.json`);
  if (latest?.coins?.length && latest.hour <= hour) return { snapshot: { ...latest, hour }, sample: false, delayed: true };
  return { snapshot: { ...(mock as MarketSnapshot), hour }, sample: true, delayed: false };
}

/** The hours on file for Rewind, newest first (empty when the feed isn't reachable). */
export async function listHours(): Promise<string[]> {
  return (await getJson<{ hours: string[] }>(`${FEED}/hours.json`))?.hours ?? [];
}
