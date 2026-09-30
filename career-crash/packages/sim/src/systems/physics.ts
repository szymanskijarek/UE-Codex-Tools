import { clamp, dir1000, dist2, idiv, isqrt } from '../core/math';
import type { Entity, World } from '../types';
import { derived, emit, get, hasFlag, maskOverlap, removeEntity, tagsOf } from '../world';
import { wallImpact } from './destruction';
import { applyDamage, applyEffect, applyStatus, push, removeStatus } from './effects';

const GRAVITY = 12;
const CHAR_FRICTION = 78;
const PROP_FRICTION = 86;
const SLIP_FRICTION = 97;
const IMPACT_SPEED = 110;

/** Index of the obstacle the last resolveWalls call bumped into (-1 none). */
let touchedWall = -1;

function resolveWalls(w: World, e: Entity): boolean {
  let hit = false;
  touchedWall = -1;
  const r = e.radius;
  const [W, H] = w.arena.sizeMm;
  const cx0 = clamp(e.x, r, W - r);
  const cy0 = clamp(e.y, r, H - r);
  if (cx0 !== e.x || cy0 !== e.y) {
    e.x = cx0;
    e.y = cy0;
    hit = true;
  }
  if (e.z > 1600) return hit; // flying over counters/shelves
  for (const [i, [x, y, ww, hh]] of w.arena.walls.entries()) {
    if (w.wallBroken[i]) continue;
    const cx = clamp(e.x, x, x + ww);
    const cy = clamp(e.y, y, y + hh);
    const d2 = dist2(e.x, e.y, cx, cy);
    if (d2 >= r * r) continue;
    hit = true;
    touchedWall = i;
    if (d2 === 0) {
      // Centre inside the wall: push out along the shortest axis.
      const left = e.x - x;
      const right = x + ww - e.x;
      const top = e.y - y;
      const bottom = y + hh - e.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) e.x = x - r;
      else if (m === right) e.x = x + ww + r;
      else if (m === top) e.y = y - r;
      else e.y = y + hh + r;
      continue;
    }
    const d = isqrt(d2);
    const [nx, ny] = dir1000(e.x - cx, e.y - cy);
    e.x += idiv(nx * (r - d), 1000);
    e.y += idiv(ny * (r - d), 1000);
  }
  // Walls near the edge can push things out of the arena: clamp again.
  e.x = clamp(e.x, r, W - r);
  e.y = clamp(e.y, r, H - r);
  return hit;
}

function isSolid(w: World, e: Entity): boolean {
  if (e.removed || e.areaRadius > 0 || e.carriedBy >= 0 || e.flying) return false;
  if (e.kind === 'char') return e.state === 'active' && !hasFlag(w, e, 'down');
  if (e.kind === 'npc') return e.state === 'active';
  if (e.riddenBy >= 0) return false;
  return w.content.props.get(e.def)?.solid === true;
}

