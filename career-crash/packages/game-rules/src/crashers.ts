import type { ContentBundle, CrasherDef } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import { Rng, type CrasherInput } from '@cc/sim';
import { careerSnapshot, DIFFICULTIES, generatedFighter, RANK_XP, type DifficultyDef } from './skills';

/** Stat points a gatecrasher gets for each career slot it fights without (like a boss). */
const POINTS_PER_SLOT = 4;

/** The gatecrasher sets that could turn up at an arena: the ones that belong there, and the ones visiting. */
export function crashersFor(bundle: ContentBundle, arenaId: string): { home: CrasherDef[]; visiting: CrasherDef[] } {
  return { home: bundle.crashers.filter((c) => c.home === arenaId), visiting: bundle.crashers.filter((c) => c.visits.includes(arenaId)) };
}

function weighted(rng: Rng, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.int(Math.max(1, total));
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return 0;
}

/**
 * Whether this fight gets gatecrashed (07), and by whom: a small chance per
 * fight, usually a set that belongs to the venue, sometimes one visiting. The
 * leader comes at `level` (the player's main character), henchmen a little
 * below, each with one career's moves and a boss-style stat top-up for the
 * careers they don't have. `opts.force` skips the dice and `opts.set` picks the
 * set (Sandbox, tests).
 */
export function rollCrashers(bundle: ContentBundle, seed: string, arenaId: string, level: number, rank: number, opts: { force?: boolean; set?: string; size?: number } = {}): CrasherInput | undefined {
  const e = bundle.economy.crashers;
  const rng = Rng.fromSeed(`crash:${seed}`);
  if (!opts.force && !opts.set && rng.int(10000) >= e.chanceBp) return undefined;
  const { home, visiting } = crashersFor(bundle, arenaId);
  const pool = home.length && (!visiting.length || rng.int(10000) < e.homeBp) ? home : visiting.length ? visiting : home;
  if (!pool.length) return undefined;
  const set = (opts.set ? bundle.crashers.find((c) => c.id === opts.set) : undefined) ?? pool[rng.int(pool.length)]!;
  const size = opts.size ?? 1 + weighted(rng, e.sizeWeights);
  const diff: DifficultyDef = { ...DIFFICULTIES[1]!, spendBp: e.spendBp };
  const characters = Array.from({ length: size }, (_, i) => {
    const m = i === 0 ? set.leader : set.henchmen;
    const lvl = Math.max(1, level + (i === 0 ? e.leaderLevelOffset : e.henchmanLevelOffset));
    const f = generatedFighter(bundle, rng, `crash-${seed}-${i}`, lvl, rank, diff, [m.career]);
    // One career only: each slot given up becomes stat points, so they're still a match for you.
    const dropped = f.c.careers.length - 1;
    for (let p = 0; p < dropped * POINTS_PER_SLOT; p++) f.c.stats[STAT_KEYS[rng.int(STAT_KEYS.length)]!] += 1;
    f.c.careers = [m.career];
    f.careerXp = { [m.career]: RANK_XP[Math.max(0, Math.min(4, rank - 1))]! };
    f.c.name = i === 0 ? set.leader.name : set.henchmen.names[(i - 1) % set.henchmen.names.length]!;
    f.c.personality = m.personality;
    f.c.traits = [];
    // The second henchman has a look of their own (`<persona>-b`) once that art exists.
    return { ...careerSnapshot(bundle, f), loadout: [], persona: m.persona, ...(i === 2 ? { personaArt: `${m.persona}-b` } : {}), ...(m.moves?.length ? { granted: [...m.moves] } : {}) };
  });
  const tick = e.earliestTick + rng.int(Math.max(1, e.latestTick - e.earliestTick - 200));
  return { set: set.id, tick, until: e.latestTick, minActiveBp: e.minActiveBp, characters };
}
