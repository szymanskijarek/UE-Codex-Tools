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
