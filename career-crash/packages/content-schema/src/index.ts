/**
 * Content schemas for Career Crash (docs/career-crash/01 §5).
 *
 * The simulation only understands the concepts declared here: tags, stats,
 * statuses, abilities, effects, props, interaction rules. It never knows what
 * a "Chef" is — that lives entirely in packages/content JSON.
 */
import { z } from 'zod';

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

export const GOALS = ['damage', 'control', 'support', 'survive', 'loot', 'chaos', 'showOff'] as const;
export type Goal = (typeof GOALS)[number];

export const QUIRKS = ['hideBehindProps', 'bodyguard', 'grudge', 'tauntAfterKo', 'hoarder', 'friendlyFireCareless', 'clumsyHands'] as const;
export type Quirk = (typeof QUIRKS)[number];

export const DAMAGE_TYPES = ['blunt', 'sharp', 'fire', 'electric', 'social'] as const;

const int = z.number().int();
const bp = z.number().int().min(0).max(100_000);
const ref = (prefix: string) => z.string().regex(new RegExp(`^${prefix}\\.[a-z0-9-]+$`), `expected id "${prefix}.<kebab-case>"`);
const tag = z.string().regex(/^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/, 'tags are "family:name" or "name", lowercase kebab-case');
const point = z.tuple([int, int]);
const rect = z.tuple([int, int, int, int]);

export const statModsSchema = z.partialRecord(z.enum(STAT_KEYS), int);
export type StatMods = z.infer<typeof statModsSchema>;

export const goalWeightsSchema = z.partialRecord(z.enum(GOALS), bp);
export type GoalWeights = z.infer<typeof goalWeightsSchema>;

export const tagMatchSchema = z.object({
  kind: z.enum(['char', 'prop', 'npc', 'any']).optional(),
  hasAll: z.array(tag).optional(),
  hasAny: z.array(tag).optional(),
  hasNone: z.array(tag).optional(),
});
export type TagMatch = z.infer<typeof tagMatchSchema>;

// ---------------------------------------------------------------------------
// Effects: a closed set implemented in packages/sim/src/systems/effects.ts
// ---------------------------------------------------------------------------
const effectBase = {
  chanceBp: bp.optional(),
  /** Apply to the caster instead of the affected entity. */
  toSelf: z.boolean().optional(),
};

export const effectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('damage'), amount: int.min(0), damageType: z.enum(DAMAGE_TYPES), ...effectBase }),
  z.object({ type: z.literal('heal'), amount: int.min(0), ...effectBase }),
  z.object({ type: z.literal('applyStatus'), status: ref('status'), durationTicks: int.min(1).optional(), ...effectBase }),
  z.object({ type: z.literal('removeStatus'), status: ref('status'), ...effectBase }),
  z.object({ type: z.literal('knockback'), forceMm: int.min(0), ...effectBase }),
  z.object({ type: z.literal('knockdown'), ...effectBase }),
  z.object({ type: z.literal('spawnProp'), prop: ref('prop'), at: z.enum(['self', 'target']), ...effectBase }),
  z.object({ type: z.literal('morale'), amount: int, ...effectBase }),
  z.object({ type: z.literal('energy'), amount: int, ...effectBase }),
  z.object({ type: z.literal('taunt'), ticks: int.min(1), ...effectBase }),
  z.object({ type: z.literal('dash'), distanceMm: int.min(0), ...effectBase }),
  z.object({ type: z.literal('pull'), forceMm: int.min(0), ...effectBase }),
  /** Grab and throw a character (02 §5.6): away from the thrower, over the shoulder (behind), or straight up and down (slam). */
  z.object({
    type: z.literal('toss'),
    distanceMm: int.min(0),
    heightMm: int.min(100),
    direction: z.enum(['away', 'behind', 'up']),
    landDamage: int.min(0),
    ...effectBase,
  }),
  z.object({ type: z.literal('breakProp'), ...effectBase }),
  z.object({ type: z.literal('dropHeld'), ...effectBase }),
]);
export type Effect = z.infer<typeof effectSchema>;
export type EffectType = Effect['type'];

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export const tagsFileSchema = z.object({ tags: z.array(tag) });

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------
export const statusSchema = z.object({
  id: ref('status'),
  tags: z.array(tag),
  durationTicks: int.min(1),
  stacking: z.enum(['refresh', 'ignore', 'extend']),
  /** Status cannot be applied while the entity has any of these tags. */
  blockedBy: z.array(tag).optional(),
  mods: z
    .object({
      moveBp: int.optional(),
      damageDealtBp: int.optional(),
      damageTakenBp: int.optional(),
      interactionBp: int.optional(),
    })
    .optional(),
  flags: z
    .object({
      noActions: z.boolean().optional(),
      down: z.boolean().optional(),
      slipping: z.boolean().optional(),
      noMove: z.boolean().optional(),
    })
    .optional(),
  periodic: z.object({ everyTicks: int.min(1), effects: z.array(effectSchema) }).optional(),
  onApply: z.array(effectSchema).optional(),
  onExpire: z.array(effectSchema).optional(),
  /** AI treats having this status as danger (raises "survive"). */
  aiThreat: z.boolean().optional(),
});
export type StatusDef = z.infer<typeof statusSchema>;

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------
export const targetingSchema = z.object({
  type: z.enum(['self', 'enemy', 'ally', 'cone', 'circleSelf', 'circleTarget']),
  rangeMm: int.min(0),
  radiusMm: int.min(0).optional(),
  /** Cone half-angle as cosine in basis points (10000 = 0°, 7071 = 45°). */
  coneCosBp: int.min(-10000).max(10000).optional(),
  affects: z.enum(['enemies', 'allies', 'all', 'allExceptSelf', 'target']).optional(),
});

