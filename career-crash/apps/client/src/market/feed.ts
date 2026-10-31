import type { MarketSnapshot } from '@cc/game-rules';

export interface LoadedFeed {
  snapshot: MarketSnapshot;
  /** Sample data: the feed isn't reachable (not deployed yet, or offline). */
  sample: boolean;
  /** The period's own snapshot hasn't arrived yet: the last one's line-up carries on (08 §3). */
  delayed: boolean;
}

export interface MarketFeed {
  /**
   * The snapshot for a period (`hour`): its own when the feed has it; otherwise
   * the newest one, relabelled as this period (so everyone still sees the same
   * fight); otherwise the bundled sample.
   */
  load(hour: string): Promise<LoadedFeed>;
  /** The periods on file for Rewind, newest first (empty when the feed isn't reachable). */
  hours(): Promise<string[]>;
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

/** A market's feed (08 §10, apps/markets) at `base`, falling back to `sample`. */
export function marketFeed(base: string, sample: MarketSnapshot): MarketFeed {
  const feed = base.replace(/\/$/, '');
  return {
    async load(hour) {
      const own = await getJson<MarketSnapshot>(`${feed}/${hour}.json`);
      if (own?.coins?.length) return { snapshot: own, sample: false, delayed: false };
      const latest = await getJson<MarketSnapshot>(`${feed}/latest.json`);
      if (latest?.coins?.length && latest.hour <= hour) return { snapshot: { ...latest, hour }, sample: false, delayed: true };
      return { snapshot: { ...sample, hour }, sample: true, delayed: false };
    },
    async hours() {
      return (await getJson<{ hours: string[] }>(`${feed}/hours.json`))?.hours ?? [];
    },
  };
}
