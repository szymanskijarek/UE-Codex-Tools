/**
 * Content schemas for Career Crash (docs/career-crash/01 §5).
 *
 * The simulation only understands the concepts declared here: tags, stats,
 * statuses, abilities, effects, props, interaction rules. It never knows what
 * a "Chef" is — that lives entirely in packages/content JSON.
 */
import { z } from 'zod';

import { DAMAGE_TYPES, GOALS, LOOT_RARITIES, QUIRKS, STAT_KEYS } from './constants';

export * from './constants';

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
  /** Summon critters next to the caster (05 §3): `count` of `summon`, or of `alt` with `altChanceBp`. */
  z.object({ type: z.literal('summon'), summon: ref('summon'), count: int.min(1).max(5), alt: ref('summon').optional(), altChanceBp: bp.optional(), ...effectBase }),
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
  /** Senior Move (05 §2): unlocked at the top rank of the career's skill tree. */
  senior: ref('ability').optional(),
  defense: defenseSchema.optional(),
  prerequisites: z.object({ anyOf: z.array(z.array(ref('career'))) }).nullable().optional(),
  unlock: z.object({ type: z.enum(['default', 'rep', 'achievement']), cost: int.optional(), achievement: z.string().optional() }),
  art: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/), hat: z.string().regex(/^#[0-9a-f]{6}$/).optional(), heldItem: ref('equipment').optional(), icon: z.string().max(8).optional() }),
  deprecated: z.boolean().optional(),
  /** Career-ladder boss: fought at the end of an arena, never offered, recruited or generated. */
  boss: z.boolean().optional(),
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
  /**
   * Two-handed heavy weapon: only a character with empty hands can pick it up;
   * it swings slowly, sends people flying and breaks after `swings` hits.
   */
  heavy: z.object({ attack: attackSchema, slowBp: int.min(0).max(8000), swings: int.min(1) }).optional(),
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
  /** A gust over the region for `ticks`: everything loose standing in it slides by (vx, vy) mm per tick (fans). */
  wind: z.object({ vx: int, vy: int, ticks: int.min(1) }).optional(),
  /** Flings every fighter in the region outward from its centre (revolving door). */
  spin: z.object({ distanceMm: int.min(0), heightMm: int.min(100), landDamage: int.min(0) }).optional(),
  /** Fighters in the region drop through the floor and turn up at a random free-for-all spawn, stunned (stage trapdoor). */
  trapdoor: z.object({ stunTicks: int.min(1) }).optional(),
});

