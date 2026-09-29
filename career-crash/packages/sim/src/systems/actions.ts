import { bpMul, clamp, dir1000, dist, idiv } from '../core/math';
import type { Action, Entity, World } from '../types';
import { canAct, derived, emit, get, hasFlag, spawnProp, statusMod } from '../world';
import { affectedBy } from './ai';
import { applyEffect, dismount, push, type EffectCtx } from './effects';
import { cellCenter, cellOf, findPath, lineClear } from './nav';

const THROW_SPEED = 380;

function faceToward(e: Entity, x: number, y: number): void {
  const [dx, dy] = dir1000(x - e.x, y - e.y);
  if (dx !== 0 || dy !== 0) {
    e.fx = dx;
    e.fy = dy;
  }
}

function moveSpeed(w: World, e: Entity): number {
  let s = e.stats ? derived.speed(e.stats) : 180;
  if (e.kind === 'npc') s = 170;
  s = bpMul(s, 10000 + statusMod(w, e, 'moveBp'));
  if (e.rideId >= 0) {
    const r = w.content.props.get(w.byId.get(e.rideId)?.def ?? '')?.ride;
    if (r) s = bpMul(s, 10000 + r.speedBonusBp);
  }
  return Math.max(20, s);
}

/** Steer toward (x, y): direct if the line is clear, otherwise follow an A* path. */
/**
 * Downed (0 HP) characters don't just lie there: they crawl towards the
 * nearest standing ally, hoping for a revive, and stop once help arrives.
 */
function crawlDowned(w: World, e: Entity): void {
  if (hasFlag(w, e, 'down') || hasFlag(w, e, 'noMove')) return;
  let ally: Entity | null = null;
  let best = 20000;
  for (const o of w.entities) {
    if (o.kind !== 'char' || o.team !== e.team || o.id === e.id || o.state !== 'active' || o.removed) continue;
    if (o.action?.kind === 'revive' && o.action.targetId === e.id && dist(o.x, o.y, e.x, e.y) < 2500) return;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d < best) {
      best = d;
      ally = o;
    }
  }
  if (!ally) return;
  moveToward(w, e, ally.x, ally.y, 1300);
  e.mx = idiv(e.mx * 3, 10);
  e.my = idiv(e.my * 3, 10);
}

function moveToward(w: World, e: Entity, x: number, y: number, stopAt: number): void {
  const d = dist(e.x, e.y, x, y);
  if (d <= stopAt) return;
  let tx = x;
  let ty = y;
  if (!lineClear(w.nav, e.x, e.y, x, y)) {
    const goalCell = cellOf(w.nav, x, y);
    const gc = goalCell % w.nav.cols;
    const gr = idiv(goalCell, w.nav.cols);
    const pc = e.pathGoal % w.nav.cols;
    const pr = idiv(e.pathGoal, w.nav.cols);
    const goalMoved = e.pathGoal < 0 || Math.abs(gc - pc) + Math.abs(gr - pr) > 2;
    if (goalMoved || e.path.length === 0 || (w.tick + e.id) % 40 === 0) {
      e.path = findPath(w.nav, e.x, e.y, x, y);
      e.pathGoal = goalCell;
    }
    while (e.path.length > 1) {
      const [cx, cy] = cellCenter(w.nav, e.path[0]!);
      if (dist(e.x, e.y, cx, cy) < 250 || lineClear(w.nav, e.x, e.y, ...cellCenter(w.nav, e.path[1]!))) e.path.shift();
      else break;
    }
    if (e.path.length > 0) [tx, ty] = cellCenter(w.nav, e.path[0]!);
  }
  const [dx, dy] = dir1000(tx - e.x, ty - e.y);
  const sp = Math.min(moveSpeed(w, e), d - stopAt);
  e.mx = idiv(dx * sp, 1000);
  e.my = idiv(dy * sp, 1000);
  faceToward(e, tx, ty);
}

