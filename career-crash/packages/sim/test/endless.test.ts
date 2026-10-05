import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { createBattle, simulate } from '../src/simulate';
import type { BattleInput, EndlessInput } from '../src/types';
import { battleInput, randomTeam } from './fixtures';

/** A short endless floor (08 §4): eight contenders, one per side. */
function floor(seed: string, round = 0, leveragedId?: string): BattleInput {
  const rng = Rng.fromSeed(seed);
  const teams = Array.from({ length: 8 }, (_, i) => randomTeam(bundle, rng, 1, `c${i}-`));
  for (const t of teams) for (const c of t.characters) if (c.id === leveragedId) c.leveraged = true;
  const endless: EndlessInput = {
    round,
    ticks: 1600,
    relistTicks: 100,
    liquidatedTicks: 300,
    shieldTicks: 20,
    spawns: [
      [2500, 2500],
      [19500, 2500],
      [2500, 11500],
      [19500, 11500],
      [8000, 7000],
      [14000, 7000],
      [11000, 2500],
      [11000, 11500],
    ],
  };
  return { ...battleInput(bundle, seed, teams, 'arena.office', 'ffa'), endless };
}

describe('endless floors (08)', () => {
  it('runs for exactly the candle and never eliminates anyone', () => {
    const out = simulate(floor('endless-1'), bundle);
    expect(out.result.ticks).toBe(1600);
    expect(out.result.reason).toBe('timeout');
    expect(out.events.some((e) => e.type === 'suddenDeath')).toBe(false);
  });

  it('knocked-out contenders re-list after the delist time, with full health', () => {
    const b = createBattle(floor('endless-2'), bundle);
    const koAt = new Map<number, number>();
    let relists = 0;
    while (!b.done()) {
      const before = b.world.events.length;
      b.step();
      for (const e of b.world.events.slice(before)) {
        if (e.type === 'ko' && b.world.byId.get(e.b)?.kind === 'char' && b.world.byId.get(e.b)!.summonOf < 0) koAt.set(e.b, e.t);
        if (e.type === 'relist') {
          relists++;
          const ent = b.world.byId.get(e.a)!;
          expect(e.t - koAt.get(e.a)!).toBeGreaterThanOrEqual(100);
          expect(ent.state).toBe('active');
          expect(ent.hp).toBe(ent.maxHp);
          expect(e.v).toBe(ent.relists);
        }
      }
    }
    expect(relists).toBeGreaterThan(0);
  });

  it('a leveraged contender is liquidated when knocked out, and stays out longer', () => {
    // Make the leveraged one the frailest fighter on the floor, so it goes down early.
    const input = floor('endless-3', 0, 'c0-0');
    input.teams[0]!.characters[0]!.stats = { ...input.teams[0]!.characters[0]!.stats, health: 1, strength: 1 };
    const out = simulate(input, bundle);
    const me = out.events.find((e) => e.type === 'spawn' && e.s === 'c0-0')!.a;
    const liq = out.events.filter((e) => e.type === 'liquidated' && e.b === me);
    expect(liq.length).toBeGreaterThan(0);
    for (const l of liq) {
      const back = out.events.find((e) => e.type === 'relist' && e.a === me && e.t > l.t);
      if (back) expect(back.t - l.t).toBeGreaterThanOrEqual(300);
    }
    // Nobody else is leveraged: every other knockout is a plain one.
    expect(out.events.filter((e) => e.type === 'liquidated').every((e) => e.b === me)).toBe(true);
  });

  it('is deterministic, and each round of a seed is a different fight', () => {
    const a = simulate(floor('endless-4', 3), bundle);
    const b = simulate(structuredClone(floor('endless-4', 3)), bundle);
    const c = simulate(floor('endless-4', 4), bundle);
    expect(b.resultHash).toBe(a.resultHash);
    expect(c.resultHash).not.toBe(a.resultHash);
  });
});