/** How a hazard looks (client only): a fixture standing at `at` (if any), swapped to `active` art while it runs. */
const hazardArtSchema = z.object({
  sprite: z.string().optional(),
  at: point,
  active: z.string().optional(),
  activeTicks: int.min(1).optional(),
  /** Floor fixtures (trapdoor, vent) lie under everyone; the rest stand like obstacles. */
  floor: z.boolean().optional(),
  /** Effect drawn while it runs: wind streaks, water spray, steam, or dust. */
  fx: z.enum(['wind', 'spray', 'steam', 'dust']).optional(),
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
    z.object({ id: z.string(), startTick: int.min(0), everyTicks: int.min(1), telegraphTicks: int.min(0), region: rect, action: hazardActionSchema, art: hazardArtSchema.optional() }),
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
  obstacles: z
    .array(
      z.object({
        at: rect,
        art: z.array(z.string()).min(1),
        chanceBp: bp.optional(),
        belt: point.optional(),
        /** Filled in by the content compiler from furniture.json: each art's footprint, centred on `at` (belts keep `at`). */
        fp: z.array(z.tuple([int, int])).optional(),
      }),
    )
    .optional(),
  layoutJitterMm: int.min(0).optional(),
  /** Props scattered when an obstacle topples. */
  debris: z.array(ref('prop')).optional(),
  theme: z.object({ floor: z.string(), wall: z.string(), accent: z.string() }),
  unlock: z.object({ league: z.string() }),
  /** The career-ladder boss fought at the end of this arena's stages. */
  boss: z.object({ career: ref('career'), name: z.string() }).optional(),
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
  /** Items dropped by won fights (career mode): rarities, drop odds, prices, opponent gear. */
  loot: z.object({
    /** Loot items each fighter can wear. */
    slots: int.min(1).max(4),
    /** Unequipped items kept in the bag; further drops are sold automatically. */
    bagCap: int.min(1),
    /** A rolled item spreads its points over at most this many stats. */
    maxStatsPerItem: int.min(1),
    /** Chance each stat is one the item's base favours (otherwise any stat). */
    favouredBp: bp,
    /** Weakest first, matching LOOT_RARITIES. weight = drop odds out of the total. */
    rarities: z
      .array(z.object({ id: z.enum(LOOT_RARITIES), points: int.min(1), weight: int.min(0), abilityBp: bp, sellPrice: int.min(0), color: z.string() }))
      .length(LOOT_RARITIES.length),
    /** Extra rolls (best one kept) for beating a boss, and on Brutal. */
    bossExtraRolls: int.min(0),
    brutalExtraRolls: int.min(0),
    /** Ladder opponents wear one more rolled item from each of these stages. */
    opponentGearFromStage: z.array(int.min(0)),
  }),
  /** Staff, squad and Garden Leave (06 §2). */
  hr: z.object({
    /** Hires who fight next to the main character. */
    squadSize: int.min(1).max(4),
    /** Everyone on the payroll, main character included. */
    staffCap: int.min(2),
    /** Share of a fight's base XP for staff on Garden Leave. */
    gardenLeaveXpBp: bp,
  }),
  /** Gatecrashers (07): how often, when, how many and how strong. */
  crashers: z.object({
    /** Chance a fight gets gatecrashed. */
    chanceBp: bp,
    /** Chance the set is one that belongs to the venue, rather than one visiting it. */
    homeBp: bp,
    /** The earliest and latest tick they may burst in (the fight must still be well open, see minActiveBp). */
    earliestTick: int.min(1),
    latestTick: int.min(1),
    /** Each side needs at least this share of its fighters still standing, or they don't come. */
    minActiveBp: bp,
    /** Weights for 1, 2 or 3 of them (the leader, plus 0–2 henchmen). */
    sizeWeights: z.array(int.min(0)).length(3),
    /** Levels relative to the player's main character, and the share of skills they use. */
    leaderLevelOffset: int,
    henchmanLevelOffset: int,
    spendBp: bp,
  }),
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
  /** First and last names for generated characters, plus the titles players can add before and after a name. */
  names: { first: string[]; last: string[]; prefixes: string[]; suffixes: string[] };
  /** Live commentary templates by event kind (02 §11). */
  live: Record<string, string[]>;
  synergies: SynergyDef[];
  shopItems: ShopItemDef[];
  loot: LootBaseDef[];
  summons: SummonDef[];
  /** Personnel-file notes per profession (06). */
  hrNotes: HrNoteDef[];
  /** Gatecrasher sets (07). */
  crashers: CrasherDef[];
  /** Market floors (08). */
  markets: MarketDef[];
  /** Real-world size of every piece of obstacle art (furniture.json), so each object looks the same size everywhere. */
  furniture: Record<string, FurnitureDef>;
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

/**
 * Things you can buy and take into a fight (up to 3 per fighter, 03 §3.6).
 * Consumables fire once, at kick-off or when HP drops below a threshold;
 * gear gives small permanent stat bonuses.
 */
export const shopItemSchema = z.object({
  id: ref('item'),
  kind: z.enum(['consumable', 'gear']),
  price: int.min(0),
  icon: z.string().max(8),
  /** Shop tier: 1 from the start, 2 from stage 5, 3 from stage 12 (AI loadouts follow the same). */
  tier: int.min(1).max(3),
  trigger: z.object({ when: z.enum(['start', 'hpBelow']), hpBp: bp.optional() }).optional(),
  effects: z.array(effectSchema).optional(),
  statMods: statModsSchema.optional(),
  /** Sprite name in the client's item atlas, if any. */
  art: z.string().optional(),
});
export type ShopItemDef = z.infer<typeof shopItemSchema>;

/** Kinds of loot item. Each drop is a base plus rolled rarity, stat points and maybe an ability. */
export const lootBaseSchema = z.object({
  id: ref('loot'),
  icon: z.string().max(8),
  /** Stats this kind of item tends to boost. */
  favours: z.array(z.enum(STAT_KEYS)).min(1).max(4),
});
export type LootBaseDef = z.infer<typeof lootBaseSchema>;

/**
 * Summoned critters (05 §3–4): weak, short-lived fighters on the summoner's
 * team that distract rather than damage. Never downed, never counted in
 * results; they bolt when beaten, when their time is up or when their summoner is KO'd.
 */
export const summonSchema = z.object({
  id: ref('summon'),
  kind: z.enum(['animal', 'human']),
  behaviour: z.enum(['scatter', 'pester', 'decoy', 'aura', 'entourage']),
  hp: int.min(1).max(80),
  /** Walking speed relative to an average fighter (bp). */
  speedBp: int.min(3000).max(20000),
  lifetimeTicks: int.min(20).max(600),
  radiusMm: int.min(100).max(450),
  /** On an enemy it touches (scatter/pester), at most once per `everyTicks` per critter. */
  touch: z.object({ everyTicks: int.min(1), effects: z.array(effectSchema) }).optional(),
  /** Every `everyTicks`, on everyone of `affects` within `radiusMm`. */
  aura: z.array(z.object({ radiusMm: int.min(100), everyTicks: int.min(1), affects: z.enum(['enemies', 'allies']), effects: z.array(effectSchema) })).optional(),
  /** Hitting it hurts: a melee attacker takes this much damage. */
  thorns: int.min(0).optional(),
  /** When beaten (not when it leaves): effects on enemies within `radiusMm` — a balloon pops. */
  pop: z.object({ radiusMm: int.min(100), effects: z.array(effectSchema) }).optional(),
  /** Fighters carrying this fear tag lose morale near it. */
  scares: tag.optional(),
  tags: z.array(tag),
  /** Animals: sprite name in the critter atlas. Humans: outfit colour and a held item. */
  art: z.object({
    sprite: z.string().optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
    held: ref('equipment').optional(),
    /** Standing height in mm (a fighter is about 1800), so every critter is drawn at its own real-world size. */
    heightMm: int.min(50).max(2200),
  }),
});
export type SummonDef = z.infer<typeof summonSchema>;

/**
 * HR notes (06): each profession's hidden personnel-file entries. When every
 * condition in `when` holds for a career-mode fight, the stats and kick-off
 * status apply to that fighter. Revealed only once the player opens the file.
 */
export const hrNoteSchema = z
  .object({
    id: ref('hr'),
    career: ref('career'),
    tone: z.enum(['buff', 'debuff', 'mixed']),
    when: z
      .object({
        arena: z.array(ref('arena')).min(1).optional(),
        ally: z.array(ref('career')).min(1).optional(),
        allyTag: z.array(tag).min(1).optional(),
        allyPersonality: z.array(ref('personality')).min(1).optional(),
        /** At least one agency temp in the squad. */
        temp: z.literal(true).optional(),
        enemy: z.array(ref('career')).min(1).optional(),
        enemyTag: z.array(tag).min(1).optional(),
        boss: z.literal(true).optional(),
        /** Wearing a loot perk of one of these kinds. */
        gear: z.array(ref('loot')).min(1).optional(),
        /** Packing one of these shop items. */
        consumable: z.array(ref('item')).min(1).optional(),
      })
      .strict()
      .refine((w) => Object.keys(w).length > 0, 'a note needs at least one condition'),
    stats: statModsSchema.optional(),
    /** Applied at kick-off, like a kick-off consumable. */
    status: z.object({ status: ref('status'), durationTicks: int.min(20).max(600) }).optional(),
    /** Face shown while an ally-caused debuff is active (default angry). */
    mood: z.enum(['angry', 'hurt']).optional(),
  })
  .refine((n) => n.stats || n.status, 'a note needs stats or a status');
export type HrNoteDef = z.infer<typeof hrNoteSchema>;
export type HrWhen = HrNoteDef['when'];

const nameWords = z.array(z.string().min(1).max(40)).min(10).refine((l) => new Set(l).size === l.length, 'duplicate entries');
/**
 * One real-world size per piece of obstacle art: `w` is how wide it is drawn
 * (mm; fighters stand about 1900), `fp` its collision footprint [width, depth]
 * when it stands in an arena. Props drawn from obstacle art need only `w`.
 */
export const furnitureSchema = z.record(z.string(), z.object({ w: int.min(200), fp: z.tuple([int.min(200), int.min(200)]).optional() }));
export type FurnitureDef = z.infer<typeof furnitureSchema>[string];

export const namesSchema = z.object({ first: nameWords, last: nameWords, prefixes: nameWords, suffixes: nameWords });

/** Maps content folder → schema. Order matters only for error messages. */
/**
 * Gatecrashers (07): a rare mid-fight interruption by up to three people who
 * belong to the venue (or one like it): the train driver and two ticket
 * inspectors, the hedge-fund owner and a lackey. They fight everyone, with an
 * existing career's moves; the persona gives them a name, a job title, art and
 * lines. Never playable.
 */
const crasherMemberSchema = z.object({
  /** Persona: the job title (`<persona>.name`), and the art (puppet sheet named after it). */
  persona: ref('npc'),
  /** Whose moves they fight with. */
  career: ref('career'),
  personality: ref('personality'),
  /** Catchphrases, shouted as they burst in. */
  lines: z.array(z.string()).min(2),
  art: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/), icon: z.string().max(8) }),
});
export const crasherSchema = z.object({
  id: ref('crasher'),
  /** The venue they belong to, and the others they turn up at. */
  home: ref('arena'),
  visits: z.array(ref('arena')).max(4),
  leader: crasherMemberSchema.extend({ name: z.string() }),
  /** One kind of sidekick; up to two of them come along, with these names. */
  henchmen: crasherMemberSchema.extend({ names: z.array(z.string()).length(2) }),
  /** The commentator as they burst in. */
  entrance: z.array(z.string()).min(1),
  /** The leader's post after the fight ({arena}, {me}, {company}). */
  posts: z.array(z.string()).min(2),
  /** The henchmen in the comments under it. */
  comments: z.array(z.string()).min(2),
});
export type CrasherDef = z.infer<typeof crasherSchema>;


