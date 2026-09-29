import { signal } from '@preact/signals';
import { bundle } from '@cc/content';
import {
  agencyTemp,
  applyBattleToCharacter,
  battleXp,
  careerOffers,
  careerRank,
  careerSnapshot,
  chooseCareer,
  difficulty,
  ensureRoots,
  evaluateTraits,
  generateRecruit,
  grow,
  hasMilestone,
  opponentTeam,
  recruitRarity,
  relationshipDeltas,
  SQUAD_UNLOCK_RANK,
  stageInfo,
  type CareerChar,
  type Character,
  type DifficultyId,
  type GrowthReport,
} from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, type BattleInput } from '@cc/sim';

/**
 * Offline career mode (03 §8): one main character climbs a ladder of fights,
 * levels up, ranks up in their careers, spends skill points, and — once they
 * reach Senior rank — builds their own squad. Saved in the browser.
 */
export interface CareerSave {
  v: 1;
  seed: string;
  difficulty: DifficultyId;
  mainId: string;
  chars: Record<string, CareerChar>;
  /** Hired teammates in the squad (up to 2); empty slots are filled by agency temps. */
  squad: string[];
  /** Next ladder stage (0-based). */
  stage: number;
  cash: number;
  applicants: Character[];
  pending: { input: BattleInput; stage: number } | null;
  last: FightSummary | null;
  wins: number;
  losses: number;
}

export interface FightSummary {
  stage: number;
  outcome: 'win' | 'draw' | 'loss';
  cash: number;
  growth: (GrowthReport & { name: string; newTraits: string[]; milestone: boolean })[];
  unlockedSquad: boolean;
}

const KEY = 'cc.career.v1';
export const HIRE_COST = { common: 250, rare: 450, epic: 700 } as const;
export const ROSTER_CAP = 6;

function load(): CareerSave | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CareerSave) : null;
  } catch {
    return null;
  }
}

export const career = signal<CareerSave | null>(load());

export function save(s: CareerSave): void {
  career.value = { ...s };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the career lasts for this page.
  }
}

export function abandon(): void {
  career.value = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function mainChar(s: CareerSave): CareerChar {
  return s.chars[s.mainId]!;
}

export function currentCareer(cc: CareerChar): string {
  return cc.c.careers[cc.c.careers.length - 1]!;
}

export function squadUnlocked(s: CareerSave): boolean {
  const m = mainChar(s);
  return careerRank(m, m.c.careers[0]!) >= SQUAD_UNLOCK_RANK || m.c.careers.some((cid) => careerRank(m, cid) >= SQUAD_UNLOCK_RANK);
}

/** A fresh main character for the creation screen. */
export function draftCharacter(seed: string, careerId: string): Character {
  const c = generateRecruit(bundle, Rng.fromSeed(`draft:${seed}`), 'main', { careerPool: [careerId], rarity: 'rare' });
  return c;
}

export function startCareer(main: Character, diff: DifficultyId): void {
  const seed = Math.random().toString(16).slice(2, 10);
  const mc: CareerChar = { c: { ...main, id: `main-${seed}` }, careerXp: {}, nodes: [] };
  ensureRoots(bundle, mc);
  const s: CareerSave = {
    v: 1,
    seed,
    difficulty: diff,
    mainId: mc.c.id,
    chars: { [mc.c.id]: mc },
    squad: [],
    stage: 0,
    cash: 300,
    applicants: [],
    pending: null,
    last: null,
    wins: 0,
    losses: 0,
  };
  save(s);
}

/** Teammates for the next fight: hires in the squad, then agency temps. */
export function lineup(s: CareerSave): CareerChar[] {
  const m = mainChar(s);
  const rank = careerRank(m, currentCareer(m));
  const mates: CareerChar[] = s.squad.map((id) => s.chars[id]).filter((x): x is CareerChar => !!x);
  for (let i = mates.length; i < 2; i++) mates.push(agencyTemp(bundle, s.seed, i, m.c.level, rank));
  return [m, ...mates];
}

export function nextOpponents(s: CareerSave): CareerChar[] {
  return opponentTeam(bundle, s.seed, s.stage, difficulty(s.difficulty), 3);
}

/** Build the battle for the next stage and remember it until results are collected. */
export function prepareFight(s: CareerSave): BattleInput {
  const info = stageInfo(bundle, s.stage);
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed: `${s.seed}:${s.stage}:${s.wins + s.losses}`,
    arenaId: info.arenaId,
    mode: 'duel_3v3',
    teams: [
      { playerId: 'you', playerName: 'Your Squad', rating: 1000, characters: lineup(s).map((c) => careerSnapshot(bundle, c)) },
      { playerId: 'opp', playerName: info.company, rating: 1000, characters: nextOpponents(s).map((c) => careerSnapshot(bundle, c)) },
    ],
    modifiers: [],
  };
  save({ ...s, pending: { input, stage: s.stage } });
  return input;
}

