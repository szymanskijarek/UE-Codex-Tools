import type { ContentBundle } from '@cc/content-schema';
import { LOOT_RARITIES, STAT_KEYS, type LootRarity, type StatKey, type Stats } from '@cc/content-schema/constants';
import type { Rng } from '@cc/sim';

/**
 * Loot: items dropped by won fights. Each is a base (Lucky Socks, Hard Hat…)
 * with a rarity, that rarity's stat points spread over one to three stats, and
 * sometimes an ability from any career. Items are plain data so they travel
 * with a fighter when other players pick them; `isValidLoot` is the check a
 * server runs before trusting one.
 */
export interface LootItem {
  uid: string;
  base: string;
  rarity: LootRarity;
  stats: Partial<Stats>;
  ability?: string;
}

export function rarityDef(bundle: ContentBundle, r: LootRarity) {
  return bundle.economy.loot.rarities.find((x) => x.id === r)!;
}

/** Roll a rarity `rolls` times and keep the best. */
export function rollRarity(bundle: ContentBundle, rng: Rng, rolls = 1): LootRarity {
  const rs = bundle.economy.loot.rarities;
  const total = rs.reduce((n, r) => n + r.weight, 0);
  let best = 0;
  for (let i = 0; i < Math.max(1, rolls); i++) {
    let x = rng.int(total);
    let idx = 0;
    while (idx < rs.length - 1 && x >= rs[idx]!.weight) x -= rs[idx++]!.weight;
    best = Math.max(best, idx);
  }
  return LOOT_RARITIES[best]!;
}

const grantCache = new WeakMap<ContentBundle, Map<string, string>>();

/** Abilities gear can grant → the career they come from (every regular career's moves and passive; no bosses). */
export function grantableAbilities(bundle: ContentBundle): Map<string, string> {
  let m = grantCache.get(bundle);
  if (!m) {
    m = new Map();
    for (const c of bundle.careers) {
      if (c.boss || c.deprecated) continue;
      for (const a of [c.active, ...(c.extraActives ?? []), ...(c.senior ? [c.senior] : []), c.passive]) if (!m.has(a)) m.set(a, c.id);
    }
    grantCache.set(bundle, m);
  }
  return m;
}

export function rollLoot(bundle: ContentBundle, rng: Rng, uid: string, rolls = 1): LootItem {
  const L = bundle.economy.loot;
  const rarity = rollRarity(bundle, rng, rolls);
  const def = rarityDef(bundle, rarity);
  const base = rng.pick(bundle.loot);
  // Pick which stats, mostly the ones this kind of item favours, then share the points out.
  const count = 1 + rng.int(Math.min(L.maxStatsPerItem, def.points));
  const keys: StatKey[] = [];
  for (let guard = 0; keys.length < count && guard < 20; guard++) {
    const k = rng.chance(L.favouredBp) ? rng.pick(base.favours) : rng.pick(STAT_KEYS);
    if (!keys.includes(k)) keys.push(k);
  }
  const stats: Partial<Stats> = {};
  for (const k of keys) stats[k] = 1;
  for (let left = def.points - keys.length; left > 0; left--) {
    const k = rng.pick(keys);
    stats[k] = stats[k]! + 1;
  }
  const item: LootItem = { uid, base: base.id, rarity, stats };
  if (rng.chance(def.abilityBp)) item.ability = rng.pick([...grantableAbilities(bundle).keys()].sort());
  return item;
}

/** Does this item follow the rules? (Known base and rarity, exactly the rarity's points, a grantable ability.) */
export function isValidLoot(bundle: ContentBundle, x: unknown): x is LootItem {
  if (!x || typeof x !== 'object') return false;
  const it = x as Partial<LootItem>;
  if (typeof it.uid !== 'string' || !it.uid || it.uid.length > 64) return false;
  if (!bundle.loot.some((b) => b.id === it.base)) return false;
  if (!(LOOT_RARITIES as readonly unknown[]).includes(it.rarity)) return false;
  const def = rarityDef(bundle, it.rarity!);
  const entries = Object.entries(it.stats ?? {});
  if (!entries.length || entries.length > bundle.economy.loot.maxStatsPerItem) return false;
  let sum = 0;
  for (const [k, v] of entries) {
    if (!(STAT_KEYS as readonly string[]).includes(k) || !Number.isInteger(v) || (v as number) < 1) return false;
    sum += v as number;
  }
  if (sum !== def.points) return false;
  if (it.ability !== undefined && (def.abilityBp === 0 || !grantableAbilities(bundle).has(it.ability))) return false;
  return true;
}

export function lootSellPrice(bundle: ContentBundle, it: LootItem): number {
  return rarityDef(bundle, it.rarity).sellPrice;
}

/** Total stat bonus of the items a fighter wears. */
export function gearStats(gear: readonly LootItem[] | undefined): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const it of gear ?? []) for (const [k, v] of Object.entries(it.stats) as [StatKey, number][]) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** Gear for a ladder opponent: one more item from each threshold stage in economy.loot. */
export function opponentGear(bundle: ContentBundle, rng: Rng, stage: number, idPrefix: string, boss: boolean): LootItem[] {
  const L = bundle.economy.loot;
  const n = Math.min(L.slots, L.opponentGearFromStage.filter((s) => stage >= s).length);
  return Array.from({ length: n }, (_, i) => rollLoot(bundle, rng, `${idPrefix}-g${i}`, 1 + (boss ? L.bossExtraRolls : 0)));
}