export const aiHintsSchema = z.object({
  goal: z.enum(GOALS),
  /** Who the AI picks as the aim point. */
  aimAt: z.enum(['enemy', 'ally', 'self', 'woundedAlly']).optional(),
  preferTargetsWithTags: z.array(tag).optional(),
  requireTargetTags: z.array(tag).optional(),
  minTargets: int.min(1).optional(),
  /** Only consider when own HP% is at or below this (bp). */
  selfHpBelowBp: bp.optional(),
});

export const abilitySchema = z.object({
  id: ref('ability'),
  kind: z.enum(['active', 'passive']),
  cost: z.object({ energy: int.min(0) }).optional(),
  cooldownTicks: int.min(0).optional(),
  castTicks: int.min(0).optional(),
  targeting: targetingSchema.optional(),
  aiHints: aiHintsSchema.optional(),
  effects: z.array(effectSchema).optional(),
  passive: z
    .object({
      tags: z.array(tag).optional(),
      statMods: statModsSchema.optional(),
      immuneTo: z.array(ref('status')).optional(),
      startEffects: z.array(effectSchema).optional(),
    })
    .optional(),
  commentaryTag: z.string().optional(),
});
export type AbilityDef = z.infer<typeof abilitySchema>;

// ---------------------------------------------------------------------------
// Careers & masteries
// ---------------------------------------------------------------------------
/** Defensive reflexes (bp chances / bonuses): parry a melee blow, evade it, or dash to close distance. */
export const defenseSchema = z.object({ parryBp: int.optional(), evadeBp: int.optional(), dashBp: int.optional() });
export type DefenseDef = z.infer<typeof defenseSchema>;

export const careerSchema = z.object({
  id: ref('career'),
  tier: int.min(1).max(3),
  tags: z.array(tag),
  statMods: statModsSchema,
  passive: ref('ability'),
  active: ref('ability'),
  interactionRules: z.array(ref('rule')).optional(),
  /** Additional signature actives beyond the main one. */
  extraActives: z.array(ref('ability')).optional(),
  defense: defenseSchema.optional(),
  prerequisites: z.object({ anyOf: z.array(z.array(ref('career'))) }).nullable().optional(),
  unlock: z.object({ type: z.enum(['default', 'rep', 'achievement']), cost: int.optional(), achievement: z.string().optional() }),
  art: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/), hat: z.string().regex(/^#[0-9a-f]{6}$/).optional(), heldItem: ref('equipment').optional(), icon: z.string().max(8).optional() }),
  deprecated: z.boolean().optional(),
});
export type CareerDef = z.infer<typeof careerSchema>;

