import type { CareerDef, ContentBundle, Stats } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import { Rng, type Appearance, type CharacterSnapshot, type CharCounters } from '@cc/sim';

/** Persistent character record (01 §6.3 characters.data). */
export interface Character {
  id: string;
  name: string;
  level: number;
  xp: number;
  careers: string[];
  masteries: string[];
  personality: string;
  traits: string[];
  lockedTraits: string[];
  /** Base stats including allocated level points. */
  stats: Stats;
  /** Level-up points allocated per stat (max economy.maxPointsPerStat each). */
  allocated: Partial<Stats>;
  unspentPoints: number;
  held: string | null;
  accessory: string | null;
  appearance: Appearance;
  lifetime: LifetimeCounters;
  relationships: Record<string, number>;
  /** Career options offered at the pending milestone, if any. */
  pendingOffer: string[] | null;
  rerolls: number;
  retired: boolean;
  createdAt: number;
}

export interface LifetimeCounters {
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  kos: number;
  downs: number;
  knockdowns: number;
  revives: number;
  refereeHits: number;
  drops: number;
  mvps: number;
  counters: Record<string, number>;
}

export function emptyLifetime(): LifetimeCounters {
  return { battles: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, bestWinStreak: 0, kos: 0, downs: 0, knockdowns: 0, revives: 0, refereeHits: 0, drops: 0, mvps: 0, counters: {} };
}

export function toSnapshot(c: Character): CharacterSnapshot {
  const rivals = Object.entries(c.relationships)
    .filter(([, v]) => v <= -3)
    .map(([k]) => k)
    .sort();
  const friends = Object.entries(c.relationships)
    .filter(([, v]) => v >= 3)
    .map(([k]) => k)
    .sort();
  return {
    id: c.id,
    name: c.name,
    level: c.level,
    careers: [...c.careers],
    masteries: [...c.masteries],
    personality: c.personality,
    traits: [...c.traits],
    stats: { ...c.stats },
    held: c.held,
    accessory: c.accessory,
    appearance: { ...c.appearance },
    rivals,
    friends,
  };
}

const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0522d'];
const HAIRS = ['#2c1b10', '#6b4423', '#d6b370', '#b55239', '#111111', '#9ca3af', '#e5e7eb'];

export type Rarity = 'common' | 'rare' | 'epic';

/**
 * Generate a recruit (03 §4). Rarity adds extra stat points, not new mechanics.
 * Deterministic for a given rng state.
 */
export function generateRecruit(bundle: ContentBundle, rng: Rng, id: string, opts: { rarity?: Rarity; careerPool?: string[]; now?: number } = {}): Character {
  const econ = bundle.economy.recruit;
  const rarity = opts.rarity ?? 'common';
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, econ.baseStat])) as Stats;
  for (let i = 0; i < econ.variedStats; i++) {
    const k = rng.pick(STAT_KEYS);
    stats[k] = Math.max(1, stats[k] + rng.range(-econ.variance, econ.variance));
  }
  const bonus = rarity === 'epic' ? 4 : rarity === 'rare' ? 2 : 0;
  for (let i = 0; i < bonus; i++) stats[rng.pick(STAT_KEYS)] += 1;
  const pool: CareerDef[] = opts.careerPool
    ? bundle.careers.filter((c) => opts.careerPool!.includes(c.id))
    : bundle.careers.filter((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated);
  const career = rng.pick(pool);
  const first = rng.pick(bundle.names.first);
  const last = rng.pick(bundle.names.last);
  return {
    id,
    name: `${first} ${last}`,
    level: 1,
    xp: 0,
    careers: [career.id],
    masteries: [],
    personality: rng.pick(bundle.personalities).id,
    traits: [],
    lockedTraits: [],
    stats,
    allocated: {},
    unspentPoints: 0,
    held: career.art.heldItem ?? null,
    accessory: null,
    appearance: { skin: rng.pick(SKINS), hair: rng.pick(HAIRS), hairStyle: rng.int(6) },
    lifetime: emptyLifetime(),
    relationships: {},
    pendingOffer: null,
    rerolls: 0,
    retired: false,
    createdAt: opts.now ?? 0,
  };
}

export function recruitRarity(rng: Rng): Rarity {
  const r = rng.int(100);
  return r < 8 ? 'epic' : r < 30 ? 'rare' : 'common';
}

/** Spend level-up points (03 §3.3). Returns an error string or null. */
export function allocatePoints(bundle: ContentBundle, c: Character, alloc: Partial<Stats>): string | null {
  let total = 0;
  for (const k of STAT_KEYS) {
    const v = alloc[k] ?? 0;
    if (!Number.isInteger(v) || v < 0) return `invalid amount for ${k}`;
    if ((c.allocated[k] ?? 0) + v > bundle.economy.maxPointsPerStat) return `${k} would exceed ${bundle.economy.maxPointsPerStat} allocated points`;
    total += v;
  }
  if (total > c.unspentPoints) return 'not enough unspent points';
  for (const k of STAT_KEYS) {
    const v = alloc[k] ?? 0;
    if (!v) continue;
    c.allocated[k] = (c.allocated[k] ?? 0) + v;
    c.stats[k] += v;
  }
  c.unspentPoints -= total;
  return null;
}

export function lifetimeCounterFromResult(counters: CharCounters): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counters.thrown)) out[`thrown:${k}`] = v;
  for (const [k, v] of Object.entries(counters.used)) out[`used:${k}`] = v;
  for (const [k, v] of Object.entries(counters.statusCaused)) out[`statusCaused:${k}`] = v;
  for (const [k, v] of Object.entries(counters.statusReceived)) out[`statusReceived:${k}`] = v;
  return out;
}