/**
 * Market floors (08): an endless brawl between the top contenders of a live
 * market (the top 10 coins, later countries), each played by a persona. Their
 * strength each hour comes from how they did against the rest of the field.
 */
const marketMemberSchema = z.object({
  /** Persona: the job line (`<persona>.name`) and the art (puppet sheet named after it). */
  persona: ref('npc'),
  /** The fighter's name on the floor. */
  name: z.string(),
  /** Whose moves they fight with until they get their own. */
  career: ref('career'),
  personality: ref('personality'),
  /** Shouted as they walk on at the Opening Bell. */
  lines: z.array(z.string()).min(2),
  art: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/), icon: z.string().max(8) }),
});
export const marketSchema = z.object({
  id: ref('market'),
  arena: ref('arena'),
  /** How many contenders fight at once. */
  field: int.min(2).max(12),
  /** Where contenders stand at the start of a candle and come back in after a knockout (mm). */
  spawns: z.array(z.tuple([int, int])).min(2),
  /** Contenders that never fight (stablecoins, wrapped copies), by symbol. */
  exclude: z.array(z.string()),
  /** Scoring against the field (08 §5.1). All changes in basis points of a percent (100 = 1%). */
  score: z.object({
    /** The field's spread never counts as smaller than this. */
    spreadFloor: int.min(1),
    /** Scores are clamped to ±max, in hundredths (200 = ±2). */
    max: int.min(1),
  }),
  /** Score → power (08 §5.2). */
  power: z.object({
    /** Everyone's level before the score, and how many levels a score of ±max adds or takes. */
    baseLevel: int.min(1),
    levelSwing: int.min(0),
    /** Stat points a score of ±max adds or takes. */
    statSwing: int.min(0),
    /** Career rank they fight at. */
    rank: int.min(1).max(5),
    /** Score at or above which they start each candle pumped, and at or below which embarrassed. */
    pumpAt: int,
    dumpAt: int,
    /** A 1h change at or below this (or the lowest score) makes them over-leveraged (08 §7). */
    leverageAt: int,
    /** How long the pump and dump statuses last from kick-off. */
    moodTicks: int.min(1),
  }),
  /** The endless floor (08 §4). */
  candle: z.object({
    /** One candle of play, and the circuit breaker after it; together they make one candle slot. */
    ticks: int.min(200),
    breakerTicks: int.min(0),
    /** How long a knocked-out contender is delisted, and a liquidated one. */
    relistTicks: int.min(20),
    liquidatedTicks: int.min(20),
    /** Respawn shield. */
    shieldTicks: int.min(0),
  }),
  /** Standings points (08 §5.3). */
  points: z.object({ ko: int, liquidation: int, candle: int, damagePer: int.min(1), koed: int, liquidated: int }),
  /** One persona per symbol, and one for any symbol without one. */
  cast: z.record(z.string(), marketMemberSchema),
  anon: marketMemberSchema,
});
export type MarketDef = z.infer<typeof marketSchema>;

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
  shopItems: shopItemSchema,
  loot: lootBaseSchema,
  summons: summonSchema,
  hrNotes: hrNoteSchema,
  crashers: crasherSchema,
  markets: marketSchema,
} as const;
export type CollectionName = keyof typeof COLLECTIONS;

/** Content id helper for display. `career.taxi-driver` → `taxi-driver`. */
export function shortId(id: string): string {
  const i = id.indexOf('.');
  return i < 0 ? id : id.slice(i + 1);
}

export { z };
