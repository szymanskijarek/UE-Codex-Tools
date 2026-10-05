import { initWalls } from './systems/destruction';
import { layoutArena } from './layout';
import type { AttackDef, ContentBundle, Goal, Stats, SummonDef, TagMatch } from '@cc/content-schema';
import { GOALS, STAT_KEYS } from '@cc/content-schema/constants';
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
    stationX: 0,
    stationY: 0,
    station: -1,
    duelTarget: -1,
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
    moverPath: [],
    moverIdx: 0,
    moverSpeed: 0,
    moverLoop: false,
    tossedBy: -1,
    tossLand: 0,
    tossCause: -1,
    parryBp: 0,
    evadeBp: 0,
    dashBp: 0,
    dashUntil: 0,
    dashVx: 0,
    dashVy: 0,
    grudgeId: -1,
    consumables: [],
    weapon: '',
    chokeId: -1,
    summonOf: -1,
    summonDef: '',
    koTick: -1,
    relists: 0,
    expires: 0,
    touchAt: 0,
  };
}

/** Summoned critters (05 §3) are characters for movement and hits, but never count as fighters. */
export function isSummon(e: Entity): boolean {
  return e.summonOf >= 0;
}

/** A real fighter: a character that isn't a summoned critter. */
export function isFighter(e: Entity): boolean {
  return e.kind === 'char' && e.summonOf < 0;
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
  // Gear-granted passives count once, and not again if a career already gives them.
  const own = new Set(snap.careers.map((cid) => content.careers.get(cid)?.passive));
  for (const aid of new Set(snap.granted ?? [])) if (!own.has(aid)) add(content.abilities.get(aid)?.passive?.statMods);
  for (const tid of snap.traits) add(content.traits.get(tid)?.statMods);
  for (const eid of [snap.held, snap.accessory]) if (eid) add(content.equipment.get(eid)?.statMods);
  for (const k of STAT_KEYS) s[k] = clamp(s[k], 1, 30);
  return s;
}

export const derived = {
  maxHp: (s: Stats): number => 240 + 26 * s.health,
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

export function spawnCharacter(w: World, snap: CharacterSnapshot, team: number, x: number, y: number): Entity {
  const c = w.content;
  const e = blankEntity(w.nextId++, 'char', snap.careers[snap.careers.length - 1] ?? 'char');
  const stats = finalStats(c, snap);
  // Gear from the shop: small permanent bonuses. Consumables wait for their trigger.
  for (const itemId of (snap.loadout ?? []).slice(0, 3)) {
    const item = c.shopItems.get(itemId);
    if (!item) continue;
    if (item.kind === 'gear') for (const [k, v] of Object.entries(item.statMods ?? {}) as [keyof Stats, number][]) stats[k] = Math.max(1, stats[k] + v);
    else e.consumables.push(itemId);
  }
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
  const allowed = snap.unlocked ? new Set(snap.unlocked) : null;
  for (const cid of snap.careers) {
    const career = must(c.careers, cid, 'career');
    for (const t of career.tags) tags.add(t);
    for (const a of [career.active, ...(career.extraActives ?? []), ...(career.senior ? [career.senior] : [])]) if (!allowed || allowed.has(a)) actives.push(a);
    if (!allowed || allowed.has(career.passive)) passives.push(career.passive);
  }
  for (const aid of snap.granted ?? []) {
    const a = c.abilities.get(aid);
    const list = a?.kind === 'passive' ? passives : actives;
    if (a && !list.includes(aid)) list.push(aid);
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
  e.weapon = held?.attack ? held.id : '';

  const pers = must(c.personalities, snap.personality, 'personality');
  if (pers.ability) actives.push(pers.ability);
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
  // Reflexes: stats set the baseline, career and personality give each character a style.
  const perk = snap.defenseBonus;
  let parry = 250 + (stats.strength + stats.awareness - 10) * 60 + (pers.defense?.parryBp ?? 0) + (perk?.parryBp ?? 0);
  let evade = 350 + (stats.speed + stats.awareness - 10) * 70 + (pers.defense?.evadeBp ?? 0) + (perk?.evadeBp ?? 0);
  let dash = 1500 + (stats.speed - 5) * 250 + (pers.defense?.dashBp ?? 0) + (perk?.dashBp ?? 0);
  for (const cid of snap.careers) {
    const d = c.careers.get(cid)?.defense;
    parry += d?.parryBp ?? 0;
    evade += d?.evadeBp ?? 0;
    dash += d?.dashBp ?? 0;
  }
  e.parryBp = clamp(parry, 0, 3000);
  e.evadeBp = clamp(evade, 0, 3500);
  e.dashBp = clamp(dash, 0, 6000);
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

/**
 * A summoned critter (05 §3): a light character on its summoner's team. It walks,
 * gets hit, slips and flies like anyone else, but has no abilities, items or
 * morale, and never counts as a fighter (see isFighter).
 */
export function spawnSummonEntity(w: World, def: SummonDef, owner: Entity, x: number, y: number): Entity | null {
  const e = blankEntity(w.nextId++, 'char', def.id);
  e.name = w.content.bundle.locale[`${def.id}.name`] ?? def.id;
  e.team = owner.team;
  e.x = x;
  e.y = y;
  e.fx = owner.fx;
  e.fy = owner.fy;
  e.radius = def.radiusMm;
  e.weightG = def.kind === 'animal' ? 6000 : 60000;
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 5])) as Stats;
  // derived.speed = 150 + 10 × speed; an average fighter walks at 200 mm/tick.
  stats.speed = idiv(idiv(200 * def.speedBp, 10000) - 150, 10);
  e.stats = stats;
  e.maxHp = def.hp;
  e.hp = def.hp;
  e.morale = 100;
  e.moraleFloor = 100;
  // Small, quick animals are hard to land a blow on; people and slow animals aren't.
  e.evadeBp = def.kind === 'animal' ? clamp(idiv(def.speedBp * 3, 10) - 500, 1000, 4500) : 1000;
  e.baseTags = [...new Set(['char', 'summon', `summon:${def.kind}`, ...def.tags])].sort(cmpStr);
  e.snapshotId = `${def.id}#${e.id}`;
  e.summonOf = owner.id;
  e.summonDef = def.id;
  e.expires = w.tick + def.lifetimeTicks;
  e.touchAt = w.tick + 10;
  e.decideAt = w.tick + 1;
  return addEntity(w, e);
}