/** Movement, knockback, gravity, and body collisions (02 §4 step 5). */
export function physics(w: World): void {
  for (const e of w.entities) {
    if (e.removed) continue;
    if (e.carriedBy >= 0) {
      const c = w.byId.get(e.carriedBy);
      if (c && !c.removed) {
        e.x = c.x + idiv(c.fx * 250, 1000);
        e.y = c.y + idiv(c.fy * 250, 1000);
        e.z = 1100;
        e.vx = e.vy = e.vz = 0;
      }
      continue;
    }
    if (e.riddenBy >= 0) {
      const c = w.byId.get(e.riddenBy);
      if (c && !c.removed) {
        e.vx = c.x + idiv(c.fx * 300, 1000) - e.x;
        e.vy = c.y + idiv(c.fy * 300, 1000) - e.y;
        e.x += e.vx;
        e.y += e.vy;
        continue;
      }
    }
    const slipping = hasFlag(w, e, 'slipping');
    const moveMul = slipping ? 3 : 10;
    // Evades and dashes: a short, fixed burst of movement.
    if (w.tick < e.dashUntil && e.z === 0) {
      e.x += e.dashVx;
      e.y += e.dashVy;
    }
    // Conveyor belts carry anything standing on them.
    if (e.z === 0 && e.carriedBy < 0 && e.areaRadius === 0 && !(e.kind === 'prop' && w.content.props.get(e.def)?.anchored)) {
      for (const b of w.belts) {
        const [bx, by, bw, bh] = b.rect;
        if (e.x >= bx && e.x <= bx + bw && e.y >= by && e.y <= by + bh) {
          e.x += b.vx;
          e.y += b.vy;
          break;
        }
      }
    }
    if (e.kind !== 'prop' && (e.state === 'active' || e.state === 'downed') && !hasFlag(w, e, 'noMove')) {
      e.x += idiv(e.mx * moveMul, 10);
      e.y += idiv(e.my * moveMul, 10);
      if (slipping && (e.mx !== 0 || e.my !== 0)) {
        e.vx += idiv(e.mx, 6);
        e.vy += idiv(e.my, 6);
      }
    }
    e.x += e.vx;
    e.y += e.vy;
    if (e.z > 0 || e.vz !== 0) {
      e.z += e.vz;
      e.vz -= GRAVITY;
      if (e.z <= 0) {
        e.z = 0;
        e.vz = 0;
        if (e.kind !== 'prop' && e.tossedBy !== -1) land(w, e);
        if (e.flying) {
          e.flying = false;
          e.vx = idiv(e.vx, 4);
          e.vy = idiv(e.vy, 4);
          // Fragile props break on landing.
          if (e.maxHp > 0 && e.maxHp <= 10) applyDamage(w, e, e.maxHp, 'blunt', e.thrownBy, e.flightCause);
        }
      }
    }
    if (!e.flying && !(e.kind !== 'prop' && e.z > 0)) {
      const f = slipping ? SLIP_FRICTION : e.kind === 'prop' ? PROP_FRICTION : CHAR_FRICTION;
      e.vx = idiv(e.vx * f, 100);
      e.vy = idiv(e.vy * f, 100);
      if (Math.abs(e.vx) < 3) e.vx = 0;
      if (Math.abs(e.vy) < 3) e.vy = 0;
    }
    const resting = e.kind === 'prop' && e.vx === 0 && e.vy === 0 && e.z === 0;
    const speed = Math.abs(e.vx) + Math.abs(e.vy);
    const bumped = e.areaRadius === 0 && !resting && resolveWalls(w, e);
    if (bumped && touchedWall >= 0 && e.carriedBy < 0) wallImpact(w, e, touchedWall, speed);
    if (bumped && e.kind === 'prop') {
      e.vx = -idiv(e.vx, 2);
      e.vy = -idiv(e.vy, 2);
    }
  }
  separateBodies(w);
}

function separateBodies(w: World): void {
  const solids = w.entities.filter((e) => isSolid(w, e));
  const pairs: Entity[] = [];
  broadPhase(solids, (e) => e.radius, (a, b) => pairs.push(a, b));
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i]!;
    const b = pairs[i + 1]!;
    const rr = a.radius + b.radius;
    const d2 = dist2(a.x, a.y, b.x, b.y);
    if (d2 >= rr * rr) continue;
    const d = isqrt(d2);
    let [nx, ny] = dir1000(b.x - a.x, b.y - a.y);
    if (nx === 0 && ny === 0) [nx, ny] = a.id < b.id ? [1000, 0] : [-1000, 0];
    const overlap = rr - d;
    const aFixed = a.kind === 'prop' && w.content.props.get(a.def)?.anchored;
    const bFixed = b.kind === 'prop' && w.content.props.get(b.def)?.anchored;
    if (aFixed && bFixed) continue;
    // Share of the correction each body takes, by weight.
    let shareA = aFixed ? 0 : bFixed ? 1000 : idiv(b.weightG * 1000, a.weightG + b.weightG);
    if (!aFixed && !bFixed && a.kind === 'char' && b.kind === 'char') shareA = 500;
    const shareB = 1000 - shareA;
    a.x -= idiv(idiv(nx * overlap, 1000) * shareA, 1000);
    a.y -= idiv(idiv(ny * overlap, 1000) * shareA, 1000);
    b.x += idiv(idiv(nx * overlap, 1000) * shareB, 1000);
    b.y += idiv(idiv(ny * overlap, 1000) * shareB, 1000);
    for (const e of [a, b]) {
      e.x = clamp(e.x, e.radius, w.arena.sizeMm[0] - e.radius);
      e.y = clamp(e.y, e.radius, w.arena.sizeMm[1] - e.radius);
    }
  }
}

