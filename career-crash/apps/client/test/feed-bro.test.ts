import { bundle } from '@cc/content';
import { generateRecruit } from '@cc/game-rules';
import { Rng } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { discussion, fightPosts } from '../src/career/feed';
import type { CareerSave, FightSummary } from '../src/career/model';

function save(seed: string): CareerSave {
  const c = generateRecruit(bundle, Rng.fromSeed(seed), `main-${seed}`);
  return {
    v: 1,
    seed,
    difficulty: 'normal',
    mainId: c.id,
    chars: { [c.id]: { c, careerXp: {}, nodes: [] } },
    squad: [],
    stage: 1,
    cash: 300,
    applicants: [],
    pending: null,
    last: null,
    wins: 0,
    losses: 0,
    inventory: {},
    company: { adjective: 0, noun: 0, suffix: 0 },
  } as unknown as CareerSave;
}

function fight(outcome: FightSummary['outcome']): FightSummary {
  return { stage: 0, outcome, cash: 50, pay: {}, board: [], growth: [], unlockedSquad: false } as unknown as FightSummary;
}

describe('crypto bro posts in the career feed (08)', () => {
  it('after every fight, a bro posts 2nd or 3rd, linking to the Crypto Bros page', () => {
    for (let i = 0; i < 30; i++) {
      const s = save(`bro-${i}`);
      const posts = fightPosts(s, fight((['win', 'loss', 'draw'] as const)[i % 3]!));
      const at = posts.findIndex((p) => p.by === 'bro');
      expect(posts.filter((p) => p.by === 'bro')).toHaveLength(1);
      expect([1, 2]).toContain(at);
      const bro = posts[at]!;
      expect(bro.link?.href).toBe('/cryptobro/');
      expect(bro.text).not.toMatch(/\{\w+\}/);
      expect(bundle.markets.find((m) => m.id === 'market.crypto')!.cast[bro.bro!]?.name).toBe(bro.author);
    }
  });

  it('the thread under it is other bros, you and sceptics', () => {
    const s = save('bro-thread');
    const p = fightPosts(s, fight('win')).find((x) => x.by === 'bro')!;
    const t = discussion({ ...p, comments: 200 }, s);
    expect(t.comments.length).toBeGreaterThan(0);
    for (const c of t.comments) expect(c.text).not.toMatch(/\{\w+\}/);
  });
});

describe('delegate posts in the career feed (09)', () => {
  it('the first fight always brings a delegate post linking to the Diplomatic Incident, right after the bro', () => {
    for (let i = 0; i < 30; i++) {
      const s = save(`del-${i}`);
      const posts = fightPosts(s, fight((['win', 'loss', 'draw'] as const)[i % 3]!));
      const at = posts.findIndex((p) => p.by === 'delegate');
      expect(at).toBe(posts.findIndex((p) => p.by === 'bro') + 1);
      const d = posts[at]!;
      expect(d.link?.href).toMatch(/^\/incident\/\?c=[a-z-]+$/);
      expect(d.text).not.toMatch(/\{\w+\}/);
      expect(d.author).toBe(bundle.markets.find((m) => m.source === 'likes')!.cast[d.del!]!.name);
    }
  });

  it('after that, about every other fight; other delegates object underneath', () => {
    let seen = 0;
    for (let i = 0; i < 40; i++) {
      const s = save(`del-again-${i}`);
      s.feed = [{ id: 'x', fight: 1, by: 'delegate', author: 'A', sub: '', text: '', reacts: 0, comments: 0 }];
      const d = fightPosts(s, fight('win')).find((p) => p.by === 'delegate');
      if (!d) continue;
      seen++;
      const talk = discussion({ ...d, comments: 40 }, s);
      expect(talk.comments.length).toBeGreaterThan(0);
      for (const c of talk.comments) expect(c.text).not.toMatch(/\{\w+\}/);
    }
    expect(seen).toBeGreaterThan(10);
    expect(seen).toBeLessThan(32);
  });
});

describe('institution posts in the career feed (09 §7.2)', () => {
  const after = (seed: string, mine = false) => {
    const s = save(seed);
    s.feed = [{ id: 'x', fight: 1, by: 'me', author: 'A', sub: '', text: '', reacts: 0, comments: 0, ...(mine ? { mood: 'institution' as const } : {}) }];
    return s;
  };

  it('from the second fight, an institution has a statement, with a link to the Summit Hall', () => {
    const sets = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const s = after(`inst-${i}`);
      const posts = fightPosts(s, fight((['win', 'loss', 'draw'] as const)[i % 3]!));
      const p = posts.find((x) => x.mood === 'institution');
      expect(p, `inst-${i}`).toBeDefined();
      expect(p!.link?.href).toBe('/incident/');
      expect(p!.text).not.toMatch(/\{\w+\}/);
      expect(bundle.crashers.find((c) => c.id === p!.crash)?.leader.name).toBe(p!.author);
      sets.add(p!.crash!);
    }
    expect(sets.size).toBeGreaterThanOrEqual(6);
    // Not on the very first fight.
    expect(fightPosts(save('inst-first'), fight('win')).some((p) => p.mood === 'institution')).toBe(false);
  });

  it('after that, about one fight in three; their crew and the delegates answer underneath', () => {
    let seen = 0;
    for (let i = 0; i < 60; i++) {
      const s = after(`inst-again-${i}`, true);
      const p = fightPosts(s, fight('loss')).find((x) => x.mood === 'institution');
      if (!p) continue;
      seen++;
      const talk = discussion({ ...p, comments: 80 }, s);
      expect(talk.comments.length).toBeGreaterThan(0);
      for (const c of talk.comments) expect(c.text).not.toMatch(/\{\w+\}/);
    }
    expect(seen).toBeGreaterThan(8);
    expect(seen).toBeLessThan(35);
  });
});
