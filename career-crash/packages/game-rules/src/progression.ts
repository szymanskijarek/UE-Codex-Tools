import type { CareerDef, ContentBundle, EconomyDef } from '@cc/content-schema';
import { Rng, type BattleResult, type CharacterResult } from '@cc/sim';
import { lifetimeCounterFromResult, type Character } from './character';

// ---------------------------------------------------------------------------
// XP and levels (03 §3.1)
// ---------------------------------------------------------------------------
export function xpToNext(econ: EconomyDef, level: number): number {
  const { a, b, c } = econ.xp.curve;
  return a + b * level + c * level * level;
}

export function cumulativeXp(econ: EconomyDef, level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(econ, l);
  return total;
}

export function battleXp(econ: EconomyDef, outcome: 'win' | 'draw' | 'loss', kos: number, mvp: boolean, defence: boolean): number {
  let xp = econ.xp[outcome] + kos * econ.xp.perKo + (mvp ? econ.xp.mvp : 0);
  if (defence) xp = Math.trunc((xp * econ.xp.defenceMultiplierBp) / 10000);
  return xp;
}

/** Adds XP and applies level-ups. Returns the number of levels gained. */
export function addXp(econ: EconomyDef, c: Character, xp: number): number {
  let gained = 0;
  c.xp += xp;
  while (c.level < econ.xp.levelCap && c.xp >= cumulativeXp(econ, c.level + 1)) {
    c.level++;
    c.unspentPoints += econ.statPointsPerLevel;
    gained++;
  }
  return gained;
}

// ---------------------------------------------------------------------------
// Career milestones (03 §3.2)
// ---------------------------------------------------------------------------
export function careerSlots(econ: EconomyDef, level: number): number {
  return econ.careerSlotLevels.filter((l) => level >= l).length;
}

export function hasMilestone(econ: EconomyDef, c: Character): boolean {
  return c.careers.length < careerSlots(econ, c.level);
}

export function meetsPrerequisites(career: CareerDef, owned: string[]): boolean {
  if (!career.prerequisites) return true;
  return career.prerequisites.anyOf.some((group) => group.every((g) => owned.includes(g)));
}

/**
 * Offer N careers: mostly weighted toward shared tags with the character's
 * existing careers (coherent paths), plus one wildcard from anywhere.
 */
export function careerOffers(bundle: ContentBundle, c: Character, unlocked: string[], seed: string): string[] {
  const econ = bundle.economy;
  const rng = Rng.fromSeed(seed);
  const owned = new Set(c.careers);
  const byId = new Map(bundle.careers.map((x) => [x.id, x]));
  const myTags = new Set(c.careers.flatMap((id) => byId.get(id)?.tags ?? []));
  const eligible = unlocked
    .map((id) => byId.get(id))
    .filter((x): x is CareerDef => !!x && !owned.has(x.id) && !x.deprecated && meetsPrerequisites(x, c.careers))
    .sort((p, q) => (p.id < q.id ? -1 : 1));
  if (eligible.length === 0) return [];
  const weight = (x: CareerDef): number => 1 + 3 * x.tags.filter((t) => myTags.has(t)).length + (x.tier > 1 ? 2 : 0);
  const picks: string[] = [];
  const pool = [...eligible];
  const want = Math.min(econ.milestoneOffers, pool.length);
  while (picks.length < want - 1 && pool.length > 0) {
    const total = pool.reduce((s, x) => s + weight(x), 0);
    let r = rng.int(total);
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= weight(pool[idx]!);
      if (r < 0) break;
    }
    picks.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]!.id);
  }
  if (pool.length > 0 && picks.length < want) picks.push(pool.splice(rng.int(pool.length), 1)[0]!.id); // wildcard
  return picks;
}

/** Masteries whose requirements are now met and not yet held (02 §8.2). */
export function newMasteries(bundle: ContentBundle, c: Character): string[] {
  if (c.masteries.length >= bundle.economy.maxMasteries) return [];
  const out: string[] = [];
  for (const m of bundle.masteries) {
    if (c.masteries.includes(m.id)) continue;
    const req = m.requires.careers;
    if (!req.every((r) => c.careers.includes(r))) continue;
    if (m.requires.ordered) {
      let last = -1;
      let ok = true;
      for (const r of req) {
        const i = c.careers.indexOf(r);
        if (i <= last) {
          ok = false;
          break;
        }
        last = i;
      }
      if (!ok) continue;
    }
    out.push(m.id);
  }
  return out.slice(0, bundle.economy.maxMasteries - c.masteries.length);
}