function speedOf(e: Entity): number {
  return isqrt(e.vx * e.vx + e.vy * e.vy);
}

function overlapRadius(e: Entity): number {
  return e.areaRadius > 0 ? e.areaRadius : e.radius;
}

/** A thrown character hits the floor. */
function land(w: World, e: Entity): void {
  const by = e.tossedBy;
  const cause = e.tossCause;
  const dmg = e.tossLand;
  e.tossedBy = -1;
  e.vx = idiv(e.vx * 3, 10);
  e.vy = idiv(e.vy * 3, 10);
  removeStatus(w, e, 'status.airborne', cause);
  emit(w, 'landed', by, e.id, dmg, '', cause);
  if (dmg > 0) applyDamage(w, e, dmg, 'blunt', by >= 0 ? by : e.id, cause, false);
  if (e.kind === 'char' && e.state === 'active') applyEffect(w, { type: 'knockdown' }, e, { sourceId: by, cause, powerBp: 10000, scale: 'none' });
}

/** A flying body bowls over whoever it hits mid-air. */
function bodyHit(w: World, flyer: Entity, other: Entity): void {
  if (other.kind === 'prop') {
    if (other.maxHp > 0) applyDamage(w, other, 12, 'blunt', flyer.tossedBy, flyer.tossCause);
    push(w, other, flyer.x - flyer.vx, flyer.y - flyer.vy, 1500);
    return;
  }
  if (other.state !== 'active' || other.id === flyer.tossedBy) return;
  const ev = emit(w, 'hit', flyer.id, other.id, 0, 'body', flyer.tossCause);
  applyDamage(w, other, 7, 'blunt', flyer.tossedBy >= 0 ? flyer.tossedBy : flyer.id, ev, false);
  if (other.kind === 'char') applyEffect(w, { type: 'knockdown' }, other, { sourceId: flyer.tossedBy, cause: ev, powerBp: 10000, scale: 'none' });
  push(w, other, flyer.x - flyer.vx, flyer.y - flyer.vy, 1800);
}

/** A patrolling machine meets something: run characters over, eat small props. */
function moverHit(w: World, mover: Entity, other: Entity): void {
  const def = w.content.props.get(mover.def)?.mover;
  if (!def) return;
  if (other.kind === 'prop') {
    const od = w.content.props.get(other.def);
    if (def.eatsUpToG !== undefined && od?.carry && other.weightG <= def.eatsUpToG && other.carriedBy < 0 && !other.flying && other.moverSpeed === 0) {
      other.lastHitBy = mover.id;
      emit(w, 'use', mover.id, other.id, 0, other.def, -1);
      removeEntity(w, other);
    }
    return;
  }
  if (other.state !== 'active') return;
  // One run-over per victim every 3 s, otherwise the knockback just feeds them back under the machine.
  const key = `hit:${other.id}`;
  if ((mover.cooldowns[key] ?? -1) > w.tick) return;
  mover.cooldowns[key] = w.tick + 60;
  const ev = emit(w, 'hit', mover.id, other.id, 0, mover.def, -1);
  for (const eff of def.hitEffects) applyEffect(w, eff, other, { sourceId: mover.id, cause: ev, powerBp: 10000, scale: 'none' }, mover);
}