function rangeFor(w: World, e: Entity, a: Action, t: Entity | undefined): number {
  const rr = e.radius + (t ? (t.areaRadius > 0 ? 0 : t.radius) : 0);
  switch (a.kind) {
    case 'attack':
      return e.attack.rangeMm + rr;
    case 'ability': {
      const ab = w.content.abilities.get(a.abilityId);
      const tg = ab?.targeting;
      if (!tg || tg.type === 'self' || tg.type === 'circleSelf') return tg?.type === 'circleSelf' ? Math.max(1200, idiv((tg.radiusMm ?? tg.rangeMm) * 2, 3)) : 1_000_000;
      return tg.rangeMm + rr;
    }
    case 'throw':
      return 9000;
    case 'pickUp':
    case 'use':
    case 'push':
      return rr + 150;
    case 'revive':
      return rr + 200;
    case 'taunt':
      return 1_000_000;
    default:
      return 300;
  }
}

function windupFor(w: World, e: Entity, a: Action): number {
  const inter = e.stats ? bpMul(derived.interactTicks(e.stats), 10000 - statusMod(w, e, 'interactionBp')) : 10;
  switch (a.kind) {
    case 'attack':
      return e.attack.windupTicks;
    case 'ability':
      return w.content.abilities.get(a.abilityId)?.castTicks ?? 5;
    case 'throw':
      return 8;
    case 'pickUp':
    case 'use':
    case 'push':
      return Math.max(3, inter);
    case 'revive':
      return e.baseTags.includes('skill:heal') ? 35 : 60;
    case 'taunt':
      return 15;
    default:
      return 0;
  }
}

function recoverFor(w: World, e: Entity, a: Action): number {
  if (a.kind === 'attack') return e.attack.recoverTicks;
  if (a.kind === 'ability') return 8;
  if (a.kind === 'throw') return 8;
  return 3;
}

function targetValid(w: World, a: Action, t: Entity | undefined): boolean {
  if (a.targetId < 0) return true;
  if (!t) return false;
  if (t.kind === 'prop') {
    if (a.kind === 'pickUp' || a.kind === 'use' || a.kind === 'push') return t.carriedBy < 0 && t.riddenBy < 0 && !t.flying;
    return true;
  }
  if (a.kind === 'revive') return t.state === 'downed';
  return t.state !== 'ko';
}