export const masterySchema = z.object({
  id: ref('mastery'),
  requires: z.object({ careers: z.array(ref('career')).min(2), ordered: z.boolean() }),
  passive: ref('ability'),
  grantsAbilities: z.array(ref('ability')),
  cosmetics: z.object({ badge: z.string(), frame: z.string(), victory: z.string() }),
  hidden: z.boolean(),
});
export type MasteryDef = z.infer<typeof masterySchema>;

// ---------------------------------------------------------------------------
// Props (component based, 01 §5.3 / 02 §7.1)
// ---------------------------------------------------------------------------
export const propSchema = z.object({
  id: ref('prop'),
  tags: z.array(tag),
  radiusMm: int.min(50),
  weightG: int.min(0),
  hp: int.min(1).optional(),
  /** Blocks movement (characters collide with it). */
  solid: z.boolean().optional(),
  /** Never moves (shelves, vending machines). */
  anchored: z.boolean().optional(),
  carry: z.boolean().optional(),
  throwDamage: int.min(0).optional(),
  push: z.boolean().optional(),
  ride: z.object({ speedBonusBp: int, durationTicks: int.min(1) }).optional(),
  use: z.object({ effects: z.array(effectSchema), consumed: z.boolean(), spawn: ref('prop').optional(), uses: int.min(1).optional() }).optional(),
  onBreak: z.object({ spawn: z.array(ref('prop')).optional(), effects: z.array(effectSchema).optional(), radiusMm: int.optional() }).optional(),
  explode: z
    .object({ radiusMm: int.min(0), fuseTicks: int.min(0), forceMm: int.min(0), triggerTags: z.array(tag), onDamage: z.boolean().optional(), effects: z.array(effectSchema) })
    .optional(),
  leak: z.object({ spill: ref('prop'), everyTicks: int.min(1), max: int.min(1) }).optional(),
  /** Flat area (spill, fire patch). Does not collide; overlaps generate contacts. */
  area: z.object({ growMmPerTick: int.min(0), maxRadiusMm: int.min(0), lifetimeTicks: int.min(0) }).optional(),
  /** Machine behaviour when used as an arena mover. */
  mover: z
    .object({ hitEffects: z.array(effectSchema), trail: ref('prop').optional(), trailEveryTicks: int.min(1).optional(), eatsUpToG: int.min(0).optional() })
    .optional(),
  art: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/), shape: z.enum(['circle', 'square', 'area']) }),
  deprecated: z.boolean().optional(),
});
export type PropDef = z.infer<typeof propSchema>;

// ---------------------------------------------------------------------------
// Interaction rules (02 §7.3)
// ---------------------------------------------------------------------------
export const RULE_EVENTS = ['contact', 'touching', 'hit', 'statusApplied', 'propBroken', 'ko'] as const;
export type RuleEvent = (typeof RULE_EVENTS)[number];

export const ruleSchema = z.object({
  id: ref('rule'),
  when: z.object({ event: z.enum(RULE_EVENTS), a: tagMatchSchema, b: tagMatchSchema.optional(), chanceBp: bp.optional(), status: ref('status').optional() }),
  then: z.array(z.object({ target: z.enum(['a', 'b']), effect: effectSchema })).min(1),
  priority: int,
  commentaryTag: z.string().optional(),
});
export type RuleDef = z.infer<typeof ruleSchema>;

// ---------------------------------------------------------------------------
// Arenas
// ---------------------------------------------------------------------------
const hazardActionSchema = z.object({
  spawn: z.object({ prop: ref('prop'), count: int.min(1), dropFromMm: int.min(0).optional() }).optional(),
  effects: z.array(effectSchema).optional(),
});