/** Apply the pending fight's result (deterministic re-simulation, so it can't be gamed). */
export function collectResults(s: CareerSave): CareerSave {
  if (!s.pending) return s;
  const { input, stage } = s.pending;
  const out = simulate(input, bundle);
  const outcome: 'win' | 'draw' | 'loss' = out.result.winner === 0 ? 'win' : out.result.winner < 0 ? 'draw' : 'loss';
  const diff = difficulty(s.difficulty);
  const wasUnlocked = squadUnlocked(s);
  const rel = relationshipDeltas(out.result, out.events);
  const growth: FightSummary['growth'] = [];
  for (const r of out.result.characters) {
    if (r.team !== 0) continue;
    const cc = s.chars[r.snapshotId];
    if (!cc) continue; // agency temps don't persist
    const mvp = out.result.mvp === r.entityId;
    const xp = Math.round((battleXp(bundle.economy, outcome, r.counters.kos, mvp, false) * diff.rewardBp) / 10000);
    const g = grow(bundle, cc, xp);
    applyBattleToCharacter(cc.c, r, outcome, mvp);
    const newTraits = evaluateTraits(bundle, cc.c);
    for (const [other, d] of rel.get(cc.c.id) ?? []) cc.c.relationships[other] = Math.max(-10, Math.min(10, (cc.c.relationships[other] ?? 0) + d));
    const milestone = hasMilestone(bundle.economy, cc.c);
    if (milestone && !cc.c.pendingOffer) cc.c.pendingOffer = careerOffers(bundle, cc.c, bundle.careers.filter((x) => !x.deprecated).map((x) => x.id), `${s.seed}:${cc.c.id}:${cc.c.level}`);
    growth.push({ ...g, name: cc.c.name, newTraits, milestone });
  }
  const base = outcome === 'win' ? 120 + stage * 20 : outcome === 'draw' ? 60 : 40;
  const cash = Math.round((base * diff.rewardBp) / 10000);
  const next: CareerSave = {
    ...s,
    stage: outcome === 'win' ? stage + 1 : stage,
    cash: s.cash + cash,
    pending: null,
    wins: s.wins + (outcome === 'win' ? 1 : 0),
    losses: s.losses + (outcome === 'loss' ? 1 : 0),
    applicants: outcome === 'win' ? [] : s.applicants,
    last: null,
  };
  next.last = { stage, outcome, cash, growth, unlockedSquad: !wasUnlocked && squadUnlocked(next) };
  save(next);
  return next;
}

/** Three job applicants near the main character's level (regenerated after each win). */
export function applicants(s: CareerSave): Character[] {
  if (s.applicants.length) return s.applicants;
  const rng = Rng.fromSeed(`hire:${s.seed}:${s.stage}`);
  const m = mainChar(s);
  const list = [0, 1, 2].map((i) => {
    const c = generateRecruit(bundle, rng, `hire-${s.seed}-${s.stage}-${i}`, { rarity: recruitRarity(rng) });
    c.level = Math.max(1, m.c.level - 1);
    for (let p = 1; p < c.level; p++) c.unspentPoints++;
    return c;
  });
  save({ ...s, applicants: list });
  return list;
}

export function rarityOf(c: Character): keyof typeof HIRE_COST {
  const total = Object.values(c.stats).reduce((a, b) => a + b, 0);
  return total >= 66 ? 'epic' : total >= 63 ? 'rare' : 'common';
}

export function hire(s: CareerSave, c: Character): string | null {
  const cost = HIRE_COST[rarityOf(c)];
  if (s.cash < cost) return `Needs $${cost}`;
  if (Object.keys(s.chars).length >= ROSTER_CAP) return `Roster is full (${ROSTER_CAP})`;
  const cc: CareerChar = { c, careerXp: {}, nodes: [] };
  ensureRoots(bundle, cc);
  const squad = s.squad.length < 2 ? [...s.squad, c.id] : s.squad;
  save({ ...s, cash: s.cash - cost, chars: { ...s.chars, [c.id]: cc }, squad, applicants: s.applicants.filter((x) => x.id !== c.id) });
  return null;
}

export function toggleSquad(s: CareerSave, id: string): string | null {
  if (s.squad.includes(id)) {
    save({ ...s, squad: s.squad.filter((x) => x !== id) });
    return null;
  }
  if (s.squad.length >= 2) return 'Squad is full — bench someone first';
  save({ ...s, squad: [...s.squad, id] });
  return null;
}

export function dismiss(s: CareerSave, id: string): void {
  if (id === s.mainId) return;
  const chars = { ...s.chars };
  delete chars[id];
  save({ ...s, chars, squad: s.squad.filter((x) => x !== id) });
}

export function pickCareer(s: CareerSave, charId: string, careerId: string): string | null {
  const cc = s.chars[charId];
  if (!cc) return 'Unknown character';
  const res = chooseCareer(bundle, cc.c, careerId);
  if (res.error) return res.error;
  cc.c.pendingOffer = null;
  ensureRoots(bundle, cc);
  save({ ...s });
  return null;
}