function execute(w: World, e: Entity, a: Action, t: Entity | undefined): void {
  switch (a.kind) {
    case 'attack': {
      if (!t) return;
      if (dist(e.x, e.y, t.x, t.y) > rangeFor(w, e, a, t) + 400) {
        emit(w, 'miss', e.id, t.id, 0, '', -1);
        return;
      }
      const held = e.snap?.held ?? '';
      const ev = emit(w, 'attack', e.id, t.id, 0, held, -1);
      const ctx: EffectCtx = { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'melee' };
      applyEffect(w, { type: 'damage', amount: e.attack.base, damageType: e.attack.damageType }, t, ctx);
      if (e.attack.knockbackMm > 0) push(w, t, e.x, e.y, e.attack.knockbackMm);
      for (const eff of e.attack.effects ?? []) applyEffect(w, eff, t, ctx, e);
      return;
    }
    case 'ability': {
      const ab = w.content.abilities.get(a.abilityId);
      if (!ab || !t) return;
      e.energy -= (ab.cost?.energy ?? 0) * 100;
      e.cooldowns[ab.id] = w.tick + (ab.cooldownTicks ?? 60);
      e.counters.abilitiesUsed++;
      const ev = emit(w, 'abilityCast', e.id, t.id, 0, ab.id, -1);
      const range = ab.targeting?.rangeMm ?? 0;
      const socialOnly = (ab.effects ?? []).every((x) => x.type !== 'damage' || x.damageType === 'social');
      const scale: EffectCtx['scale'] = socialOnly ? 'social' : range > 2500 ? 'throw' : 'melee';
      const ctx: EffectCtx = { sourceId: e.id, cause: ev, powerBp: 10000, scale };
      const affected = affectedBy(w, e, ab, t);
      for (const x of affected) {
        for (const eff of ab.effects ?? []) {
          if (eff.toSelf && x !== affected[0]) continue;
          applyEffect(w, eff, x, ctx, e);
        }
      }
      return;
    }
    case 'pickUp': {
      if (!t || t.carriedBy >= 0) return;
      t.carriedBy = e.id;
      t.vx = t.vy = t.vz = 0;
      e.heldId = t.id;
      e.tagsDirty = true;
      emit(w, 'pickUp', e.id, t.id, 0, t.def, -1);
      return;
    }
    case 'throw': {
      const p = get(w, e.heldId);
      if (!p || !t) return;
      const d = dist(e.x, e.y, t.x, t.y);
      const thr = e.stats?.throwing ?? 5;
      const spread = idiv(idiv(d * clamp(22 - thr, 1, 22), 60) * (10000 + e.throwSpreadBp), 10000);
      const [dx, dy] = dir1000(t.x - e.x, t.y - e.y);
      let off = w.rng.range(-spread, spread);
      // Clumsy hands: occasionally the throw goes badly wrong.
      if (e.quirks.includes('clumsyHands') && w.rng.chance(800)) off = w.rng.range(-4000, 4000);
      const ax = t.x + idiv(-dy * off, 1000);
      const ay = t.y + idiv(dx * off, 1000);
      const [vx, vy] = dir1000(ax - e.x, ay - e.y);
      const flight = Math.max(4, idiv(dist(e.x, e.y, ax, ay), THROW_SPEED));
      const ev = emit(w, 'throw', e.id, t.id, off, p.def, -1);
      e.heldId = -1;
      e.tagsDirty = true;
      p.carriedBy = -1;
      p.flying = true;
      p.thrownBy = e.id;
      p.flightCause = ev;
      p.age = 0;
      p.z = 1100;
      p.vx = idiv(vx * THROW_SPEED, 1000);
      p.vy = idiv(vy * THROW_SPEED, 1000);
      p.vz = idiv(12 * flight, 2) - idiv(1100, flight);
      e.counters.thrown[p.def] = (e.counters.thrown[p.def] ?? 0) + 1;
      return;
    }
    case 'push': {
      if (!t) return;
      const ev = emit(w, 'push', e.id, t.id, 0, t.def, -1);
      const [dx, dy] = dir1000(a.tx - t.x, a.ty - t.y);
      const str = e.stats?.strength ?? 5;
      const massFactor = clamp(idiv(30000 * 1000, Math.max(3000, t.weightG)), 300, 2500);
      const sp = idiv((200 + str * 12) * massFactor, 1000);
      t.vx = idiv(dx * sp, 1000);
      t.vy = idiv(dy * sp, 1000);
      t.movedBy = e.id;
      t.moveCause = ev;
      return;
    }
    case 'use': {
      if (!t) return;
      const def = w.content.props.get(t.def);
      if (!def) return;
      const ev = emit(w, def.ride ? 'ride' : 'use', e.id, t.id, 0, t.def, -1);
      e.counters.used[t.def] = (e.counters.used[t.def] ?? 0) + 1;
      if (def.ride) {
        e.rideId = t.id;
        e.rideUntil = w.tick + def.ride.durationTicks;
        t.riddenBy = e.id;
        t.moveCause = ev;
        return;
      }
      if (def.use) {
        if (t.uses <= 0) return;
        for (const eff of def.use.effects) applyEffect(w, eff, e, { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'none' }, t);
        if (def.use.spawn) {
          const [fx, fy] = [e.fx, e.fy];
          const s = w.envRng.range(-600, 600);
          spawnProp(w, def.use.spawn, t.x - idiv(fx * (t.radius + 300), 1000) + s, t.y - idiv(fy * (t.radius + 300), 1000), ev, e.id);
        }
        t.uses--;
        if (def.use.consumed && t.uses <= 0) t.removed = true;
      }
      return;
    }
    case 'revive': {
      if (!t || t.state !== 'downed') return;
      t.state = 'active';
      t.revived = true;
      t.hp = idiv(t.maxHp * 3, 10);
      t.tagsDirty = true;
      t.morale = clamp(t.morale + 20, 0, 100);
      e.counters.revives++;
      emit(w, 'revived', e.id, t.id, t.hp, '', -1);
      return;
    }
    case 'taunt': {
      e.cooldowns['taunt'] = w.tick + 200;
      const ev = emit(w, 'taunt', e.id, -1, 0, 'emote', -1);
      for (const x of w.entities) {
        if (x.kind === 'char' && x.team !== e.team && x.state === 'active' && dist(x.x, x.y, e.x, e.y) < 5000 + (e.stats?.charisma ?? 5) * 200) {
          applyEffect(w, { type: 'taunt', ticks: 40 }, x, { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'none' });
        }
      }
      return;
    }
    default:
      return;
  }
}

