import { clamp, idiv } from '../core/math';
import type { CrashTrigger, Entity, World } from '../types';
import { emit, isFighter, removeEntity, spawnCharacter, spawnProp } from '../world';
import { dismount, dropHeld } from './effects';
import { isBlockedAt } from './nav';

/** How close to the side wall counts as through the door (mm). */
const DOOR_MM = 1100;
/** Ride-length for a mount: the whole visit. */
const ALL_VISIT = 1 << 30;

/** The shortest visit before unwelcome company sends them off (ticks). */
const MIN_STAY = 200;

/** How far apart the gatecrashers come in, side by side (mm). */
const SPREAD = 1800;

/** Each real side still has at least `minActiveBp` of its fighters standing: the fight is well open. */
function fightIsOpen(w: World, minActiveBp: number): boolean {
  // Institutions (09) don't care: a lobby floor always has sides with nobody on it.
  if (minActiveBp <= 0) return true;
  for (let t = 0; t < w.teamCount; t++) {
    let total = 0;
    let up = 0;
    for (const e of w.entities) {
      if (e.removed || !isFighter(e) || e.team !== t) continue;
      total++;
      if (e.state === 'active') up++;
    }
    if (total === 0 || up * 10000 < total * minActiveBp) return false;
  }
  return true;
}

/** The nearest free spot to (x, y), stepping down into the arena. */
function freeSpot(w: World, x: number, y: number): [number, number] {
  const [W, H] = w.arena.sizeMm;
  for (let k = 0; k < 12; k++) {
    const yy = clamp(y + k * 400, 600, H - 600);
    const xx = clamp(x, 600, W - 600);
    if (!isBlockedAt(w.nav, xx, yy)) return [xx, yy];
  }
  return w.arena.refereeSpawn;
}

/**
 * Gatecrashers (07): once their tick comes, and while the fight is still well
 * open, they burst in at the back of the arena, side by side, as a side of
 * their own that fights everyone. If the fight is nearly over by their last
 * tick, they don't come.
 */
export function crashersTick(w: World): void {
  const c = w.input.crashers;
  if (!c || !c.characters.length) return;
  if (w.crashed) {
    leaving(w);
    return;
  }
  if (w.tick < c.tick || w.tick > c.until) return;
  if (!fightIsOpen(w, c.minActiveBp)) return;
  // Institutions (09 §7.2) come when the floor gives them a reason, checked once a second.
  if (c.when && (w.tick % 20 !== 0 || !triggered(w, c.when))) return;
  w.crashed = true;
  w.crashArrived = w.tick;
  const [W] = w.arena.sizeMm;
  const n = c.characters.length;
  const ids: number[] = [];
  c.characters.forEach((snap, i) => {
    // Leader in the middle, henchmen either side.
    const off = i === 0 ? 0 : i % 2 ? -SPREAD : SPREAD;
    const [x, y] = freeSpot(w, idiv(W, 2) + off, 900);
    const e = spawnCharacter(w, snap, w.crashTeam, x, y);
    e.decideAt = w.tick + 10 + i * 2;
    ids.push(e.id);
    emit(w, 'spawn', e.id, -1, e.team, e.snapshotId);
    // The leader rides in on their mount (NATO's high horse), and stays on it.
    if (i === 0 && c.mount) {
      const m = spawnProp(w, c.mount, x, y, -1, e.id);
      if (m) {
        e.rideId = m.id;
        e.rideUntil = ALL_VISIT;
        m.riddenBy = e.id;
        emit(w, 'ride', e.id, m.id, 0, m.def, -1);
      }
    }
  });
  emit(w, 'crash', ids[0]!, -1, n, c.set);
}

/** Standing fighters of real sides (not gatecrashers, critters or the referee). */
function standingTeams(w: World): Set<number> {
  const out = new Set<number>();
  for (const e of w.entities) if (!e.removed && isFighter(e) && e.state === 'active' && e.team < w.teamCount) out.add(e.team);
  return out;
}

/** Whether the floor gives an institution its reason to come in (09 §7.2.3). */
function triggered(w: World, t: CrashTrigger): boolean {
  if (t.noneStanding) {
    const up = standingTeams(w);
    if (t.noneStanding.filter((team) => up.has(team)).length > (t.few ?? 0)) return false;
  }
  if (t.koStreak) {
    const since = w.tick - t.koStreak.withinTicks;
    const bySide = new Map<number, number>();
    let all = 0;
    for (let i = w.events.length - 1; i >= 0; i--) {
      const ev = w.events[i]!;
      if (ev.t < since) break;
      if (ev.type !== 'ko') continue;
      const victim = w.byId.get(ev.b);
      const by = w.byId.get(ev.a);
      if (!victim || !isFighter(victim) || victim.team >= w.teamCount) continue;
      all++;
      if (by && isFighter(by) && by.team < w.teamCount && by.team !== victim.team) bySide.set(by.team, (bySide.get(by.team) ?? 0) + 1);
    }
    const best = t.koStreak.oneSide ? Math.max(0, ...bySide.values()) : all;
    if (best < t.koStreak.kos) return false;
  }
  return true;
}

