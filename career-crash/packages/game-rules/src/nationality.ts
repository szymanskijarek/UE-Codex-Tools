import type { ContentBundle, EconomyDef } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import type { CharacterSnapshot } from '@cc/sim';
import { countriesDef, type LikeTally } from './incident';

// ---------------------------------------------------------------------------
// Nationality in career mode (economy.json → nationality): the main
// character's country, if the player picked one, lends a small boost when it
// did well at the Diplomatic Incident (09) in the last finished hour.
// ---------------------------------------------------------------------------

export type NationalityTier = EconomyDef['nationality']['tiers'][number];

/** One finished Summit hour: every like it got, by country. */
export interface SummitHour {
  hour: string;
  totals: LikeTally;
}

export interface NationalBoost {
  country: string;
  hour: string;
  /** 1 = most liked; tied countries share a rank. */
  rank: number;
  likes: number;
  tier: NationalityTier;
}

/** Every like of an hour, from the vote service's tallies: what the last session ran on plus what arrived during it. */
export function summitTotals(frozen: readonly LikeTally[], pending: LikeTally): LikeTally {
  const out: LikeTally = { ...(frozen[frozen.length - 1] ?? {}) };
  for (const [k, n] of Object.entries(pending)) out[k] = (out[k] ?? 0) + n;
  return out;
}

/** Countries a career character can belong to (the Summit's cast), by key. */
export function nationalityKeys(bundle: ContentBundle): string[] {
  return Object.keys(countriesDef(bundle).cast).sort();
}

/** The boost a country's last hour at the Summit earns, or null (no likes, outside every tier, or no country). */
export function nationalBoost(bundle: ContentBundle, country: string | undefined, summit: SummitHour | null): NationalBoost | null {
  if (!country || !summit) return null;
  const likes = summit.totals[country] ?? 0;
  if (likes < 1) return null;
  const rank = 1 + Object.values(summit.totals).filter((n) => n > likes).length;
  const tier = [...bundle.economy.nationality.tiers].sort((a, b) => a.maxRank - b.maxRank).find((t) => rank <= t.maxRank);
  return tier ? { country, hour: summit.hour, rank, likes, tier } : null;
}

/** Fold a boost into a battle snapshot: stats added, kick-off status attached (like an HR note, 06). */
export function applyNationalBoost(snap: CharacterSnapshot, boost: NationalBoost | null): CharacterSnapshot {
  if (!boost) return snap;
  const stats = { ...snap.stats };
  for (const k of STAT_KEYS) stats[k] = Math.max(1, stats[k] + (boost.tier.stats[k] ?? 0));
  const startStatuses = [...(snap.startStatuses ?? [])];
  if (boost.tier.status) startStatuses.push({ status: boost.tier.status.status, durationTicks: boost.tier.status.durationTicks });
  return { ...snap, stats, ...(startStatuses.length ? { startStatuses } : {}) };
}

/** Whether a career save may change its nationality now (the first pick is always free). */
export function canChangeNationality(bundle: ContentBundle, setAt: number | undefined, now: number): boolean {
  return setAt === undefined || now - setAt >= bundle.economy.nationality.changeCooldownH * 3_600_000;
}