/** Impact when a thrown/pushed/ridden prop meets a body. */
function impact(w: World, prop: Entity, victim: Entity): void {
  if (victim.kind === 'prop' || victim.state === 'ko') return;
  const def = w.content.props.get(prop.def);
  if (prop.flying) {
    if (victim.id === prop.thrownBy && prop.age < 8) return;
    // Thrown things sail over small summoned animals (they duck).
    if (victim.baseTags.includes('summon:animal')) return;
    const thrower = get(w, prop.thrownBy);
    const base = def?.throwDamage ?? Math.max(2, idiv(prop.weightG, 1000));
    const mul = thrower?.stats ? derived.throwMulBp(thrower.stats) : 10000;
    // Thrown objects hit hard: a good throw should be worth the trip to pick it up.
    applyDamage(w, victim, Math.max(1, idiv(base * mul * 28, 100000)), 'blunt', prop.thrownBy >= 0 ? prop.thrownBy : prop.id, prop.flightCause, prop.thrownBy >= 0);
    push(w, victim, prop.x - prop.vx, prop.y - prop.vy, 400 + idiv(prop.weightG, 20));
    if (prop.weightG >= 8000) applyEffect(w, { type: 'knockdown' }, victim, { sourceId: prop.thrownBy, cause: prop.flightCause, powerBp: 10000, scale: 'none' });
    prop.flying = false;
    prop.vx = -idiv(prop.vx, 5);
    prop.vy = -idiv(prop.vy, 5);
    if (prop.maxHp > 0) applyDamage(w, prop, 10, 'blunt', prop.thrownBy, prop.flightCause);
    return;
  }
  if (prop.riddenBy >= 0) {
    if (victim.id === prop.riddenBy) return;
    const rider = w.byId.get(prop.riddenBy)!;
    const sp = isqrt(rider.mx * rider.mx + rider.my * rider.my);
    if (sp < 150) return;
    const cause = prop.moveCause;
    applyDamage(w, victim, clamp(idiv(prop.weightG * sp, 150000), 4, 25), 'blunt', rider.id, cause);
    applyEffect(w, { type: 'knockdown' }, victim, { sourceId: rider.id, cause, powerBp: 10000, scale: 'none' });
    push(w, victim, rider.x, rider.y, 1500);
    return;
  }
  const sp = speedOf(prop);
  if (sp < IMPACT_SPEED || prop.movedBy === victim.id) return;
  const dmg = clamp(idiv(prop.weightG * sp, 150000), 3, 30);
  applyDamage(w, victim, dmg, 'blunt', prop.movedBy >= 0 ? prop.movedBy : prop.id, prop.moveCause);
  if (sp > 180 && victim.kind === 'char') applyEffect(w, { type: 'knockdown' }, victim, { sourceId: prop.movedBy, cause: prop.moveCause, powerBp: 10000, scale: 'none' });
  push(w, victim, prop.x, prop.y, idiv(sp * 6, 1));
  prop.vx = idiv(prop.vx, 2);
  prop.vy = idiv(prop.vy, 2);
}

/**
 * Sweep-and-prune broad phase along x: calls visit(a, b) for every pair whose
 * bounding boxes overlap. Order is deterministic (sorted by min-x, then id).
 */
function broadPhase(list: Entity[], radius: (e: Entity) => number, visit: (a: Entity, b: Entity) => void): void {
  const n = list.length;
  const minX = new Array<number>(n);
  const order = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    minX[i] = list[i]!.x - radius(list[i]!) - 20;
    order[i] = i;
  }
  order.sort((p, q) => minX[p]! - minX[q]! || list[p]!.id - list[q]!.id);
  for (let oi = 0; oi < n; oi++) {
    const a = list[order[oi]!]!;
    const ra = radius(a) + 20;
    const maxX = a.x + ra;
    for (let oj = oi + 1; oj < n; oj++) {
      const bi = order[oj]!;
      if (minX[bi]! > maxX) break;
      const b = list[bi]!;
      const rb = radius(b);
      if (Math.abs(a.y - b.y) > ra + rb) continue;
      if (a.id < b.id) visit(a, b);
      else visit(b, a);
    }
  }
}

