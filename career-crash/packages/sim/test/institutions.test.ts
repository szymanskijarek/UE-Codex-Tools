import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { createBattle, simulate } from '../src/simulate';
import type { BattleInput, CrasherInput } from '../src/types';
import { battleInput, randomTeam } from './fixtures';

/** An endless floor of eight sides, and a visiting institution (09 §7.2). */
function floor(seed: string, crash: Partial<CrasherInput>, ticks = 2400): BattleInput {
  const rng = Rng.fromSeed(seed);
  const teams = Array.from({ length: 8 }, (_, i) => randomTeam(bundle, rng, 1, `c${i}-`));
  const visitors = randomTeam(bundle, rng, 2, 'inst-').characters;
  const spawns: [number, number][] = [
    [2500, 2500],
    [19500, 2500],
    [2500, 11500],
    [19500, 11500],
    [8000, 7000],
    [14000, 7000],
    [11000, 2500],
    [11000, 11500],
  ];
  const input = battleInput(bundle, seed, teams, 'arena.office', 'ffa');
  return {
    ...input,
    endless: { round: 0, ticks, relistTicks: 100, liquidatedTicks: 300, shieldTicks: 20, spawns },
    crashers: { set: 'crasher.regulators', tick: 200, until: ticks - 200, minActiveBp: 0, characters: visitors, ...crash },
  };
}

const crasherIds = (out: ReturnType<typeof simulate>, input: BattleInput) =>
  new Set(out.events.filter((e) => e.type === 'spawn' && e.v === input.teams.length).map((e) => e.a));

describe('institutions (09 §7.2)', () => {
  it('skirmish: they fight, and leave by a door once one of them is hurt', () => {
    const input = floor('inst-skirmish', { stance: 'skirmish', leaveAtBp: 9500 });
    const out = simulate(input, bundle);
    const ids = crasherIds(out, input);
    expect(ids.size).toBe(2);
    const leave = out.events.find((e) => e.type === 'crashLeave');
    expect(leave).toBeDefined();
    const exits = out.events.filter((e) => e.type === 'crashExit');
    expect(exits.length).toBeGreaterThan(0);
    for (const x of exits) expect(ids.has(x.a)).toBe(true);
    expect(exits.every((x) => x.t >= leave!.t)).toBe(true);
  });

  it('aloof: never lands a blow, laps the floor on its mount, leaves after its time', () => {
    const input = floor('inst-aloof', { stance: 'aloof', leaveAfterTicks: 500, mount: 'prop.office-chair' }, 2000);
    const out = simulate(input, bundle);
    const ids = crasherIds(out, input);
    const crash = out.events.find((e) => e.type === 'crash')!;
    // The leader is on the mount from the moment they arrive.
    expect(out.events.some((e) => e.type === 'ride' && e.a === crash.a && e.t === crash.t)).toBe(true);
    expect(out.events.some((e) => (e.type === 'hit' || e.type === 'crit') && ids.has(e.a))).toBe(false);
    const leave = out.events.find((e) => e.type === 'crashLeave')!;
    expect(leave.t - crash.t).toBeGreaterThanOrEqual(500);
  });

  it('meddle: only their own abilities, never a plain attack', () => {
    const input = floor('inst-meddle', { stance: 'meddle', leaveAfterTicks: 900 });
    for (const c of input.crashers!.characters) c.granted = ['ability.sorry'];
    const out = simulate(input, bundle);
    const ids = crasherIds(out, input);
    expect(out.events.some((e) => e.type === 'attack' && ids.has(e.a))).toBe(false);
  });

  it('comes in only when the trigger holds: nobody from the given team standing', () => {
    const input = floor('inst-when', { stance: 'aloof', leaveAfterTicks: 300, when: { noneStanding: [0] } }, 3000);
    // Once down they stay down a while, so both can be out at once.
    input.endless!.relistTicks = 2500;
    // Team 0 is frail, so it goes down; the institution waits for that.
    input.teams[0]!.characters[0]!.stats = { ...input.teams[0]!.characters[0]!.stats, health: 1, strength: 1 };
    const b = createBattle(input, bundle);
    let ok = false;
    while (!b.done()) {
      const before = b.world.events.length;
      b.step();
      if (b.world.events.slice(before).some((e) => e.type === 'crash')) {
        const up = b.world.entities.filter((e) => !e.removed && e.kind === 'char' && e.state === 'active' && e.team === 0 && e.summonOf < 0);
        expect(up).toHaveLength(0);
        ok = true;
      }
    }
    expect(ok).toBe(true);
  });

  it('a knockout streak trigger counts knockouts in the window', () => {
    const input = floor('inst-streak', { stance: 'skirmish', leaveAtBp: 5000, when: { koStreak: { kos: 2, withinTicks: 400 } } }, 3000);
    const out = simulate(input, bundle);
    const crash = out.events.find((e) => e.type === 'crash');
    expect(crash).toBeDefined();
    const kos = out.events.filter((e) => e.type === 'ko' && e.t <= crash!.t && e.t > crash!.t - 400);
    expect(kos.length).toBeGreaterThanOrEqual(2);
  });

  it('someStanding: comes only once enough of the given teams are up', () => {
    const all = simulate(floor('inst-some', { stance: 'meddle', leaveAfterTicks: 300, when: { someStanding: { teams: [0, 1, 2, 3, 4, 5, 6, 7], atLeast: 8 } } }, 2000), bundle);
    const few = simulate(floor('inst-some', { stance: 'meddle', leaveAfterTicks: 300, when: { someStanding: { teams: [0, 1], atLeast: 1 } } }, 2000), bundle);
    const at = (o: typeof all) => o.events.find((e) => e.type === 'crash')?.t ?? Infinity;
    expect(at(few)).toBe(200);
    expect(at(all)).toBeGreaterThanOrEqual(at(few));
  });

  it('statusCount and koedTimes wait for the floor to earn them', () => {
    const wet = simulate(floor('inst-status', { stance: 'meddle', leaveAfterTicks: 300, when: { statusCount: { statuses: ['status.wet'], n: 50 } } }, 1500), bundle);
    expect(wet.events.some((e) => e.type === 'crash')).toBe(false);
    const input = floor('inst-koed', { stance: 'meddle', leaveAfterTicks: 300, when: { koedTimes: 2 } }, 4000);
    const out = simulate(input, bundle);
    const crash = out.events.find((e) => e.type === 'crash')!;
    expect(crash).toBeDefined();
    // By then one side had been floored twice.
    const koed = new Map<number, number>();
    const team = new Map(out.events.filter((e) => e.type === 'spawn').map((e) => [e.a, e.v]));
    for (const e of out.events) if (e.type === 'ko' && e.t <= crash.t && (team.get(e.b) ?? 99) < 8) koed.set(team.get(e.b)!, (koed.get(team.get(e.b)!) ?? 0) + 1);
    expect(Math.max(...koed.values())).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic', () => {
    const a = simulate(floor('inst-det', { stance: 'aloof', leaveAfterTicks: 400, mount: 'prop.office-chair' }, 1500), bundle);
    const b = simulate(floor('inst-det', { stance: 'aloof', leaveAfterTicks: 400, mount: 'prop.office-chair' }, 1500), bundle);
    expect(b.resultHash).toBe(a.resultHash);
  });
});
