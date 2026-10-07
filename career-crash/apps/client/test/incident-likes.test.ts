import { beforeEach, describe, expect, it } from 'vitest';

// The page's browser bits, for node: storage and window events (BroadcastChannel is built in).
const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  },
  window: { addEventListener: () => {}, removeEventListener: () => {} },
});

const likes = await import('../src/incident/likes');
const { castLike, crowdStream, hasLiked, likeClock, onLikes } = likes;
/** The prototype (no vote service in tests) always has a tally. */
const frozenTally = (hour: string, session: number) => likes.frozenTally(hour, session)!;

const AT = Date.parse('2026-10-06T14:12:00Z');

describe('the like pipe (09), prototype mode', () => {
  beforeEach(() => store.clear());

  it('a like cast from the career feed lands in the Summit Hall: once per country per hour, counting from the next session', () => {
    const { hour, session } = likeClock(AT);
    expect(session).toBe(2);
    const heard: string[] = [];
    const off = onLikes((e) => heard.push(`${e.key}:${e.source}:${e.mine}`));
    expect(castLike('PL', 'careercrash', AT)).toBe(true);
    expect(castLike('PL', 'hall', AT + 1000)).toBe(false);
    expect(castLike('XX', 'hall', AT)).toBe(false);
    expect(hasLiked('PL', AT)).toBe(true);
    // Heard once, at once, in the same tab.
    expect(heard).toEqual(['PL:careercrash:true']);
    off();
    expect(frozenTally(hour, session + 1).PL! - frozenTally(hour, session).PL!).toBeGreaterThanOrEqual(1);
    const plain = frozenTally(hour, session + 1).PL!;
    store.clear();
    expect(frozenTally(hour, session + 1).PL).toBe(plain - 1);
    // A new hour, a new like.
    expect(castLike('PL', 'hall', AT + 3_600_000)).toBe(true);
  });

  it('the crowd likes arrive in seeded bunches through the session, adding up to what the next session counts', () => {
    const { hour, session } = likeClock(AT);
    const a = crowdStream(hour, session, 5920);
    expect(crowdStream(hour, session, 5920)).toEqual(a);
    expect(a.length).toBeGreaterThan(40);
    expect(a.every((x, i) => x.tick >= 20 && x.tick < 5920 && (i === 0 || a[i - 1]!.tick <= x.tick))).toBe(true);
    const now = frozenTally(hour, session);
    const next = frozenTally(hour, session + 1);
    const sum = new Map<string, number>();
    for (const x of a) sum.set(x.key, (sum.get(x.key) ?? 0) + x.n);
    for (const [k, n] of sum) expect(n, k).toBe(next[k]! - now[k]!);
  });
});
