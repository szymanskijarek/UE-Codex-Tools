import type { CareerDef, ContentBundle, StatKey, Stats } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import { Rng, type CharacterSnapshot } from '@cc/sim';
import { gearStats, opponentGear, type LootItem } from './loot';
import { generateRecruit, toSnapshot, type Character } from './character';
import { addXp, careerSlots } from './progression';

// ---------------------------------------------------------------------------
// Career ranks (03 §3.4): each career levels on its own as you fight in it.
// ---------------------------------------------------------------------------
export const RANKS = ['Trainee', 'Junior', 'Senior', 'Lead', 'Head'] as const;
/** Career XP needed to reach rank 1..5. */
export const RANK_XP = [0, 200, 550, 1100, 1900] as const;
/** Squad building unlocks when the main character reaches this rank in their current career. */
export const SQUAD_UNLOCK_RANK = 3;

export function rankOf(careerXp: number): number {
  let r = 1;
  for (let i = 1; i < RANK_XP.length; i++) if (careerXp >= RANK_XP[i]!) r = i + 1;
  return r;
}

/** Skill points a career tree has at a rank: 1 at Trainee, +2 per rank after. */
export function skillPointsAt(rank: number): number {
  return 1 + (rank - 1) * 2;
}

// ---------------------------------------------------------------------------
// Skill trees: one per career, built from its abilities plus stat and reflex perks.
// ---------------------------------------------------------------------------
export interface SkillNode {
  id: string;
  career: string;
  /** Row in the tree (1 = top). */
  tier: number;
  kind: 'ability' | 'passive' | 'stats' | 'reflex' | 'capstone';
  cost: number;
  /** Career rank needed. */
  rank: number;
  /** Needs at least one of these unlocked first (empty = root). */
  requires: string[];
  ability?: string;
  stats?: Partial<Stats>;
  defense?: { parryBp?: number; evadeBp?: number; dashBp?: number };
  /** Short label for perks (abilities use their own names). */
  label?: string;
}