/** Apply a chosen career. Returns newly unlocked masteries, or an error. */
export function chooseCareer(bundle: ContentBundle, c: Character, careerId: string): { error?: string; masteries: string[] } {
  if (!hasMilestone(bundle.economy, c)) return { error: 'no career milestone available', masteries: [] };
  if (!c.pendingOffer?.includes(careerId)) return { error: 'career not offered', masteries: [] };
  c.careers.push(careerId);
  c.pendingOffer = null;
  c.rerolls = 0;
  const masteries = newMasteries(bundle, c);
  c.masteries.push(...masteries);
  return { masteries };
}

// ---------------------------------------------------------------------------
// Post-battle: counters, traits, relationships (02 §8.4)
// ---------------------------------------------------------------------------
export function counterValue(c: Character, counter: string): number {
  const l = c.lifetime;
  switch (counter) {
    case 'battles':
      return l.battles;
    case 'wins':
      return l.wins;
    case 'winStreak':
      return l.bestWinStreak;
    case 'kos':
      return l.kos;
    case 'revives':
      return l.revives;
    case 'refereeHits':
      return l.refereeHits;
    case 'drops':
      return l.drops;
    case 'knockdowns':
      return l.knockdowns;
    default:
      return l.counters[counter] ?? 0;
  }
}

export function applyBattleToCharacter(c: Character, r: CharacterResult, outcome: 'win' | 'draw' | 'loss', mvp: boolean): void {
  const l = c.lifetime;
  l.battles++;
  if (outcome === 'win') {
    l.wins++;
    l.winStreak++;
    l.bestWinStreak = Math.max(l.bestWinStreak, l.winStreak);
  } else {
    if (outcome === 'loss') l.losses++;
    else l.draws++;
    l.winStreak = 0;
  }
  const k = r.counters;
  l.kos += k.kos;
  l.downs += k.downs;
  l.knockdowns += k.knockdowns;
  l.revives += k.revives;
  l.refereeHits += k.refereeHits;
  l.drops += k.drops;
  if (mvp) l.mvps++;
  for (const [key, v] of Object.entries(lifetimeCounterFromResult(k))) l.counters[key] = (l.counters[key] ?? 0) + v;
}

/** Earn traits whose counters crossed their threshold. Max traits rotate oldest-first unless locked. */
export function evaluateTraits(bundle: ContentBundle, c: Character): string[] {
  const earned: string[] = [];
  for (const t of bundle.traits) {
    if (c.traits.includes(t.id)) continue;
    if (t.exclusive?.some((x) => c.traits.includes(x))) continue;
    if (counterValue(c, t.earn.counter) < t.earn.atLeast) continue;
    if (c.traits.length >= bundle.economy.maxTraits) {
      const drop = c.traits.find((x) => !c.lockedTraits.includes(x));
      if (!drop) continue;
      c.traits.splice(c.traits.indexOf(drop), 1);
    }
    c.traits.push(t.id);
    earned.push(t.id);
  }
  return earned;
}

/**
 * Relationship scores between characters (negative = rivalry). KO'ing someone,
 * or being KO'd by them, pushes the pair toward rivalry; reviving builds friendship.
 */
export function relationshipDeltas(result: BattleResult, events: { type: string; a: number; b: number }[]): Map<string, Map<string, number>> {
  const byEntity = new Map(result.characters.map((c) => [c.entityId, c]));
  const out = new Map<string, Map<string, number>>();
  const bump = (x: string, y: string, d: number): void => {
    if (x === y) return;
    const m = out.get(x) ?? new Map<string, number>();
    m.set(y, (m.get(y) ?? 0) + d);
    out.set(x, m);
  };
  for (const e of events) {
    const a = byEntity.get(e.a);
    const b = byEntity.get(e.b);
    if (!a || !b) continue;
    if (e.type === 'ko' || e.type === 'downed') {
      // Whoever floors you becomes your rival straight away (rivals are ≤ −3); it takes the floorer longer to care.
      if (a.team !== b.team) bump(b.snapshotId, a.snapshotId, -3);
      else bump(b.snapshotId, a.snapshotId, -1);
      bump(a.snapshotId, b.snapshotId, -1);
    } else if (e.type === 'revived') {
      bump(a.snapshotId, b.snapshotId, 1);
      bump(b.snapshotId, a.snapshotId, 1);
    }
  }
  return out;
}