/** Progress approach → windup → execute → recover for every character (02 §4 step 4). */
export function progressActions(w: World): void {
  for (const e of w.entities) {
    e.mx = 0;
    e.my = 0;
    if (e.removed) continue;
    if (e.kind === 'npc') {
      refereeMove(w, e);
      continue;
    }
    if (e.kind !== 'char') continue;
    if (e.rideId >= 0 && (w.tick >= e.rideUntil || !canAct(w, e))) dismount(w, e);
    if (e.state === 'downed') {
      crawlDowned(w, e);
      continue;
    }
    if (!canAct(w, e)) continue;
    const a = e.action;
    if (!a) continue;
    const t = get(w, a.targetId);
    if (!targetValid(w, a, t) || (a.phase === 'approach' && w.tick > a.expires)) {
      e.action = null;
      continue;
    }
    if (t && a.kind !== 'push') {
      a.tx = t.x;
      a.ty = t.y;
    }
    if (a.phase === 'approach') {
      const target = a.kind === 'push' && t ? t : undefined;
      const px = target ? target.x : a.tx;
      const py = target ? target.y : a.ty;
      const range = rangeFor(w, e, a, t);
      const d = dist(e.x, e.y, px, py);
      if (a.kind === 'throw' && e.heldId < 0) {
        e.action = null;
        continue;
      }
      if (d > range) {
        moveToward(w, e, px, py, Math.max(0, range - 100));
        continue;
      }
      if (a.kind === 'retreat' || a.kind === 'reposition' || a.kind === 'wander') {
        e.action = null;
        continue;
      }
      faceToward(e, px, py);
      a.phase = 'windup';
      a.timer = windupFor(w, e, a);
    }
    if (a.phase === 'windup') {
      if (a.timer > 0) {
        a.timer--;
        if (t && a.kind !== 'push') faceToward(e, t.x, t.y);
        continue;
      }
      execute(w, e, a, t);
      if (e.action !== a) continue;
      a.phase = 'recover';
      a.timer = recoverFor(w, e, a);
    }
    if (a.phase === 'recover') {
      if (a.timer > 0) a.timer--;
      else {
        e.action = null;
        e.decideAt = w.tick;
      }
    }
  }
}

function refereeMove(w: World, r: Entity): void {
  if (r.state !== 'active' || hasFlag(w, r, 'noActions') || hasFlag(w, r, 'down')) return;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const e of w.entities) {
    if (e.kind === 'char' && e.state === 'active') {
      sx += e.x;
      sy += e.y;
      n++;
    }
  }
  if (n === 0) return;
  const cx = idiv(sx, n);
  const cy = idiv(sy, n) + ((w.tick >> 7) % 2 === 0 ? 2200 : -2200);
  moveToward(w, r, cx, cy, 1200);
  r.mx = idiv(r.mx, 2);
  r.my = idiv(r.my, 2);
}