function topStats(career: CareerDef): StatKey[] {
  return (Object.entries(career.statMods) as [StatKey, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([k]) => k);
}

const STAT_LABEL: Record<StatKey, string> = {
  health: 'Health',
  energy: 'Energy',
  speed: 'Speed',
  strength: 'Strength',
  throwing: 'Throwing',
  intelligence: 'Intelligence',
  awareness: 'Awareness',
  confidence: 'Confidence',
  luck: 'Luck',
  charisma: 'Charisma',
  recovery: 'Recovery',
  interactionSpeed: 'Handiness',
};

export function statLabel(k: StatKey): string {
  return STAT_LABEL[k];
}

/**
 * The tree:
 *   tier 1  main move (free) ─┬─ passive ─── stat perk A
 *   tier 2  first extra move  ─┴─ reflex perk
 *   tier 3  second extra move / stat perk B
 *   tier 4  capstone: +1 to every stat the career is good at
 */
export function skillTree(bundle: ContentBundle, careerId: string): SkillNode[] {
  const c = bundle.careers.find((x) => x.id === careerId);
  if (!c) return [];
  const id = (s: string) => `${careerId}:${s}`;
  const [s1 = 'health', s2 = 'awareness'] = topStats(c);
  const style = c.defense ?? {};
  const reflex =
    (style.dashBp ?? 0) >= Math.max(style.parryBp ?? 0, style.evadeBp ?? 0) * 2 && (style.dashBp ?? 0) > 0
      ? { dashBp: 1500, label: 'Sprint start: +15% dash chance' }
      : (style.evadeBp ?? 0) > (style.parryBp ?? 0)
        ? { evadeBp: 400, label: 'Light feet: +4% evade' }
        : { parryBp: 400, label: 'Guard up: +4% parry' };
  const nodes: SkillNode[] = [
    { id: id('active'), career: careerId, tier: 1, kind: 'ability', cost: 0, rank: 1, requires: [], ability: c.active },
    { id: id('passive'), career: careerId, tier: 1, kind: 'passive', cost: 1, rank: 1, requires: [id('active')], ability: c.passive },
    { id: id('stat-a'), career: careerId, tier: 1, kind: 'stats', cost: 1, rank: 1, requires: [id('active')], stats: { [s1]: 2 }, label: `+2 ${STAT_LABEL[s1]}` },
    {
      id: id('reflex'),
      career: careerId,
      tier: 2,
      kind: 'reflex',
      cost: 1,
      rank: 2,
      requires: [id('passive'), id('stat-a')],
      defense: { parryBp: reflex.parryBp, evadeBp: reflex.evadeBp, dashBp: reflex.dashBp },
      label: reflex.label,
    },
  ];
  const extras = c.extraActives ?? [];
  if (extras[0]) nodes.push({ id: id('extra-0'), career: careerId, tier: 2, kind: 'ability', cost: 2, rank: 2, requires: [id('passive'), id('stat-a')], ability: extras[0] });
  nodes.push({ id: id('stat-b'), career: careerId, tier: 3, kind: 'stats', cost: 1, rank: 3, requires: [id('reflex'), ...(extras[0] ? [id('extra-0')] : [])], stats: { [s2]: 2 }, label: `+2 ${STAT_LABEL[s2]}` });
  if (extras[1]) nodes.push({ id: id('extra-1'), career: careerId, tier: 3, kind: 'ability', cost: 2, rank: 3, requires: [id('extra-0')], ability: extras[1] });
  const cap: Partial<Stats> = {};
  for (const k of topStats(c)) cap[k] = 1;
  nodes.push({ id: id('capstone'), career: careerId, tier: 4, kind: 'capstone', cost: 2, rank: 4, requires: [id('stat-b'), ...(extras[1] ? [id('extra-1')] : [])], stats: cap, label: `Mastery: +1 ${(Object.keys(cap) as StatKey[]).map((k) => STAT_LABEL[k]).join(', ')}` });
  // Senior Move (05 §2): the reward for mastering a career, next to the capstone.
  if (c.senior) nodes.push({ id: id('senior'), career: careerId, tier: 4, kind: 'ability', cost: 2, rank: 4, requires: [id('stat-b'), ...(extras[1] ? [id('extra-1')] : extras[0] ? [id('extra-0')] : [])], ability: c.senior, label: 'Senior Move' });
  return nodes;
}

// ---------------------------------------------------------------------------
// Career-mode character: a Character plus per-career XP and unlocked nodes.
// ---------------------------------------------------------------------------
export interface CareerChar {
  c: Character;
  careerXp: Record<string, number>;
  nodes: string[];
  /** Agency temp: filled in automatically, can't be customised. */
  temp?: boolean;
  /** Up to 3 shop items taken into fights. */
  loadout?: string[];
  /** Loot items worn (up to economy.loot.slots): stat points and maybe a granted ability. */
  gear?: LootItem[];
}

export function careerRank(cc: CareerChar, careerId: string): number {
  return rankOf(cc.careerXp[careerId] ?? 0);
}

export function pointsLeft(bundle: ContentBundle, cc: CareerChar, careerId: string): number {
  const spent = skillTree(bundle, careerId)
    .filter((n) => cc.nodes.includes(n.id))
    .reduce((s, n) => s + n.cost, 0);
  return skillPointsAt(careerRank(cc, careerId)) - spent;
}

/** Why a node can't be unlocked right now (null = it can). */
export function unlockBlocker(bundle: ContentBundle, cc: CareerChar, node: SkillNode): string | null {
  if (cc.nodes.includes(node.id)) return 'Already unlocked';
  if (!cc.c.careers.includes(node.career)) return 'Career not taken';
  if (careerRank(cc, node.career) < node.rank) return `Needs ${RANKS[node.rank - 1]} rank`;
  if (node.requires.length && !node.requires.some((r) => cc.nodes.includes(r))) return 'Unlock a skill above it first';
  if (pointsLeft(bundle, cc, node.career) < node.cost) return `Needs ${node.cost} skill point${node.cost === 1 ? '' : 's'}`;
  return null;
}

export function unlockNode(bundle: ContentBundle, cc: CareerChar, nodeId: string): string | null {
  const node = skillTree(bundle, nodeId.split(':')[0]!).find((n) => n.id === nodeId);
  if (!node) return 'Unknown skill';
  const why = unlockBlocker(bundle, cc, node);
  if (why) return why;
  cc.nodes.push(node.id);
  return null;
}

/** Free root nodes (each career's main move) are always unlocked. */
export function ensureRoots(bundle: ContentBundle, cc: CareerChar): void {
  for (const cid of cc.c.careers) {
    const root = `${cid}:active`;
    if (!cc.nodes.includes(root) && skillTree(bundle, cid).length) cc.nodes.push(root);
    cc.careerXp[cid] ??= 0;
  }
}

/** Battle snapshot with only the unlocked skills, perk stats folded in and reflex perks attached. */
export function careerSnapshot(bundle: ContentBundle, cc: CareerChar): CharacterSnapshot {
  const snap = toSnapshot(cc.c);
  const unlocked: string[] = [];
  const stats = { ...snap.stats };
  const defense = { parryBp: 0, evadeBp: 0, dashBp: 0 };
  for (const cid of cc.c.careers) {
    for (const n of skillTree(bundle, cid)) {
      if (!cc.nodes.includes(n.id)) continue;
      if (n.ability) unlocked.push(n.ability);
      for (const [k, v] of Object.entries(n.stats ?? {}) as [StatKey, number][]) stats[k] += v;
      defense.parryBp += n.defense?.parryBp ?? 0;
      defense.evadeBp += n.defense?.evadeBp ?? 0;
      defense.dashBp += n.defense?.dashBp ?? 0;
    }
  }
  const gear = (cc.gear ?? []).slice(0, bundle.economy.loot.slots);
  for (const [k, v] of Object.entries(gearStats(gear)) as [StatKey, number][]) stats[k] += v;
  const granted = [...new Set(gear.flatMap((g) => (g.ability ? [g.ability] : [])))];
  return { ...snap, stats, unlocked, defenseBonus: defense, loadout: (cc.loadout ?? []).slice(0, 3), ...(granted.length ? { granted } : {}) };
}

// ---------------------------------------------------------------------------
// Difficulty: how strong opponents are relative to the ladder stage.
// ---------------------------------------------------------------------------
export type DifficultyId = 'relaxed' | 'normal' | 'hard' | 'brutal';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  blurb: string;
  levelOffset: number;
  rankOffset: number;
  /** Share of affordable skill points enemies actually spend (bp); brutal ignores points entirely. */
  spendBp: number;
  allSkills: boolean;
  /** Added to every stat of opponents (their "form" on the day). */
  statOffset: number;
  /** Reward multiplier (bp). */
  rewardBp: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'relaxed', name: 'Relaxed', blurb: 'Opponents are a level behind and barely use their skills.', levelOffset: -1, rankOffset: -1, spendBp: 3000, allSkills: false, statOffset: -2, rewardBp: 8000 },
  { id: 'normal', name: 'Normal', blurb: 'Opponents keep pace with you and use most of their skills.', levelOffset: 0, rankOffset: 0, spendBp: 7000, allSkills: false, statOffset: -1, rewardBp: 10000 },
  { id: 'hard', name: 'Hard', blurb: 'Opponents are a level ahead with every skill they can afford.', levelOffset: 1, rankOffset: 0, spendBp: 10000, allSkills: false, statOffset: 0, rewardBp: 13000 },
  { id: 'brutal', name: 'Brutal', blurb: 'Opponents have every skill unlocked and two extra levels.', levelOffset: 2, rankOffset: 2, spendBp: 10000, allSkills: true, statOffset: 0, rewardBp: 17000 },
];

