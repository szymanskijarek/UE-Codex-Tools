import { GOALS, STAT_KEYS, type AttackDef, type ContentBundle, type Goal, type Stats, type TagMatch } from '@cc/content-schema';
import { indexContent, must, type ContentIndex } from './content';
import { clamp, idiv } from './core/math';
import { Rng } from './core/rng';
import { buildNav } from './systems/nav';
import {
  ENTITY_CAP,
  type BattleEvent,
  type BattleInput,
  type CharCounters,
  type CharacterSnapshot,
  type Entity,
  type EventType,
  type World,
} from './types';

export const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const SHOVE: AttackDef = { base: 6, rangeMm: 1100, windupTicks: 6, recoverTicks: 10, knockbackMm: 700, damageType: 'blunt' };
export const CHAR_RADIUS = 350;
export const SUDDEN_DEATH_TICK = 1800;

export function emptyCounters(): CharCounters {
  return {
    kos: 0,
    downs: 0,
    damageDealt: 0,
    damageTaken: 0,
    healing: 0,
    revives: 0,
    thrown: {},
    used: {},
    statusCaused: {},
    statusReceived: {},
    abilitiesUsed: 0,
    refereeHits: 0,
    friendlyHits: 0,
    fouls: 0,
    cards: 0,
    drops: 0,
    knockdowns: 0,
  };
}

function blankEntity(id: number, kind: Entity['kind'], def: string): Entity {
  return {
    id,
    kind,
    def,
    team: -1,
    name: def,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    mx: 0,
    my: 0,
    fx: 1000,
    fy: 0,
    radius: 300,
    weightG: 1000,
    hp: 1,
    maxHp: 1,
    removed: false,
    statuses: [],
    baseTags: [],
    tags: new Set(),
    tagsDirty: true,
    maskA: [],
    maskB: [],
    lastHitBy: -1,
    lastCause: -1,
    immune: [],
    snapshotId: '',
    snap: null,
    stats: null,
    energy: 0,
    maxEnergy: 0,
    morale: 50,
    moraleFloor: 0,
    state: 'active',
    downTimer: 0,
    revived: false,
    action: null,
    decideAt: 0,
    cooldowns: {},
    actives: [],
    heldId: -1,
    attack: SHOVE,
    goalWeights: Object.fromEntries(GOALS.map((g) => [g, 10000])) as Record<Goal, number>,
    targetPref: 'nearest',
    quirks: [],
    preferTags: [],
    tripChanceBp: 0,
    throwSpreadBp: 0,
    moveCostBp: 10000,
    allyKoMoraleLoss: 15,
    rideId: -1,
    rideUntil: 0,
    tauntedBy: -1,
    tauntUntil: 0,
    panicking: false,
    path: [],
    pathGoal: -1,
    counters: emptyCounters(),
    fouls: 0,
    carriedBy: -1,
    riddenBy: -1,
    flying: false,
    thrownBy: -1,
    flightCause: -1,
    movedBy: -1,
    moveCause: -1,
    areaRadius: 0,
    age: 0,
    uses: 0,
    fuse: -1,
    leaked: 0,
    spawnedBy: -1,
  };
}

export function emit(w: World, type: EventType, a: number, b: number, v = 0, s = '', cause = -1): number {
  const i = w.events.length;
  const ev: BattleEvent = { i, t: w.tick, type, a, b, v, s, cause };
  w.events.push(ev);
  return i;
}

export function addEntity(w: World, e: Entity): Entity | null {
  const live = w.entities.length;
  if (live >= ENTITY_CAP) return null;
  w.entities.push(e);
  w.byId.set(e.id, e);
  return e;
}

export function get(w: World, id: number): Entity | undefined {
  if (id < 0) return undefined;
  const e = w.byId.get(id);
  return e && !e.removed ? e : undefined;
}

export function removeEntity(w: World, e: Entity): void {
  e.removed = true;
  if (e.carriedBy >= 0) {
    const c = w.byId.get(e.carriedBy);
    if (c && c.heldId === e.id) c.heldId = -1;
  }
  if (e.riddenBy >= 0) {
    const c = w.byId.get(e.riddenBy);
    if (c && c.rideId === e.id) c.rideId = -1;
  }
}

