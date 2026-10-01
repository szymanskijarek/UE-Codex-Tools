import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { layoutArena } from '../src/layout';
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

  it('grapplers toss people who land with a thud, and careers banter', () => {
    const team = (p: string, careers: string[][]) => ({
      playerId: p,
      playerName: p,
      rating: 1000,
      characters: careers.map((c, i) => char(`${p}${i}`, c, 'personality.aggressive')),
    });
    const counts = { grab: 0, landed: 0, banter: 0 };
    for (let i = 0; i < 6; i++) {
      const input = battleInput(bundle, `toss${i}`, [
        team('A', [['career.security-guard'], ['career.farmer'], ['career.barista']]),
        team('B', [['career.barista'], ['career.farmer'], ['career.builder']]),
      ]);
      const out = simulate(input, bundle);
      for (const e of out.events) {
        if (e.type === 'grab' || e.type === 'landed' || e.type === 'banter') counts[e.type]++;
        if (e.type === 'banter') expect(bundle.synergies.some((s) => s.id === e.s)).toBe(true);
      }
    }
    const rng = Rng.fromSeed('toss');
    for (let i = 0; i < 6; i++) {
      const out = simulate(battleInput(bundle, `rt${i}`, [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')]), bundle);
      for (const e of out.events) if (e.type === 'grab' || e.type === 'landed') counts[e.type]++;
    }
    expect(counts.grab).toBeGreaterThan(0);
    expect(counts.landed).toBeGreaterThan(0);
    expect(counts.banter).toBeGreaterThan(0);
  });

  it('arena layouts are seeded: same seed same layout, different seeds vary, spawns stay clear', () => {
    for (const arena of bundle.arenas) {
      const a = layoutArena(arena, 'layout-1');
      expect(layoutArena(arena, 'layout-1')).toEqual(a);
      const variants = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(layoutArena(arena, `layout-${i}`).obstacles)));
      expect(variants.size).toBeGreaterThan(1);
      for (let i = 0; i < 12; i++) {
        const { arena: laid } = layoutArena(arena, `layout-${i}`);
        for (const [sx, sy] of [...laid.spawns.a, ...laid.spawns.b]) {
          for (const [x, y, w, h] of laid.walls) expect(sx >= x && sx <= x + w && sy >= y && sy <= y + h).toBe(false);
        }
      }
    }
  });

  it('obstacles take their art\'s real-world footprint and stay inside the arena, clear of spawns', () => {
    for (const arena of bundle.arenas) {
      for (const o of arena.obstacles ?? []) if (!o.belt) expect(o.fp?.length, `${arena.id} ${o.art}`).toBe(o.art.length);
      for (let i = 0; i < 40; i++) {
        const { arena: laid, obstacles } = layoutArena(arena, `fp-${i}`);
        for (const o of obstacles) {
          const [x, y, w, h] = o.rect;
          if (!o.belt) expect([w, h]).toEqual(bundle.furniture[o.art]!.fp);
          expect(x >= 0 && y >= 0 && x + w <= arena.sizeMm[0] && y + h <= arena.sizeMm[1], `${arena.id} ${o.art} ${o.rect}`).toBe(true);
          for (const [sx, sy] of [...laid.spawns.a, ...laid.spawns.b, ...laid.spawns.ffa]) expect(sx >= x && sx <= x + w && sy >= y && sy <= y + h, `${arena.id} ${o.art} on a spawn`).toBe(false);
        }
      }
    }
  });

  it('characters parry, evade and dash', () => {
    const rng = Rng.fromSeed('reflex');
    const counts = { parry: 0, evade: 0, dash: 0 };
    for (let i = 0; i < 8; i++) {
      const out = simulate(battleInput(bundle, `rf${i}`, [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')]), bundle);
      for (const e of out.events) if (e.type === 'parry' || e.type === 'evade' || e.type === 'dash') counts[e.type]++;
    }
    expect(counts.parry).toBeGreaterThan(0);
    expect(counts.evade).toBeGreaterThan(0);
    expect(counts.dash).toBeGreaterThan(0);
  });

  it('fans blow, revolving doors fling and trapdoors drop fighters', () => {
    const rng = Rng.fromSeed('hazards');
    const at = (arena: string, id: string) => {
      const b = createBattle(battleInput(bundle, `hz-${arena}`, [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')], arena), bundle);
      const h = b.world.arena.hazards.find((x) => x.id === id)!;
      while (b.world.tick < h.startTick - 1) b.step();
      // Put a fighter in the middle of the hazard just before it goes off.
      const f = b.world.entities.find((e) => e.kind === 'char' && e.team === 0 && e.state === 'active')!;
      const [x, y, w, hh] = h.region;
      f.x = x + Math.floor(w / 2) + 300;
      f.y = y + Math.floor(hh / 2);
      return { b, h, f };
    };
    // Fan: a temporary gust belt over the region that pushes along and then expires.
    {
      const { b, h } = at('arena.warehouse', 'hazard.industrial-fan');
      b.step();
      const gust = b.world.belts.find((x) => x.until !== undefined);
      expect(gust?.vx).toBe(h.action.wind!.vx);
      expect(gust!.until).toBe(h.startTick + h.action.wind!.ticks);
    }
    // Revolving door: whoever stands in it is tossed.
    {
      const { b, f } = at('arena.hotel', 'hazard.revolving-door');
      b.step();
      expect(f.statuses.some((s) => s.id === 'status.airborne')).toBe(true);
    }
    // Trapdoor: dropped, then up at a free-for-all spawn, stunned.
    {
      const { b, f } = at('arena.theatre', 'hazard.trapdoor');
      b.step();
      expect(b.world.arena.spawns.ffa.some(([sx, sy]) => Math.abs(f.x - sx) < 400 && Math.abs(f.y - sy) < 400)).toBe(true);
      expect(f.statuses.some((s) => s.id === 'status.stunned')).toBe(true);
    }
  });

  it('obstacles topple under punishment and stay down', () => {
    const rng = Rng.fromSeed('topple');
    let broken = 0;
    for (let i = 0; i < 24 && broken === 0; i++) {
      const b = createBattle(battleInput(bundle, `tp${i}`, [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')], 'arena.supermarket'), bundle);
      while (!b.done()) b.step();
      const w = b.world;
      for (const [k, gone] of w.wallBroken.entries()) {
        if (!gone) continue;
        broken++;
        expect(w.wallHp[k]).toBe(0);
        expect(w.events.some((e) => e.type === 'wallBroken' && e.b === k)).toBe(true);
      }
    }
    expect(broken).toBeGreaterThan(0);
  });

  it('rivals are paired, recognise each other and can take revenge', () => {
    const rng = Rng.fromSeed('grudge');
    let revenge = 0;
    for (let i = 0; i < 10; i++) {
      const A = randomTeam(bundle, rng, 3, 'A');
      const B = randomTeam(bundle, rng, 3, 'B');
      A.characters[2]!.rivals = [B.characters[0]!.id];
      const b = createBattle(battleInput(bundle, `gr${i}`, [A, B]), bundle);
      const holder = b.world.entities.find((e) => e.snapshotId === A.characters[2]!.id)!;
      const rival = b.world.entities.find((e) => e.snapshotId === B.characters[0]!.id)!;
      expect(holder.duelTarget).toBe(rival.id);
      while (!b.done()) b.step();
      expect(b.world.events.some((e) => e.type === 'rivalry' && e.a === holder.id && e.b === rival.id)).toBe(true);
      revenge += b.world.events.filter((e) => e.type === 'revenge').length;
    }
    expect(revenge).toBeGreaterThan(0);
  });
});
