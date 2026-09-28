import { STAT_KEYS, type ContentBundle, type EconomyDef } from '@cc/content-schema';
import { finalStats, indexContent, Rng, type CharacterSnapshot, type TeamSnapshot } from '@cc/sim';
import { generateRecruit, toSnapshot, type Character } from './character';
import { addXp } from './progression';

// ---------------------------------------------------------------------------
// Rating and leagues (03 §5)
// ---------------------------------------------------------------------------
export function kFactor(econ: EconomyDef, rating: number): number {
  const r = econ.rating;
  return rating < r.lowBelow ? r.kLow : rating > r.highAbove ? r.kHigh : r.kMid;
}

export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/**
 * Rating change for attacker and defender. `score` is the attacker's score (1 win, 0.5 draw, 0 loss).
 * Defence losses count at reduced K (the defender wasn't there); defence wins give full gain.
 */
export function ratingChange(econ: EconomyDef, attacker: number, defender: number, score: number): { attacker: number; defender: number } {
  const ea = expectedScore(attacker, defender);
  const da = Math.round(kFactor(econ, attacker) * (score - ea));
  let dd = Math.round(kFactor(econ, defender) * (1 - score - (1 - ea)));
  if (dd < 0) dd = Math.round((dd * econ.rating.defenceLossFactorBp) / 10000);
  return { attacker: da, defender: dd };
}

export function leagueFor(econ: EconomyDef, rating: number): string {
  let id = econ.leagues[0]!.id;
  for (const l of econ.leagues) if (rating >= l.minRating) id = l.id;
  return id;
}

// ---------------------------------------------------------------------------
// Rewards (03 §5.4, §7)
// ---------------------------------------------------------------------------
export type Difficulty = 'easy' | 'even' | 'hard';
export type Outcome = 'win' | 'draw' | 'loss';

export function attackReward(econ: EconomyDef, outcome: Outcome, difficulty: Difficulty, winsToday: number): { cash: number; rep: number } {
  const key = outcome === 'win' ? `attack_win_${difficulty}` : `attack_${outcome}`;
  const base = econ.rewards[key] ?? { cash: 0, rep: 0 };
  let cash = base.cash;
  if (outcome === 'win' && winsToday < econ.overtime.wins) cash = Math.trunc((cash * econ.overtime.multiplierBp) / 10000);
  return { cash, rep: base.rep };
}

export function defenceReward(econ: EconomyDef, outcome: Outcome): { cash: number; rep: number } {
  return econ.rewards[`defence_${outcome}`] ?? { cash: 0, rep: 0 };
}

/** Shift pay for idle characters, capped at `capHours` (03 §7). */
export function offlinePay(bundle: ContentBundle, roster: Character[], lastSettledMs: number, nowMs: number): { cash: number; hours: number } {
  const econ = bundle.economy;
  const hours = Math.min(econ.offline.capHours, Math.max(0, Math.floor((nowMs - lastSettledMs) / 3_600_000)));
  if (hours === 0) return { cash: 0, hours: 0 };
  const tiers = new Map(bundle.careers.map((c) => [c.id, c.tier]));
  let tierSum = 0;
  for (const c of roster) if (!c.retired) for (const id of c.careers) tierSum += tiers.get(id) ?? 1;
  return { cash: econ.offline.cashPerTierPerHour * tierSum * hours, hours };
}

/** Tickets regenerate over time up to the cap (03 §2). */
export function regenTickets(econ: EconomyDef, tickets: number, lastRegenMs: number, nowMs: number): { tickets: number; lastRegenMs: number } {
  if (tickets >= econ.tickets.cap) return { tickets, lastRegenMs: nowMs };
  const period = econ.tickets.regenMinutes * 60_000;
  const gained = Math.floor((nowMs - lastRegenMs) / period);
  if (gained <= 0) return { tickets, lastRegenMs };
  const t = Math.min(econ.tickets.cap, tickets + gained);
  return { tickets: t, lastRegenMs: t >= econ.tickets.cap ? nowMs : lastRegenMs + gained * period };
}

export function rosterSlotCost(econ: EconomyDef, slot: number): number {
  const n = slot - (econ.rosterSlots.start - 1);
  return econ.rosterSlots.costBase * n * n;
}

// ---------------------------------------------------------------------------
// Team power and opponent selection (03 §5.2)
// ---------------------------------------------------------------------------
export function characterPower(bundle: ContentBundle, snap: CharacterSnapshot): number {
  const s = finalStats(indexContent(bundle), snap);
  let p = 0;
  for (const k of STAT_KEYS) p += s[k];
  return p + snap.careers.length * 6 + snap.masteries.length * 8;
}

export function teamPower(bundle: ContentBundle, team: CharacterSnapshot[]): number {
  return team.reduce((s, c) => s + characterPower(bundle, c), 0);
}

