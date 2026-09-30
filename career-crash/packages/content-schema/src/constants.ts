/**
 * Plain content constants, kept apart from the Zod schemas so runtime code
 * (sim, game rules, client) can import them without pulling Zod into the
 * player's bundle. Content is validated at build time, not in the browser.
 */
export const STAT_KEYS = [
  'health',
  'energy',
  'speed',
  'strength',
  'throwing',
  'intelligence',
  'awareness',
  'confidence',
  'luck',
  'charisma',
  'recovery',
  'interactionSpeed',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

/** Loot rarities, weakest first (economy.loot.rarities is in the same order). */
export const LOOT_RARITIES = ['normal', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type LootRarity = (typeof LOOT_RARITIES)[number];

export const GOALS = ['damage', 'control', 'support', 'survive', 'loot', 'chaos', 'showOff'] as const;
export type Goal = (typeof GOALS)[number];

export const QUIRKS = ['hideBehindProps', 'bodyguard', 'grudge', 'tauntAfterKo', 'hoarder', 'friendlyFireCareless', 'clumsyHands'] as const;
export type Quirk = (typeof QUIRKS)[number];

export const DAMAGE_TYPES = ['blunt', 'sharp', 'fire', 'electric', 'social'] as const;
