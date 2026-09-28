import type { ContentBundle, Stats } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema';
import { Rng } from '../src/core/rng';
import type { BattleInput, BattleMode, CharacterSnapshot, TeamSnapshot } from '../src/types';
import { SIM_VERSION } from '../src/types';

export function baseStats(v = 5): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, v])) as Stats;
}

export function char(id: string, careers: string[], personality: string, extra: Partial<CharacterSnapshot> = {}): CharacterSnapshot {
  return {
    id,
    name: id,
    level: 1,
    careers,
    masteries: [],
    personality,
    traits: [],
    stats: baseStats(),
    held: null,
    accessory: null,
    appearance: { skin: '#e0ac69', hair: '#3b2a1a', hairStyle: 0 },
    ...extra,
  };
}

export function randomTeam(bundle: ContentBundle, rng: Rng, size: number, prefix: string, tier = 1): TeamSnapshot {
  const careers = bundle.careers.filter((c) => c.tier <= tier);
  const pers = bundle.personalities;
  const characters: CharacterSnapshot[] = [];
  for (let i = 0; i < size; i++) {
    const c = rng.pick(careers);
    characters.push(char(`${prefix}${i}`, [c.id], rng.pick(pers).id, { held: c.art.heldItem ?? null }));
  }
  return { playerId: prefix, playerName: prefix, rating: 1000, characters };
}

export function battleInput(bundle: ContentBundle, seed: string, teams: TeamSnapshot[], arenaId = 'arena.supermarket', mode: BattleMode = 'duel_3v3'): BattleInput {
  return { schemaVersion: 1, contentHash: bundle.hash, simVersion: SIM_VERSION, seed, arenaId, mode, teams, modifiers: [] };
}