/** One second in, rivals from earlier fights spot each other (02 §8.6). */
export function announceRivalries(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || !e.snap?.rivals?.length) continue;
    for (const o of w.entities) if (o.kind === 'char' && o.team !== e.team && e.snap.rivals.includes(o.snapshotId)) emit(w, 'rivalry', e.id, o.id, 0, '', -1);
  }
}

function spawnReferee(w: World): void {
  const e = blankEntity(w.nextId++, 'npc', 'npc.referee');
  e.name = 'The Referee';
  e.team = -1;
  [e.x, e.y] = w.arena.refereeSpawn;
  e.radius = CHAR_RADIUS;
  e.weightG = 80000;
  e.maxHp = 260;
  e.hp = 260;
  e.baseTags = ['npc', 'referee'];
  e.stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 5])) as Stats;
  addEntity(w, e);
  w.refereeId = e.id;
}

/**
 * Spread the fight across the arena (02 §6.7): pair opponents into duels and
 * send each pair to its own station. Pairs share stations only when there are
 * more pairs than stations.
 */
function assignStations(w: World): void {
  const st = w.arena.stations;
  const chars = w.entities.filter((e) => e.kind === 'char');
  const set = (e: Entity, i: number): void => {
    const s = st[i % st.length]!;
    e.station = i % st.length;
    [e.stationX, e.stationY] = s.at;
  };
  if (w.mode === 'ffa') {
    chars.forEach((e, i) => {
      set(e, i >> 1);
      e.duelTarget = chars[i ^ 1]?.id ?? -1;
    });
    return;
  }
  const a = chars.filter((e) => e.team === 0);
  const b = chars.filter((e) => e.team === 1);
  // Grudge matches: rivals are paired into the same duel.
  const rivals = (x: Entity, y: Entity) => !!(x.snap?.rivals?.includes(y.snapshotId) || y.snap?.rivals?.includes(x.snapshotId));
  const locked = new Set<number>();
  for (let i = 0; i < a.length && i < b.length; i++) {
    const j = b.findIndex((y, k) => !locked.has(k) && rivals(a[i]!, y));
    if (j < 0) continue;
    if (j !== i) [b[i], b[j]] = [b[j]!, b[i]!];
    locked.add(i);
  }
  // Rotate the station list by seed so the same pairing doesn't always meet in the same place.
  const offset = w.envRng.int(st.length);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i % b.length];
    const idx = offset + i;
    if (x) {
      set(x, idx);
      x.duelTarget = y?.id ?? -1;
    }
    if (y && i < b.length) {
      set(y, idx);
      y.duelTarget = x?.id ?? -1;
    }
  }
}

export function createWorld(input: BattleInput, bundle: ContentBundle): World {
  const content = indexContent(bundle);
  const { arena, obstacles } = layoutArena(must(content.arenas, input.arenaId, 'arena'), input.seed);
  const root = Rng.fromSeed(input.endless ? `${input.seed}#${input.endless.round}` : input.seed);
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
    crashTeam: input.teams.length,
    crashed: false,
    refereeId: -1,
    suddenDeathTick: input.endless ? Number.MAX_SAFE_INTEGER : SUDDEN_DEATH_TICK,
    hazardNext: arena.hazards.map((h) => h.startTick),
    finished: false,
    result: null,
    firedThisTick: new Set(),
    spawnedThisTick: 0,
    banter: new Map(),
    wallHp: [],
    wallMaxHp: [],
    wallBroken: [],
    belts: obstacles.filter((o) => o.belt).map((o) => ({ rect: o.rect, vx: o.belt![0], vy: o.belt![1] })),
  };
  initWalls(w);
  for (const p of arena.props) spawnProp(w, p.prop, p.at[0], p.at[1]);
  if (input.mode === 'ffa') {
    // Endless floors (08) bring their own spots, enough for the whole field, and a referee.
    const spots = input.endless?.spawns.length ? input.endless.spawns : arena.spawns.ffa;
    let k = 0;
    input.teams.forEach((team, ti) => {
      for (const snap of team.characters) {
        const [x, y] = spots[k % spots.length]!;
        spawnCharacter(w, snap, ti, x, y);
        k++;
      }
    });
    if (input.endless) spawnReferee(w);
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
  assignStations(w);
  for (const e of w.entities) if (e.kind !== 'prop') emit(w, 'spawn', e.id, -1, e.team, e.kind === 'char' ? e.snapshotId : e.def);
  return w;
}