export interface DefenceCandidate {
  playerId: string;
  playerName: string;
  rating: number;
  power: number;
  ghost: boolean;
}

export interface OpponentCard extends DefenceCandidate {
  difficulty: Difficulty;
}

/** Pick Easy / Even / Hard opponents from a candidate pool. Pure and deterministic given `seed`. */
export function pickOpponents(pool: DefenceCandidate[], myRating: number, myPower: number, seed: string, exclude: Set<string>): OpponentCard[] {
  const rng = Rng.fromSeed(seed);
  const usable = pool.filter((p) => !exclude.has(p.playerId) && Math.abs(p.power - myPower) <= Math.max(20, Math.trunc(myPower * 0.35)));
  const bands: [Difficulty, number, number][] = [
    ['easy', myRating - 150, myRating - 20],
    ['even', myRating - 60, myRating + 60],
    ['hard', myRating + 20, myRating + 250],
  ];
  const out: OpponentCard[] = [];
  const taken = new Set<string>();
  for (const [difficulty, lo, hi] of bands) {
    let cands = usable.filter((p) => p.rating >= lo && p.rating <= hi && !taken.has(p.playerId));
    if (cands.length === 0) {
      // Fall back to the closest rating in the right direction.
      const sorted = usable
        .filter((p) => !taken.has(p.playerId))
        .sort((a, b) => Math.abs(a.rating - (lo + hi) / 2) - Math.abs(b.rating - (lo + hi) / 2) || (a.playerId < b.playerId ? -1 : 1));
      cands = sorted.slice(0, 3);
    }
    if (cands.length === 0) continue;
    cands.sort((a, b) => (a.playerId < b.playerId ? -1 : 1));
    const pick = cands[rng.int(cands.length)]!;
    taken.add(pick.playerId);
    out.push({ ...pick, difficulty });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bot / ghost defences for thin pools (03 §5.2)
// ---------------------------------------------------------------------------
const BOT_COMPANIES = ['Acme Temps', 'Night Shift', 'Middle Management', 'The Interns', 'HR Department', 'Weekend Crew', 'Head Office', 'Overtime Heroes'];

/** A deterministic bot team at roughly the given rating: higher ratings → more levels and careers. */
export function botTeam(bundle: ContentBundle, seed: string, rating: number, size: number): TeamSnapshot {
  const rng = Rng.fromSeed(seed);
  const level = Math.max(1, Math.min(40, Math.round((rating - 900) / 25)));
  const unlocked = bundle.careers.filter((c) => !c.deprecated).map((c) => c.id);
  const characters: CharacterSnapshot[] = [];
  for (let i = 0; i < size; i++) {
    const c = generateRecruit(bundle, rng, `bot-${seed}-${i}`, { rarity: rating > 1300 ? 'rare' : 'common' });
    addXp(bundle.economy, c, 0);
    c.level = level;
    // Spend points on random stats and fill career slots.
    for (let p = 1; p < level; p++) c.stats[rng.pick(STAT_KEYS)] += 1;
    const slots = bundle.economy.careerSlotLevels.filter((l) => level >= l).length;
    while (c.careers.length < slots) {
      const options = unlocked.filter((id) => !c.careers.includes(id));
      const byId = new Map(bundle.careers.map((x) => [x.id, x]));
      const eligible = options.filter((id) => {
        const def = byId.get(id)!;
        return !def.prerequisites || def.prerequisites.anyOf.some((g) => g.every((x) => c.careers.includes(x)));
      });
      if (eligible.length === 0) break;
      c.careers.push(rng.pick(eligible));
    }
    characters.push(toSnapshot(c));
  }
  return { playerId: `bot:${seed}`, playerName: rng.pick(BOT_COMPANIES), rating, characters };
}

// ---------------------------------------------------------------------------
// Monetisation guard (03 §6.1): premium currency may only buy cosmetics.
// ---------------------------------------------------------------------------
export const COSMETIC_TARGETS = ['cosmetic', 'portrait_frame', 'victory_animation', 'title_style', 'outfit_variant', 'arena_skin', 'replay_theme', 'name_change'] as const;
export type Currency = 'cash' | 'rep' | 'tickets' | 'stars';

/** Every allowed conversion/spend edge in the economy. `stars` must never reach a power currency. */
export const SPEND_GRAPH: Record<Currency, readonly string[]> = {
  cash: ['recruit', 'equipment', 'reroll', 'retrain', 'roster_slot'],
  rep: ['career_unlock', 'arena_unlock'],
  tickets: ['rated_attack'],
  stars: COSMETIC_TARGETS,
};

export function canSpend(currency: Currency, target: string): boolean {
  return SPEND_GRAPH[currency].includes(target);
}