export function difficulty(id: DifficultyId): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]!;
}

/** Spend a character's points the way an AI opponent would: cheapest available node first, up to a share of the budget. */
export function autoUnlock(bundle: ContentBundle, cc: CareerChar, rng: Rng, spendBp: number): void {
  ensureRoots(bundle, cc);
  for (const cid of cc.c.careers) {
    let budget = Math.floor((skillPointsAt(careerRank(cc, cid)) * spendBp) / 10000);
    for (let guard = 0; guard < 12 && budget > 0; guard++) {
      const open = skillTree(bundle, cid).filter((n) => !unlockBlocker(bundle, cc, n) && n.cost <= budget);
      if (!open.length) break;
      const pick = open[rng.int(open.length)]!;
      cc.nodes.push(pick.id);
      budget -= pick.cost;
    }
  }
}

/** A generated fighter at a level and rank, skills spent per difficulty. */
export function generatedFighter(bundle: ContentBundle, rng: Rng, id: string, level: number, rank: number, diff: DifficultyDef, careerPool?: string[]): CareerChar {
  const c = generateRecruit(bundle, rng, id, careerPool ? { careerPool } : {});
  c.level = Math.max(1, level);
  for (let p = 1; p < c.level; p++) c.stats[rng.pick(STAT_KEYS)] += 1;
  // Extra careers at the usual milestones.
  const slots = careerSlots(bundle.economy, c.level);
  const tier1 = bundle.careers.filter((x) => x.tier === 1 && !x.deprecated).map((x) => x.id);
  while (c.careers.length < slots) {
    const options = tier1.filter((x) => !c.careers.includes(x));
    if (!options.length) break;
    c.careers.push(rng.pick(options));
  }
  const cc: CareerChar = { c, careerXp: {}, nodes: [] };
  c.careers.forEach((cid, i) => (cc.careerXp[cid] = RANK_XP[Math.max(0, Math.min(4, rank - 1 - i))]!));
  if (diff.allSkills) {
    for (const cid of c.careers) for (const n of skillTree(bundle, cid)) cc.nodes.push(n.id);
  } else autoUnlock(bundle, cc, rng, diff.spendBp);
  return cc;
}