/** Current tags: base tags + tags granted by statuses. Recomputed lazily. */
export function tagsOf(w: World, e: Entity): Set<string> {
  if (!e.tagsDirty) return e.tags;
  const t = new Set<string>(e.baseTags);
  for (const s of e.statuses) {
    const def = w.content.statuses.get(s.id);
    if (def) for (const tg of def.tags) t.add(tg);
  }
  if (e.kind === 'char' && e.state === 'downed') t.add('state:down');
  if (e.heldId >= 0) {
    const held = w.byId.get(e.heldId);
    if (held) for (const tg of held.baseTags) if (tg.startsWith('element:')) t.add(tg);
  }
  e.tags = t;
  e.tagsDirty = false;
  const rules = w.content.contactRules;
  const words = (rules.length + 31) >> 5;
  const ma = new Array<number>(words).fill(0);
  const mb = new Array<number>(words).fill(0);
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i]!;
    if (tagSetMatches(e, t, r.when.a)) ma[i >> 5] |= 1 << (i & 31);
    if (r.when.b && tagSetMatches(e, t, r.when.b)) mb[i >> 5] |= 1 << (i & 31);
  }
  e.maskA = ma;
  e.maskB = mb;
  return t;
}

/** Tag match against an already computed tag set (no recursion into tagsOf). */
export function tagSetMatches(e: Entity, t: Set<string>, m: TagMatch | undefined): boolean {
  if (!m) return true;
  if (m.kind && m.kind !== 'any' && m.kind !== e.kind) return false;
  if (m.hasAll) for (const x of m.hasAll) if (!t.has(x)) return false;
  if (m.hasAny && m.hasAny.length > 0 && !m.hasAny.some((x) => t.has(x))) return false;
  if (m.hasNone) for (const x of m.hasNone) if (t.has(x)) return false;
  return true;
}

/** Could any contact rule fire with a on side A and b on side B? */
export function maskOverlap(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) if ((a[i]! & b[i]!) !== 0) return true;
  return false;
}

export function hasBit(mask: number[], bit: number): boolean {
  return (mask[bit >> 5]! & (1 << (bit & 31))) !== 0;
}

export function isAlive(e: Entity): boolean {
  return !e.removed && e.state !== 'ko';
}

export function canAct(w: World, e: Entity): boolean {
  if (e.removed || e.state !== 'active') return false;
  for (const s of e.statuses) {
    const f = w.content.statuses.get(s.id)?.flags;
    if (f && (f.noActions || f.down)) return false;
  }
  return true;
}

export function hasFlag(w: World, e: Entity, flag: 'noActions' | 'down' | 'slipping' | 'noMove'): boolean {
  for (const s of e.statuses) {
    const f = w.content.statuses.get(s.id)?.flags;
    if (f && f[flag]) return true;
  }
  return false;
}

export function statusMod(w: World, e: Entity, mod: 'moveBp' | 'damageDealtBp' | 'damageTakenBp' | 'interactionBp'): number {
  let total = 0;
  for (const s of e.statuses) total += w.content.statuses.get(s.id)?.mods?.[mod] ?? 0;
  return total;
}

// ---------------------------------------------------------------------------
// Derived stats (02 §3.1)
// ---------------------------------------------------------------------------
export function finalStats(content: ContentIndex, snap: CharacterSnapshot): Stats {
  const s: Stats = { ...snap.stats };
  const add = (mods: Partial<Stats> | undefined): void => {
    if (!mods) return;
    for (const k of STAT_KEYS) s[k] += mods[k] ?? 0;
  };
  snap.careers.forEach((cid, i) => {
    const c = must(content.careers, cid, 'career');
    add(c.statMods);
    const p = content.abilities.get(c.passive)?.passive;
    // Origin career's passive is 50% stronger (02 §8.1).
    if (p?.statMods) {
      if (i === 0) {
        for (const k of STAT_KEYS) s[k] += idiv((p.statMods[k] ?? 0) * 3, 2);
      } else add(p.statMods);
    }
  });
  for (const mid of snap.masteries) {
    const m = content.masteries.get(mid);
    if (m) add(content.abilities.get(m.passive)?.passive?.statMods);
  }
  for (const tid of snap.traits) add(content.traits.get(tid)?.statMods);
  for (const eid of [snap.held, snap.accessory]) if (eid) add(content.equipment.get(eid)?.statMods);
  for (const k of STAT_KEYS) s[k] = clamp(s[k], 1, 30);
  return s;
}