export const arenaSchema = z.object({
  id: ref('arena'),
  sizeMm: point,
  navCellMm: int.min(100),
  walls: z.array(rect),
  spawns: z.object({ a: z.array(point).min(5), b: z.array(point).min(5), ffa: z.array(point).min(6) }),
  refereeSpawn: point,
  props: z.array(z.object({ prop: ref('prop'), at: point })),
  hazards: z.array(
    z.object({ id: z.string(), startTick: int.min(0), everyTicks: int.min(1), telegraphTicks: int.min(0), region: rect, action: hazardActionSchema }),
  ),
  suddenDeath: z.object({ everyTicks: int.min(1), region: rect, action: hazardActionSchema }),
  /** Named fight locations; duelling pairs are spread across them (02 §6.7). */
  stations: z.array(z.object({ id: z.string(), name: z.string(), at: point })).min(2),
  /** Scripted machines that patrol a path (floor scrubbers, robot vacuums...). */
  movers: z
    .array(z.object({ id: z.string(), prop: ref('prop'), path: z.array(point).min(2), startTick: int.min(0), telegraphTicks: int.min(0), speedMm: int.min(1), loop: z.boolean() }))
    .optional(),
  /**
   * Art-backed obstacles, laid out per battle from the seed: each rolls chanceBp,
   * picks one art variant and may shift by up to layoutJitterMm. Belts are
   * walkable conveyors that carry things along (mm/tick) instead of blocking.
   */
  obstacles: z.array(z.object({ at: rect, art: z.array(z.string()).min(1), chanceBp: bp.optional(), belt: point.optional() })).optional(),
  layoutJitterMm: int.min(0).optional(),
  theme: z.object({ floor: z.string(), wall: z.string(), accent: z.string() }),
  unlock: z.object({ league: z.string() }),
});
export type ArenaDef = z.infer<typeof arenaSchema>;

// ---------------------------------------------------------------------------
// Personalities, traits, equipment
// ---------------------------------------------------------------------------
export const personalitySchema = z.object({
  id: ref('personality'),
  goalWeights: goalWeightsSchema,
  moraleFloorBonus: int,
  allyKoMoraleLoss: int.min(0),
  targetPreference: z.enum(['nearest', 'weakest', 'strongest', 'mostKos']),
  quirks: z.array(z.enum(QUIRKS)),
  tripChanceBp: bp,
  throwSpreadBp: bp,
  moveCostBp: bp,
  /** Personality move every character with this personality can use. */
  ability: ref('ability').optional(),
  defense: defenseSchema.optional(),
});
export type PersonalityDef = z.infer<typeof personalitySchema>;

export const traitSchema = z.object({
  id: ref('trait'),
  earn: z.object({ counter: z.string(), atLeast: int.min(1) }),
  goalWeights: goalWeightsSchema.optional(),
  statMods: statModsSchema.optional(),
  preferTargetsWithTags: z.array(tag).optional(),
  tags: z.array(tag).optional(),
  exclusive: z.array(ref('trait')).optional(),
});
export type TraitDef = z.infer<typeof traitSchema>;

export const attackSchema = z.object({
  base: int.min(0),
  rangeMm: int.min(0),
  windupTicks: int.min(0),
  recoverTicks: int.min(0),
  knockbackMm: int.min(0),
  damageType: z.enum(DAMAGE_TYPES),
  effects: z.array(effectSchema).optional(),
});
export type AttackDef = z.infer<typeof attackSchema>;

export const equipmentSchema = z.object({
  id: ref('equipment'),
  slot: z.enum(['held', 'accessory']),
  rarity: z.enum(['common', 'rare', 'epic']),
  tags: z.array(tag),
  attack: attackSchema.optional(),
  statMods: statModsSchema.optional(),
  immuneTo: z.array(ref('status')).optional(),
  price: int.min(0),
});
export type EquipmentDef = z.infer<typeof equipmentSchema>;

// ---------------------------------------------------------------------------
// Commentary (02 §11)
// ---------------------------------------------------------------------------
export const DETECTOR_KINDS = [
  'ironicKo',
  'refereeDown',
  'friendlyFireKo',
  'rivalDefeated',
  'clutch',
  'careerCleanup',
  'chainReaction',
  'upset',
  'firstBlood',
  'propKo',
  'massStatus',
  'cowardSurvivor',
  'flawless',
  'longBattle',
  'panic',
  'card',
  'explosion',
  'rideHit',
  'healedEnemy',
  'machineHit',
  'rakeHit',
] as const;
export type DetectorKind = (typeof DETECTOR_KINDS)[number];