// ---------------------------------------------------------------------------
// The ladder: stages of increasingly capable companies across the arenas.
// ---------------------------------------------------------------------------
const COMPANIES = [
  'Tuesday Temps',
  'Budget Solutions Ltd',
  'Synergy Partners',
  'Night Shift',
  'The Interns',
  'Middle Management',
  'HR Department',
  'Overtime Heroes',
  'Weekend Crew',
  'Head Office',
  'Quarterly Review',
  'The Board',
];

export const STAGES_PER_ARENA = 4;
/** Stat points a boss gets for each career slot it fights without. */
const BOSS_POINTS_PER_SLOT = 4;

export interface StageInfo {
  stage: number;
  arenaId: string;
  company: string;
  /** Opponent level and rank before difficulty. */
  level: number;
  rank: number;
  boss: boolean;
  /** On a boss stage: the arena's boss career and the boss's name. */
  bossCareer?: string;
  bossName?: string;
}

export function stageInfo(bundle: ContentBundle, stage: number): StageInfo {
  // New arenas go at the end, so existing careers keep the arenas they have already seen.
  const order = [
    'arena.supermarket',
    'arena.office',
    'arena.diner',
    'arena.station',
    'arena.warehouse',
    'arena.construction',
    'arena.docks',
    'arena.hotel',
    'arena.hospital',
    'arena.museum',
    'arena.airport',
    'arena.theatre',
  ].filter((a) => bundle.arenas.some((x) => x.id === a));
  const chapter = Math.floor(stage / STAGES_PER_ARENA);
  const arenaId = order[chapter % order.length]!;
  const boss = stage % STAGES_PER_ARENA === STAGES_PER_ARENA - 1;
  const b = boss ? bundle.arenas.find((a) => a.id === arenaId)?.boss : undefined;
  return {
    stage,
    arenaId,
    company: COMPANIES[stage % COMPANIES.length]!,
    level: 1 + Math.floor(stage * 0.7),
    rank: Math.min(5, 1 + Math.floor(stage / 3)),
    boss,
    ...(b ? { bossCareer: b.career, bossName: b.name } : {}),
  };
}

