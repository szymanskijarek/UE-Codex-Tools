import type { ArenaDef, AttackDef, Goal, GoalWeights, Quirk, Stats } from '@cc/content-schema';
import type { ContentIndex } from './content';
import type { Rng } from './core/rng';
import type { NavGrid } from './systems/nav';

export const SIM_VERSION = '0.10.0';
export const TICKS_PER_SECOND = 20;
export const MAX_TICKS = 2400;
export const ENTITY_CAP = 256;

// ---------------------------------------------------------------------------
// Input (01 §4.4)
// ---------------------------------------------------------------------------
export type BattleMode = 'duel_3v3' | 'duel_5v5' | 'ffa';

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: number;
}

export interface CharacterSnapshot {
  id: string;
  name: string;
  level: number;
  careers: string[];
  masteries: string[];
  personality: string;
  traits: string[];
  /** Base stats including level-up points; career/equipment mods are applied by the sim. */
  stats: Stats;
  held?: string | null;
  accessory?: string | null;
  appearance: Appearance;
  rivals?: string[];
  friends?: string[];
  /**
   * Career abilities this character has unlocked in their skill trees. Absent =
   * everything (Sandbox, legacy snapshots); present = only these career
   * actives/passives (masteries and the personality move are unaffected).
   */
  unlocked?: string[];
  /**
   * Abilities granted by gear (career-mode loot), from any career: actives are
   * added to the move list, passives apply their tags, immunities and stat mods.
   */
  granted?: string[];
  /** Reflex perks from skill trees, added on top of stats/career/personality. */
  defenseBonus?: { parryBp?: number; evadeBp?: number; dashBp?: number };
  /** Up to 3 shop items taken into the fight (gear = stat bonus, consumables fire once). */
  loadout?: string[];
}

export interface TeamSnapshot {
  playerId: string;
  playerName: string;
  rating: number;
  characters: CharacterSnapshot[];
}

export interface BattleInput {
  schemaVersion: 1;
  contentHash: string;
  simVersion: string;
  seed: string;
  arenaId: string;
  mode: BattleMode;
  teams: TeamSnapshot[];
  modifiers: string[];
}

// ---------------------------------------------------------------------------
// Events (02 §11.1)
// ---------------------------------------------------------------------------
export type EventType =
  | 'spawn'
  | 'attack'
  | 'abilityCast'
  | 'hit'
  | 'crit'
  | 'miss'
  | 'heal'
  | 'statusApplied'
  | 'statusExpired'
  | 'pickUp'
  | 'throw'
  | 'push'
  | 'use'
  | 'ride'
  | 'drop'
  | 'propBroken'
  | 'propSpawned'
  | 'explosion'
  | 'downed'
  | 'revived'
  | 'ko'
  | 'panic'
  | 'taunt'
  | 'foul'
  | 'card'
  | 'refereeDown'
  | 'ruleFired'
  | 'hazardWarn'
  | 'hazardStart'
  | 'suddenDeath'
  | 'grab'
  | 'landed'
  | 'banter'
  | 'parry'
  | 'evade'
  | 'dash'
  | 'wallHit'
  | 'wallBroken'
  | 'rivalry'
  | 'revenge'
  | 'consume'
  | 'disarm'
  | 'choke'
  | 'battleEnd';

export interface BattleEvent {
  /** Index in the event log. */
  i: number;
  t: number;
  type: EventType;
  /** Actor entity id, -1 if none. */
  a: number;
  /** Target entity id, -1 if none. */
  b: number;
  /** Numeric payload (damage, heal, ...). */
  v: number;
  /** String payload (content id). */
  s: string;
  /** Index of the causing event, -1 if none. */
  cause: number;
}

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------
export interface ActiveStatus {
  id: string;
  remaining: number;
  sourceId: number;
  cause: number;
  age: number;
}

export type ActionKind = 'attack' | 'ability' | 'pickUp' | 'throw' | 'push' | 'use' | 'revive' | 'retreat' | 'reposition' | 'taunt' | 'wander';

export interface Action {
  kind: ActionKind;
  targetId: number;
  tx: number;
  ty: number;
  abilityId: string;
  phase: 'approach' | 'windup' | 'recover';
  timer: number;
  goal: Goal;
  expires: number;
}

export interface CharCounters {
  kos: number;
  downs: number;
  damageDealt: number;
  damageTaken: number;
  healing: number;
  revives: number;
  thrown: Record<string, number>;
  used: Record<string, number>;
  statusCaused: Record<string, number>;
  statusReceived: Record<string, number>;
  abilitiesUsed: number;
  refereeHits: number;
  friendlyHits: number;
  fouls: number;
  cards: number;
  drops: number;
  knockdowns: number;
}

