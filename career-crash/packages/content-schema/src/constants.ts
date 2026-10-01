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

/** Kick-off statuses an HR note may give (06 §3.3): the good ones, then the bad ones. */
export const HR_GOOD_STATUSES = ['status.inspired', 'status.pumped', 'status.caffeinated', 'status.buzzed', 'status.regen', 'status.armoured', 'status.numb'] as const;
export const HR_BAD_STATUSES = ['status.embarrassed', 'status.distracted', 'status.slowed', 'status.jinxed', 'status.cold', 'status.sticky'] as const;
/** HR note conditions that a teammate sets off (they make the fighter scowl, 06 §4). */
export const HR_ALLY_KEYS = ['ally', 'allyTag', 'allyPersonality', 'temp'] as const;
