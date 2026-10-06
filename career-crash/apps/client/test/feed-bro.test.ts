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