export interface Entity {
  id: number;
  kind: 'char' | 'prop' | 'npc';
  def: string;
  team: number;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Intended self-propelled movement this tick (characters). */
  mx: number;
  my: number;
  /** Facing direction (1000-scaled unit vector); rendering + cones. */
  fx: number;
  fy: number;
  radius: number;
  weightG: number;
  hp: number;
  maxHp: number;
  removed: boolean;
  statuses: ActiveStatus[];
  baseTags: string[];
  tags: Set<string>;
  tagsDirty: boolean;
  /** Bitmasks (32 rules per word) of contact rules whose side A / side B this entity satisfies. */
  maskA: number[];
  maskB: number[];
  lastHitBy: number;
  lastCause: number;
  immune: string[];

  // Characters / NPCs
  snapshotId: string;
  snap: CharacterSnapshot | null;
  stats: Stats | null;
  energy: number;
  maxEnergy: number;
  morale: number;
  moraleFloor: number;
  state: 'active' | 'downed' | 'ko';
  downTimer: number;
  revived: boolean;
  action: Action | null;
  decideAt: number;
  cooldowns: Record<string, number>;
  actives: string[];
  heldId: number;
  attack: AttackDef;
  goalWeights: Required<GoalWeights>;
  targetPref: 'nearest' | 'weakest' | 'strongest' | 'mostKos';
  quirks: Quirk[];
  preferTags: string[];
  tripChanceBp: number;
  throwSpreadBp: number;
  moveCostBp: number;
  allyKoMoraleLoss: number;
  rideId: number;
  rideUntil: number;
  tauntedBy: number;
  tauntUntil: number;
  panicking: boolean;
  path: number[];
  pathGoal: number;
  counters: CharCounters;
  fouls: number;
  /** Assigned fight location (duels are spread across arena stations). */
  stationX: number;
  stationY: number;
  station: number;
  /** Opponent this character is paired with at kick-off; -1 once free. */
  duelTarget: number;

  // Props
  carriedBy: number;
  riddenBy: number;
  flying: boolean;
  thrownBy: number;
  flightCause: number;
  movedBy: number;
  moveCause: number;
  areaRadius: number;
  age: number;
  uses: number;
  fuse: number;
  leaked: number;
  spawnedBy: number;
  /** Mover props: flattened path, next waypoint index, speed (mm/tick), loop flag. */
  moverPath: number[];
  moverIdx: number;
  moverSpeed: number;
  moverLoop: boolean;
  /** Airborne after being thrown: who threw them, landing damage, cause event (-1 when not tossed). */
  tossedBy: number;
  tossLand: number;
  tossCause: number;
  /** Reflexes (bp): chance to parry / evade a melee blow, chance per check to dash. */
  parryBp: number;
  evadeBp: number;
  dashBp: number;
  /** Burst movement (evade or dash): mm per tick until dashUntil. */
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  /** Who put this character on the floor this fight (-1 none): they want payback. */
  grudgeId: number;
  /** Consumables carried into the fight that haven't fired yet. */
  consumables: string[];
  /** Characters: the one-handed weapon in hand (equipment id, '' = none). Dropped weapons: which one it is. */
  weapon: string;
  /** Who this character is choking (-1 none). */
  chokeId: number;
}

export interface World {
  tick: number;
  seed: string;
  input: BattleInput;
  content: ContentIndex;
  arena: ArenaDef;
  mode: BattleMode;
  entities: Entity[];
  byId: Map<number, Entity>;
  nextId: number;
  rng: Rng;
  aiRng: Rng;
  envRng: Rng;
  events: BattleEvent[];
  queue: RuleQueueItem[];
  nav: NavGrid;
  contacts: Set<number>;
  teamCount: number;
  refereeId: number;
  suddenDeathTick: number;
  hazardNext: number[];
  finished: boolean;
  result: BattleResult | null;
  firedThisTick: Set<string>;
  /** Career banter cooldowns: "attackerSnap>victimSnap" → next allowed tick. */
  banter: Map<string, number>;
  /** Obstacle (wall) health and toppled state, parallel to arena.walls. */
  wallHp: number[];
  wallMaxHp: number[];
  wallBroken: boolean[];
  /** Conveyor belts from the layout: rect + carry velocity. */
  belts: { rect: [number, number, number, number]; vx: number; vy: number }[];
  /** Props spawned this tick; capped to stop runaway rule loops. */
  spawnedThisTick: number;
}

export interface RuleQueueItem {
  event: 'contact' | 'touching' | 'hit' | 'statusApplied' | 'propBroken' | 'ko';
  a: number;
  b: number;
  status: string;
  cause: number;
}

export interface CharacterResult {
  entityId: number;
  snapshotId: string;
  team: number;
  name: string;
  state: 'active' | 'downed' | 'ko';
  hp: number;
  maxHp: number;
  counters: CharCounters;
}

export interface BattleResult {
  /** Winning team index, -1 for draw. */
  winner: number;
  reason: 'elimination' | 'timeout';
  ticks: number;
  mvp: number;
  characters: CharacterResult[];
  teamHpBp: number[];
}

export interface BattleOutput {
  events: BattleEvent[];
  result: BattleResult;
  resultHash: string;
  hashes: string[];
}

export type { Stats };
