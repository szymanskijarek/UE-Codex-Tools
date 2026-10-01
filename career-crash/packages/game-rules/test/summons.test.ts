import { bundle } from '@cc/content';
import { createBattle, Rng, simulate, type BattleInput, type CharacterSnapshot } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { difficulty, evaluateTraits, generateRecruit, opponentTeam, summonCareers, SUMMONERS_FROM_STAGE, toSnapshot } from '../src';

/** A fighter with every move of one career (no `unlocked` list = everything, like the Sandbox). */
function snap(career: string, seed: string): CharacterSnapshot {
  const c = generateRecruit(bundle, Rng.fromSeed(seed), `s-${seed}`, { careerPool: [career] });
  c.level = 8;
  return toSnapshot(c);
}

function input(a: CharacterSnapshot[], b: CharacterSnapshot[], seed: string): BattleInput {
  return {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: '0',
    seed,
    arenaId: 'arena.office',
    mode: 'duel_3v3',
    teams: [
      { playerId: 'a', playerName: 'A', rating: 1000, characters: a },
      { playerId: 'b', playerName: 'B', rating: 1000, characters: b },
    ],
    modifiers: [],
  };
}

const summoners = ['career.magician', 'career.teacher', 'career.archaeologist'];

describe('summons', () => {
  it('summoners summon, caps hold every tick, and critters never count as fighters', () => {
    let summoned = 0;
    for (let i = 0; i < 6; i++) {
      const b = createBattle(input(summoners.map((c) => snap(c, `m${i}${c}`)), ['career.chef', 'career.builder', 'career.nurse'].map((c) => snap(c, `o${i}${c}`)), `sum${i}`), bundle);
      while (!b.done()) {
        b.step();
        const live = b.world.entities.filter((e) => !e.removed && e.summonOf >= 0);
        for (const t of [0, 1]) expect(live.filter((e) => e.team === t).length).toBeLessThanOrEqual(6);
        const perOwner = new Map<number, number>();
        for (const e of live) perOwner.set(e.summonOf, (perOwner.get(e.summonOf) ?? 0) + 1);
        for (const n of perOwner.values()) expect(n).toBeLessThanOrEqual(4);
      }
      const w = b.world;
      summoned += w.events.filter((e) => e.type === 'summon').length;
      // Results list the six fighters only.
      expect(w.result!.characters).toHaveLength(6);
      expect(w.result!.characters.every((c) => !c.snapshotId.startsWith('summon.'))).toBe(true);
      // Every critter that arrived either left or is still standing at the end.
      const gone = new Set(w.events.filter((e) => e.type === 'summonGone').map((e) => e.a));
      for (const e of w.events.filter((x) => x.type === 'summon')) {
        const c = w.byId.get(e.b)!;
        expect(gone.has(e.b) || (!c.removed && c.state === 'active')).toBe(true);
      }
    }
    expect(summoned).toBeGreaterThan(5);
  });

  it('fighters who fear a critter get spooked by it', () => {
    let spooked = 0;
    for (let i = 0; i < 8; i++) {
      const out = simulate(input([snap('career.dog-groomer', `g${i}`)], [snap('career.postal-worker', `p${i}`)], `fear${i}`), bundle);
      spooked += out.events.filter((e) => e.type === 'panic' && e.s === 'fear:dogs').length;
    }
    expect(spooked).toBeGreaterThan(0);
  });

  it('battles with summons stay deterministic', () => {
    const inp = input(summoners.map((c) => snap(c, `d${c}`)), ['career.chef', 'career.builder', 'career.nurse'].map((c) => snap(c, `e${c}`)), 'det');
    expect(simulate(inp, bundle).resultHash).toBe(simulate(inp, bundle).resultHash);
  });

  it('ladder opponents bring summoners only from stage 10, and more often later', () => {
    const pool = new Set(summonCareers(bundle));
    const rate = (stage: number) => {
      let n = 0;
      for (let i = 0; i < 60; i++) if (opponentTeam(bundle, `l${i}`, stage, difficulty('normal'), 3).some((f) => f.nodes.some((x) => x.endsWith(':senior')) && pool.has(f.c.careers[0]!))) n++;
      return n;
    };
    expect(rate(SUMMONERS_FROM_STAGE - 1)).toBe(0);
    expect(rate(SUMMONERS_FROM_STAGE)).toBeGreaterThan(0);
    expect(rate(SUMMONERS_FROM_STAGE + 15)).toBeGreaterThan(rate(SUMMONERS_FROM_STAGE));
  });

  it('being spooked by birds often enough earns Pigeon PTSD', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('ptsd'), 'ptsd', { careerPool: ['career.mime'] });
    c.lifetime.counters['statusReceived:scaredBy:fear:birds'] = 8;
    expect(evaluateTraits(bundle, c)).toContain('trait.pigeon-ptsd');
    expect(toSnapshot(c).traits).toContain('trait.pigeon-ptsd');
  });
});