function crew(w: World): Entity[] {
  return w.entities.filter((e) => !e.removed && e.kind === 'char' && e.team === w.crashTeam && e.summonOf < 0);
}

/**
 * Institutions leave of their own accord (09 §7.2.2): hurt enough (skirmish),
 * after their time (aloof, meddle), or when someone they'd rather not meet
 * turns up. Once leaving they walk to the nearest side door; through it, they're gone.
 */
function leaving(w: World): void {
  const c = w.input.crashers!;
  if (!c.stance) return;
  // Floored, they're escorted out like a delegate (a lobby floor has no room for bodies).
  const outTicks = w.input.endless?.walkOnTicks ?? w.input.endless?.relistTicks ?? 80;
  for (const e of crew(w)) {
    if (e.state !== 'ko' || e.koTick < 0 || e.carriedBy >= 0 || w.tick - e.koTick < outTicks) continue;
    const ride = e.rideId >= 0 ? w.byId.get(e.rideId) : undefined;
    if (ride) dismount(w, e);
    dropHeld(w, e, -1);
    removeEntity(w, e);
    if (ride) removeEntity(w, ride);
    emit(w, 'crashExit', e.id, -1, 1, c.set, -1);
  }
  if (c.stance === 'fight') return;
  const them = crew(w);
  if (!w.crashLeaving) {
    if (!them.length) {
      w.crashLeaving = true;
      return;
    }
    const hurt = c.leaveAtBp !== undefined && them.some((e) => e.state === 'active' && e.hp * 10000 < e.maxHp * c.leaveAtBp!);
    const stayed = w.tick - w.crashArrived;
    const done = c.leaveAfterTicks !== undefined && stayed >= c.leaveAfterTicks;
    // Unwelcome company: they leave, but not before they've made their entrance.
    const unwelcome = !!c.leaveIfStanding && stayed >= MIN_STAY && w.tick % 20 === 0 && c.leaveIfStanding.filter((team) => standingTeams(w).has(team)).length > (c.when?.few ?? 0);
    if (!hurt && !done && !unwelcome) return;
    w.crashLeaving = true;
    const leader = them[0];
    emit(w, 'crashLeave', leader?.id ?? -1, -1, them.length, c.set, -1);
  }
  const [W] = w.arena.sizeMm;
  for (const e of them) {
    if (e.state !== 'active') continue;
    if (e.x > DOOR_MM && e.x < W - DOOR_MM) continue;
    const ride = e.rideId >= 0 ? w.byId.get(e.rideId) : undefined;
    if (ride) dismount(w, e);
    dropHeld(w, e, -1);
    removeEntity(w, e);
    if (ride) removeEntity(w, ride);
    emit(w, 'crashExit', e.id, -1, 0, c.set, -1);
  }
}

/**
 * What an institution does this decision (09 §7.2.2), or false to fight as
 * usual. Leaving: walk to the nearest side door. Aloof: a lap of the floor,
 * well away from everyone. Meddle: its own abilities only (the caller filters).
 */
export function crasherPlan(w: World, e: Entity): 'leave' | 'lap' | 'meddle' | null {
  const c = w.input.crashers;
  if (!c || e.team !== w.crashTeam || e.summonOf >= 0) return null;
  if (w.crashLeaving) return 'leave';
  if (c.stance === 'aloof') return 'lap';
  if (c.stance === 'meddle') return 'meddle';
  return null;
}

/** Where a leaving institution walks: the nearest side door, at their own height. */
export function doorFor(w: World, e: Entity): [number, number] {
  const [W] = w.arena.sizeMm;
  return [e.x < W / 2 ? 300 : W - 300, e.y];
}

/** The corners of an aloof lap (inset from the walls), visited in turn. */
export function lapPoint(w: World, e: Entity): [number, number] {
  const [W, H] = w.arena.sizeMm;
  const pts: [number, number][] = [
    [2000, 2000],
    [W - 2000, 2000],
    [W - 2000, H - 2000],
    [2000, H - 2000],
  ];
  const leg = Math.floor((w.tick - Math.max(0, w.crashArrived)) / 140);
  return pts[(leg + (e.id % 4)) % 4]!;
}