export const derived = {
  maxHp: (s: Stats): number => 200 + 22 * s.health,
  maxEnergy: (s: Stats): number => (50 + 5 * s.energy) * 100,
  speed: (s: Stats): number => 150 + 10 * s.speed,
  meleeMulBp: (s: Stats): number => 10000 + 500 * s.strength,
  throwMulBp: (s: Stats): number => 10000 + 500 * s.throwing,
  effectMulBp: (s: Stats): number => 10000 + 200 * s.intelligence,
  perception: (s: Stats): number => 4000 + 400 * s.awareness,
  critBp: (s: Stats): number => 100 * s.luck,
  regen: (s: Stats): number => 20 + 2 * s.recovery,
  interactTicks: (s: Stats): number => Math.max(4, 30 - s.interactionSpeed),
  standUp: (s: Stats): number => Math.max(10, 40 - s.recovery),
  carryG: (s: Stats): number => 10000 * s.strength,
  socialMulBp: (s: Stats): number => 10000 + 400 * s.charisma,
};

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------
export const MAX_SPAWNS_PER_TICK = 12;

export function spawnProp(w: World, propId: string, x: number, y: number, cause = -1, spawnedBy = -1): Entity | null {
  if (w.tick > 0 && w.spawnedThisTick >= MAX_SPAWNS_PER_TICK) return null;
  w.spawnedThisTick++;
  const def = must(w.content.props, propId, 'prop');
  const e = blankEntity(w.nextId++, 'prop', propId);
  e.name = propId;
  e.x = clamp(x, 100, w.arena.sizeMm[0] - 100);
  e.y = clamp(y, 100, w.arena.sizeMm[1] - 100);
  e.radius = def.radiusMm;
  e.weightG = def.weightG;
  e.hp = def.hp ?? 0;
  e.maxHp = def.hp ?? 0;
  e.baseTags = [...def.tags];
  e.areaRadius = def.area ? def.radiusMm : 0;
  e.uses = def.use?.uses ?? 1;
  e.spawnedBy = spawnedBy;
  const added = addEntity(w, e);
  if (added) emit(w, 'propSpawned', spawnedBy, e.id, 0, propId, cause);
  return added;
}