export function opponentTeam(bundle: ContentBundle, seed: string, stage: number, diff: DifficultyDef, size: number): CareerChar[] {
  const info = stageInfo(bundle, stage);
  const rng = Rng.fromSeed(`opp:${seed}:${stage}`);
  const out: CareerChar[] = [];
  for (let i = 0; i < size; i++) {
    const boss = info.boss && i === 0;
    // Bosses are a level or two up, less so early on, where a level is a big share of a fighter.
    const bossLevels = boss ? Math.min(2, Math.floor(stage / STAGES_PER_ARENA)) : 0;
    const f = generatedFighter(bundle, rng, `opp-${seed}-${stage}-${i}`, info.level + diff.levelOffset + bossLevels, info.rank + diff.rankOffset + (boss ? 1 : 0), diff);
    if (boss && info.bossCareer) makeBoss(bundle, f, info.bossCareer, info.bossName ?? f.c.name, info.rank + diff.rankOffset + 1);
    for (const k of STAT_KEYS) f.c.stats[k] = Math.max(1, f.c.stats[k] + diff.statOffset);
    f.loadout = aiLoadout(bundle, rng, diff, stage);
    // Own RNG stream, so gear never shifts how the rest of the team is generated.
    f.gear = opponentGear(bundle, Rng.fromSeed(`gear:${seed}:${stage}:${i}`), stage, f.c.id, boss);
    out.push(f);
  }
  // From stage 10 a summoner sometimes turns up (their Senior Move unlocked): a glimpse of what the
  // player can reach. More likely the further up the ladder. Own RNG stream, so nobody else changes.
  if (stage >= SUMMONERS_FROM_STAGE) {
    const r = Rng.fromSeed(`summoner:${seed}:${stage}`);
    const pool = summonCareers(bundle);
    const slots = out.map((_, i) => i).filter((i) => !(info.boss && i === 0));
    if (pool.length && slots.length && r.chance(Math.min(7000, 3000 + (stage - SUMMONERS_FROM_STAGE) * 150))) {
      const i = r.pick(slots);
      const old = out[i]!;
      const career = r.pick(pool);
      const f = generatedFighter(bundle, r, old.c.id, old.c.level, info.rank + diff.rankOffset, diff, [career]);
      const node = skillTree(bundle, career).find((n) => n.ability === bundle.careers.find((c) => c.id === career)?.senior);
      if (node && !f.nodes.includes(node.id)) f.nodes.push(node.id);
      f.loadout = old.loadout;
      f.gear = old.gear;
      out[i] = f;
    }
  }
  return out;
}

/** Ladder stage (0-based) from which opponents may bring a summoner. */
export const SUMMONERS_FROM_STAGE = 9;

/** Regular careers whose Senior Move summons critters. */
export function summonCareers(bundle: ContentBundle): string[] {
  return bundle.careers
    .filter((c) => !c.boss && !c.deprecated && c.senior && bundle.abilities.find((a) => a.id === c.senior)?.effects?.some((e) => e.type === 'summon'))
    .map((c) => c.id);
}

/**
 * Turn a generated fighter into the arena's boss: the boss career only (their
 * three signature moves and passive, all unlocked whatever the difficulty),
 * their own name, and the level and stats the fighter already rolled.
 */
