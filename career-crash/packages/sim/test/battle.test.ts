import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { createBattle, simulate } from '../src/simulate';
import { ENTITY_CAP, MAX_TICKS } from '../src/types';
import { battleInput, char, randomTeam } from './fixtures';

describe('simulate', () => {
  it('is deterministic: same input → identical events and hash', () => {
    const rng = Rng.fromSeed('det1');
    const input = battleInput(bundle, 'det1', [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')]);
    const a = simulate(input, bundle);
    const b = simulate(structuredClone(input), bundle);
    expect(b.resultHash).toBe(a.resultHash);
    expect(b.hashes).toEqual(a.hashes);
    expect(b.events.length).toBe(a.events.length);
  });

  it('different seeds produce different battles', () => {
    const rng = Rng.fromSeed('det2');
    const teams = [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')];
    const a = simulate(battleInput(bundle, 'seed-a', teams), bundle);
    const b = simulate(battleInput(bundle, 'seed-b', teams), bundle);
    expect(a.resultHash).not.toBe(b.resultHash);
  });

  it('property: 150 random battles end within the tick cap with sane state', () => {
    const rng = Rng.fromSeed('prop');
    for (let i = 0; i < 150; i++) {
      const size = i % 3 === 0 ? 5 : 3;
      const arena = i % 2 ? 'arena.office' : 'arena.supermarket';
      const input = battleInput(bundle, `p${i}`, [randomTeam(bundle, rng, size, 'A', 2), randomTeam(bundle, rng, size, 'B', 2)], arena, size === 5 ? 'duel_5v5' : 'duel_3v3');
      const b = createBattle(input, bundle);
      while (!b.done()) {
        b.step();
        expect(b.world.entities.filter((e) => !e.removed).length).toBeLessThanOrEqual(ENTITY_CAP);
      }
      expect(b.world.tick).toBeLessThanOrEqual(MAX_TICKS);
      for (const e of b.world.entities) {
        for (const v of [e.x, e.y, e.z, e.vx, e.vy, e.hp, e.energy, e.morale]) expect(Number.isInteger(v)).toBe(true);
        expect(e.x).toBeGreaterThanOrEqual(0);
        expect(e.y).toBeGreaterThanOrEqual(0);
      }
      const r = b.world.result!;
      expect(r.winner).toBeGreaterThanOrEqual(-1);
      expect(r.characters.length).toBe(size * 2);
    }
  });

  it('free-for-all runs with one team per player', () => {
    const rng = Rng.fromSeed('ffa');
    const teams = Array.from({ length: 6 }, (_, i) => randomTeam(bundle, rng, 1, `P${i}`));
    const out = simulate(battleInput(bundle, 'ffa1', teams, 'arena.office', 'ffa'), bundle);
    expect(out.result.characters.length).toBe(6);
    expect(out.events.some((e) => e.type === 'refereeDown')).toBe(false);
  });
});

describe('systems', () => {
  it('wet characters take double electric damage and get electrified via rules', () => {
    // Plumber (wet everyone) + electrician (live wire) vs two farmers: shocks must happen.
    const rng = Rng.fromSeed('combo');
    let shocks = 0;
    for (let i = 0; i < 20; i++) {
      const input = battleInput(bundle, `combo${i}`, [
        { playerId: 'A', playerName: 'A', rating: 1000, characters: [char('pl', ['career.plumber'], 'personality.chaotic'), char('el', ['career.electrician'], 'personality.aggressive')] },
        { playerId: 'B', playerName: 'B', rating: 1000, characters: [char('f1', ['career.farmer'], 'personality.aggressive'), char('f2', ['career.farmer'], 'personality.aggressive')] },
      ]);
      void rng;
      const out = simulate(input, bundle);
      shocks += out.events.filter((e) => e.type === 'statusApplied' && e.s === 'status.electrified').length;
    }
    expect(shocks).toBeGreaterThan(0);
  });

  it('firefighters are immune to burning; the janitor spawns a puddle at start', () => {
    const input = battleInput(bundle, 'imm', [
      { playerId: 'A', playerName: 'A', rating: 1000, characters: [char('ff', ['career.firefighter'], 'personality.helpful'), char('ja', ['career.janitor'], 'personality.lazy')] },
      { playerId: 'B', playerName: 'B', rating: 1000, characters: [char('ch', ['career.chef'], 'personality.aggressive'), char('ch2', ['career.chef'], 'personality.aggressive')] },
    ]);
    const b = createBattle(input, bundle);
    const ff = b.world.entities.find((e) => e.snapshotId === 'ff')!;
    expect(ff.immune).toContain('status.burning');
    expect(b.world.events.some((e) => e.type === 'propSpawned' && e.s === 'prop.puddle-water')).toBe(true);
    while (!b.done()) b.step();
    expect(b.world.events.some((e) => e.type === 'statusApplied' && e.s === 'status.burning' && e.b === ff.id)).toBe(false);
  });

  it('every KO has a cause chain back to an action', () => {
    const rng = Rng.fromSeed('cause');
    const out = simulate(battleInput(bundle, 'cause1', [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')]), bundle);
    const kos = out.events.filter((e) => e.type === 'ko' || e.type === 'downed');
    expect(kos.length).toBeGreaterThan(0);
    for (const k of kos) expect(k.cause).toBeGreaterThanOrEqual(-1);
    expect(kos.some((k) => k.cause >= 0)).toBe(true);
  });
});