/** Detect new/ongoing overlaps → contact events, impacts (02 §4 step 6). */
export function contacts(w: World): void {
  const list = w.entities.filter((e) => !e.removed && e.carriedBy < 0 && !(e.kind === 'char' && e.state === 'ko'));
  const now = new Set<number>();
  const pairs: Entity[] = [];
  broadPhase(list, overlapRadius, (a, b) => {
    if (Math.abs(a.z - b.z) > 1200 && a.areaRadius === 0 && b.areaRadius === 0) return;
    // Areas only touch things on the ground.
    if ((a.areaRadius > 0 && b.z > 300) || (b.areaRadius > 0 && a.z > 300)) return;
    const rr = overlapRadius(a) + overlapRadius(b) + 20;
    if (dist2(a.x, a.y, b.x, b.y) > rr * rr) return;
    // Skip pairs that can neither trigger a rule nor cause an impact.
    tagsOf(w, a);
    tagsOf(w, b);
    if (!maskOverlap(a.maskA, b.maskB) && !maskOverlap(b.maskA, a.maskB) && !isMover(a) && !isMover(b)) return;
    pairs.push(a, b);
  });
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i]!;
    const b = pairs[i + 1]!;
    if (a.removed || b.removed) continue;
    const pk = a.id * 100000 + b.id;
    now.add(pk);
    // A freshly spawned prop never triggers on whoever spawned it (no stepping on your own rake instantly).
    if ((a.spawnedBy === b.id && a.age < 40) || (b.spawnedBy === a.id && b.age < 40)) continue;
    if (!w.contacts.has(pk)) {
      w.queue.push({ event: 'contact', a: a.id, b: b.id, status: '', cause: -1 });
      const flyingA = a.kind !== 'prop' && a.tossedBy !== -1 && a.z > 150;
      const flyingB = b.kind !== 'prop' && b.tossedBy !== -1 && b.z > 150;
      if (flyingA && !flyingB) bodyHit(w, a, b);
      else if (flyingB && !flyingA) bodyHit(w, b, a);
      else if (a.moverSpeed > 0 && b.moverSpeed === 0) moverHit(w, a, b);
      else if (b.moverSpeed > 0 && a.moverSpeed === 0) moverHit(w, b, a);
      else {
        if (a.kind === 'prop' && a.areaRadius === 0) impact(w, a, b);
        if (b.kind === 'prop' && b.areaRadius === 0 && !a.removed) impact(w, b, a);
      }
    } else if ((w.tick + a.id + b.id) % 10 === 0) {
      w.queue.push({ event: 'touching', a: a.id, b: b.id, status: '', cause: -1 });
    }
  }
  w.contacts = now;
}

function isMover(e: Entity): boolean {
  return e.kind === 'prop' && e.areaRadius === 0 && (e.flying || e.riddenBy >= 0 || e.moverSpeed > 0 || e.vx !== 0 || e.vy !== 0);
}

/** Tripping while slipping: Luck saves you (02 §5.3). */
export function slipChecks(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || e.state !== 'active' || (w.tick + e.id) % 10 !== 0) continue;
    if (!hasFlag(w, e, 'slipping') || hasFlag(w, e, 'down')) continue;
    if (e.mx === 0 && e.my === 0 && speedOf(e) < 40) continue;
    const luck = e.stats?.luck ?? 5;
    if (w.rng.chance(2500 - luck * 100 + e.tripChanceBp)) {
      const st = e.statuses.find((s) => s.id === 'status.slipping');
      applyStatus(w, e, 'status.knocked-down', e.stats ? derived.standUp(e.stats) : 30, st?.sourceId ?? -1, st?.cause ?? -1);
    }
  }
}