export const detectorSchema = z.object({
  id: ref('detector'),
  kind: z.enum(DETECTOR_KINDS),
  score: int.min(0).max(100),
  templates: z.array(z.string()).min(1),
  params: z.record(z.string(), int).optional(),
});
export type DetectorDef = z.infer<typeof detectorSchema>;

// ---------------------------------------------------------------------------
// Economy (03)
// ---------------------------------------------------------------------------
export const economySchema = z.object({
  xp: z.object({ win: int, draw: int, loss: int, perKo: int, mvp: int, defenceMultiplierBp: bp, levelCap: int, curve: z.object({ a: int, b: int, c: int }) }),
  careerSlotLevels: z.array(int).length(5),
  milestoneOffers: int,
  rerollCostPerMilestone: int,
  statPointsPerLevel: int,
  maxPointsPerStat: int,
  retrainCostPerCareer: int,
  retirePayoutPerLevelSq: int,
  tickets: z.object({ regenMinutes: int, cap: int, dailyBonus: int }),
  rewards: z.record(z.string(), z.object({ cash: int, rep: int })),
  overtime: z.object({ wins: int, multiplierBp: bp }),
  offline: z.object({ cashPerTierPerHour: int, capHours: int }),
  rating: z.object({ start: int, kLow: int, kMid: int, kHigh: int, lowBelow: int, highAbove: int, defenceLossFactorBp: bp }),
  leagues: z.array(z.object({ id: z.string(), minRating: int })),
  recruit: z.object({ costs: z.record(z.string(), int), applicants: int, baseStat: int, variance: int, variedStats: int }),
  rosterSlots: z.object({ start: int, max: int, costBase: int }),
  jobBoard: z.object({ size: int, tierCost: z.record(z.string(), int) }),
  startingWallet: z.record(z.string(), int),
  maxTraits: int,
  maxMasteries: int,
});
export type EconomyDef = z.infer<typeof economySchema>;

export const localeSchema = z.record(z.string(), z.string());

// ---------------------------------------------------------------------------
// Compiled bundle
// ---------------------------------------------------------------------------
export interface ContentBundle {
  version: 1;
  hash: string;
  tags: string[];
  statuses: StatusDef[];
  abilities: AbilityDef[];
  careers: CareerDef[];
  masteries: MasteryDef[];
  props: PropDef[];
  rules: RuleDef[];
  arenas: ArenaDef[];
  personalities: PersonalityDef[];
  traits: TraitDef[];
  equipment: EquipmentDef[];
  detectors: DetectorDef[];
  economy: EconomyDef;
  locale: Record<string, string>;
  names: { first: string[]; last: string[] };
  /** Live commentary templates by event kind (02 §11). */
  live: Record<string, string[]>;
  synergies: SynergyDef[];
}

export const liveSchema = z.object({ templates: z.record(z.string(), z.array(z.string()).min(1)) });

/** Career-pair banter (and behaviour) triggered when one career hits another. */
export const synergySchema = z.object({
  id: ref('synergy'),
  attacker: ref('career'),
  victim: ref('career'),
  speaker: z.enum(['attacker', 'victim']),
  lines: z.array(z.string()).min(1),
  chanceBp: bp,
  /** Applied to the speaker; source is the other character (so a taunt makes the speaker charge them). */
  effects: z.array(effectSchema).optional(),
});
export type SynergyDef = z.infer<typeof synergySchema>;

export const namesSchema = z.object({ first: z.array(z.string()).min(10), last: z.array(z.string()).min(10) });

/** Maps content folder → schema. Order matters only for error messages. */
export const COLLECTIONS = {
  statuses: statusSchema,
  abilities: abilitySchema,
  careers: careerSchema,
  masteries: masterySchema,
  props: propSchema,
  rules: ruleSchema,
  arenas: arenaSchema,
  personalities: personalitySchema,
  traits: traitSchema,
  equipment: equipmentSchema,
  detectors: detectorSchema,
  synergies: synergySchema,
} as const;
export type CollectionName = keyof typeof COLLECTIONS;

/** Content id helper for display. `career.taxi-driver` → `taxi-driver`. */
export function shortId(id: string): string {
  const i = id.indexOf('.');
  return i < 0 ? id : id.slice(i + 1);
}

export { z };
