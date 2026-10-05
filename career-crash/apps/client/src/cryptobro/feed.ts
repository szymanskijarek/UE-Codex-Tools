import type { MarketSnapshot } from '@cc/game-rules';
import mock from './mock-feed.json';

/** Where the hourly worker publishes the snapshot (08 §10). */
const FEED_URL = '/cryptobro/feed/latest.json';

export interface LoadedFeed {
  snapshot: MarketSnapshot;
  /** Sample data (no live feed yet, or it failed). */
  sample: boolean;
}

/**
 * The hour's snapshot: the live one when the feed is up, otherwise the sample
 * snapshot relabelled as the current hour, so the floor still runs.
 */
export async function loadFeed(hour: string): Promise<LoadedFeed> {
  try {
    const r = await fetch(FEED_URL, { cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
      const snapshot = (await r.json()) as MarketSnapshot;
      if (snapshot?.coins?.length) return { snapshot, sample: false };
    }
  } catch {
    // Offline or not deployed yet: fall back to the sample.
  }
  return { snapshot: { ...(mock as MarketSnapshot), hour }, sample: true };
}