function makeBoss(bundle: ContentBundle, f: CareerChar, career: string, name: string, rank: number): void {
  // A boss fights with one career where others have several by mid-ladder: each
  // career slot given up becomes stat points in the boss's strongest stats.
  const dropped = f.c.careers.length - 1;
  const def = bundle.careers.find((x) => x.id === career);
  const best = def ? topStats(def) : [];
  for (let i = 0; i < dropped * BOSS_POINTS_PER_SLOT && best.length; i++) f.c.stats[best[i % best.length]!] += 1;
  f.c.careers = [career];
  f.c.name = name;
  f.careerXp = { [career]: RANK_XP[Math.max(0, Math.min(4, rank - 1))]! };
  // Every move and the passive, always; stat perks and the capstone as their rank allows,
  // so an early boss isn't eight stat points ahead of everyone else.
  f.nodes = skillTree(bundle, career)
    .filter((n) => n.kind === 'ability' || n.kind === 'passive' || n.rank <= rank - 2)
    .map((n) => n.id);
}

/** Agency temps fill the squad until you can build one: roughly your level, sensible skills. */
export function agencyTemp(bundle: ContentBundle, seed: string, slot: number, level: number, rank: number): CareerChar {
  const rng = Rng.fromSeed(`temp:${seed}:${slot}:${level}`);
  const t = generatedFighter(bundle, rng, `temp-${seed}-${slot}`, level, rank, difficulty('normal'));
  t.temp = true;
  // The agency sends them with a packed lunch.
  t.loadout = ['item.meal-deal'];
  return t;
}

// ---------------------------------------------------------------------------
// After a fight: XP, levels, career ranks.
// ---------------------------------------------------------------------------
export interface GrowthReport {
  id: string;
  xp: number;
  levelsGained: number;
  rankBefore: number;
  rankAfter: number;
  career: string;
}

/** Adds battle XP to a character and to their current (latest) career. */
export function grow(bundle: ContentBundle, cc: CareerChar, xp: number): GrowthReport {
  const career = cc.c.careers[cc.c.careers.length - 1]!;
  const rankBefore = careerRank(cc, career);
  const levelsGained = addXp(bundle.economy, cc.c, xp);
  cc.careerXp[career] = (cc.careerXp[career] ?? 0) + xp;
  return { id: cc.c.id, xp, levelsGained, rankBefore, rankAfter: careerRank(cc, career), career };
}

// ---------------------------------------------------------------------------
// Economy (03 §3.6): fight pay and what opponents bring into a fight.
// ---------------------------------------------------------------------------
export const LOADOUT_SLOTS = 3;

/** Which shop tier is on sale at a ladder stage. */
export function shopTierAt(stage: number): number {
  return stage >= 12 ? 3 : stage >= 5 ? 2 : 1;
}

/** Opponents shop too: more (and better) items on harder difficulties and later stages. */
export function aiLoadout(bundle: ContentBundle, rng: Rng, diff: DifficultyDef, stage: number): string[] {
  const [lo, hi] = diff.id === 'relaxed' ? [0, 1] : diff.id === 'normal' ? [1, 2] : diff.id === 'hard' ? [2, 3] : [3, 3];
  const count = rng.range(lo, hi);
  const pool = (bundle.shopItems ?? []).filter((i) => i.tier <= shopTierAt(stage)).map((i) => i.id);
  const out: string[] = [];
  for (let i = 0; i < count && pool.length; i++) out.push(pool[rng.int(pool.length)]!);
  return out;
}

export interface FightPay {
  base: number;
  stage: number;
  kos: number;
  koCount: number;
  multiplier: number;
  total: number;
}

/** Cash for a fight: something for showing up, more for winning, a bonus per enemy knocked out. */
export function fightPay(outcome: 'win' | 'draw' | 'loss', stage: number, koCount: number, diff: DifficultyDef): FightPay {
  const base = outcome === 'win' ? 150 : outcome === 'draw' ? 70 : 40;
  const stageBonus = outcome === 'win' ? stage * 12 : 0;
  const kos = koCount * 30;
  const multiplier = diff.rewardBp / 10000;
  return { base, stage: stageBonus, kos, koCount, multiplier, total: Math.round((base + stageBonus + kos) * multiplier) };
}