function spawnCharacter(w: World, snap: CharacterSnapshot, team: number, x: number, y: number): Entity {
  const c = w.content;
  const e = blankEntity(w.nextId++, 'char', snap.careers[snap.careers.length - 1] ?? 'char');
  const stats = finalStats(c, snap);
  e.snap = snap;
  e.snapshotId = snap.id;
  e.name = snap.name;
  e.team = team;
  e.x = x;
  e.y = y;
  e.fx = x < w.arena.sizeMm[0] / 2 ? 1000 : -1000;
  e.radius = CHAR_RADIUS;
  e.weightG = 75000;
  e.stats = stats;
  e.maxHp = derived.maxHp(stats);
  e.hp = e.maxHp;
  e.maxEnergy = derived.maxEnergy(stats);
  e.energy = e.maxEnergy;

  const tags = new Set<string>(['char']);
  const immune = new Set<string>();
  const actives: string[] = [];
  const passives: string[] = [];
  for (const cid of snap.careers) {
    const career = must(c.careers, cid, 'career');
    for (const t of career.tags) tags.add(t);
    actives.push(career.active);
    passives.push(career.passive);
  }
  for (const mid of snap.masteries) {
    const m = c.masteries.get(mid);
    if (!m) continue;
    passives.push(m.passive);
    actives.push(...m.grantsAbilities);
  }
  for (const pid of passives) {
    const p = c.abilities.get(pid)?.passive;
    if (!p) continue;
    for (const t of p.tags ?? []) tags.add(t);
    for (const s of p.immuneTo ?? []) immune.add(s);
  }
  const held = snap.held ? c.equipment.get(snap.held) : undefined;
  const acc = snap.accessory ? c.equipment.get(snap.accessory) : undefined;
  for (const eq of [held, acc]) {
    if (!eq) continue;
    for (const t of eq.tags) tags.add(t);
    for (const s of eq.immuneTo ?? []) immune.add(s);
  }
  if (held?.attack) e.attack = held.attack;

  const pers = must(c.personalities, snap.personality, 'personality');
  const gw = { ...e.goalWeights };
  for (const g of GOALS) gw[g] = pers.goalWeights[g] ?? 10000;
  const preferTags: string[] = [];
  for (const tid of snap.traits) {
    const t = c.traits.get(tid);
    if (!t) continue;
    for (const g of GOALS) if (t.goalWeights?.[g] !== undefined) gw[g] = idiv(gw[g] * t.goalWeights[g]!, 10000);
    preferTags.push(...(t.preferTargetsWithTags ?? []));
    for (const tg of t.tags ?? []) tags.add(tg);
  }
  e.goalWeights = gw;
  e.targetPref = pers.targetPreference;
  e.quirks = [...pers.quirks];
  e.tripChanceBp = pers.tripChanceBp;
  e.throwSpreadBp = pers.throwSpreadBp;
  e.moveCostBp = pers.moveCostBp;
  e.allyKoMoraleLoss = pers.allyKoMoraleLoss;
  e.preferTags = preferTags;
  e.baseTags = [...tags].sort(cmpStr);
  e.immune = [...immune].sort(cmpStr);
  e.actives = [...new Set(actives)];
  e.morale = clamp(50 + 2 * stats.confidence, 0, 100);
  e.moraleFloor = clamp(2 * stats.confidence + pers.moraleFloorBonus, 0, 60);
  e.decideAt = team * 2 + (e.id % 5);
  addEntity(w, e);
  return e;
}

function spawnReferee(w: World): void {
  const e = blankEntity(w.nextId++, 'npc', 'npc.referee');
  e.name = 'The Referee';
  e.team = -1;
  [e.x, e.y] = w.arena.refereeSpawn;
  e.radius = CHAR_RADIUS;
  e.weightG = 80000;
  e.maxHp = 90;
  e.hp = 90;
  e.baseTags = ['npc', 'referee'];
  e.stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 5])) as Stats;
  addEntity(w, e);
  w.refereeId = e.id;
}

export function createWorld(input: BattleInput, bundle: ContentBundle): World {
  const content = indexContent(bundle);
  const arena = must(content.arenas, input.arenaId, 'arena');
  const root = Rng.fromSeed(input.seed);
  const w: World = {
    tick: 0,
    seed: input.seed,
    input,
    content,
    arena,
    mode: input.mode,
    entities: [],
    byId: new Map(),
    nextId: 1,
    rng: root.fork('main'),
    aiRng: root.fork('ai'),
    envRng: root.fork('env'),
    events: [],
    queue: [],
    nav: buildNav(arena),
    contacts: new Set(),
    teamCount: input.teams.length,
    refereeId: -1,
    suddenDeathTick: SUDDEN_DEATH_TICK,
    hazardNext: arena.hazards.map((h) => h.startTick),
    finished: false,
    result: null,
    firedThisTick: new Set(),
    spawnedThisTick: 0,
  };
  for (const p of arena.props) spawnProp(w, p.prop, p.at[0], p.at[1]);
  if (input.mode === 'ffa') {
    let k = 0;
    input.teams.forEach((team, ti) => {
      for (const snap of team.characters) {
        const [x, y] = arena.spawns.ffa[k % arena.spawns.ffa.length]!;
        spawnCharacter(w, snap, ti, x, y);
        k++;
      }
    });
  } else {
    input.teams.forEach((team, ti) => {
      const spots = ti === 0 ? arena.spawns.a : arena.spawns.b;
      team.characters.forEach((snap, ci) => {
        const [x, y] = spots[ci % spots.length]!;
        spawnCharacter(w, snap, ti, x, y);
      });
    });
    spawnReferee(w);
  }
  for (const e of w.entities) if (e.kind !== 'prop') emit(w, 'spawn', e.id, -1, e.team, e.def);
  return w;
}
