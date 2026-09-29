import type { Effect, TagMatch } from '@cc/content-schema';
import { bpMul, clamp, dir1000, dist, idiv, isqrt } from '../core/math';
import type { Entity, World } from '../types';
import { derived, emit, get, isAlive, removeEntity, spawnProp, statusMod, tagSetMatches, tagsOf } from '../world';

/** Context for applying an effect: who caused it, and which event it descends from. */
export interface EffectCtx {
  sourceId: number;
  cause: number;
  /** Scales numeric effects (damage/heal/morale) in bp. */
  powerBp: number;
  /** Stat that scales damage: melee, throw, none. */
  scale: 'melee' | 'throw' | 'none' | 'social';
}

export function matchTags(w: World, e: Entity, m: TagMatch | undefined): boolean {
  if (!m) return true;
  if (m.kind && m.kind !== 'any' && m.kind !== e.kind) return false;
  return tagSetMatches(e, tagsOf(w, e), m);
}

// ---------------------------------------------------------------------------
// Damage, heal, downed/KO (02 §5.2, §5.4)
// ---------------------------------------------------------------------------
export function applyDamage(w: World, target: Entity, amount: number, damageType: string, sourceId: number, cause: number, allowCrit = true): number {
  if (target.removed) return 0;
  if (target.kind === 'prop') {
    if (target.maxHp <= 0) return 0;
    target.hp -= amount;
    target.lastHitBy = sourceId;
    target.lastCause = cause;
    const def = w.content.props.get(target.def);
    if (def?.explode?.onDamage && target.fuse < 0) target.fuse = def.explode.fuseTicks;
    if (def?.leak && target.leaked < def.leak.max) {
      target.leaked++;
      spawnProp(w, def.leak.spill, target.x, target.y, cause, target.id);
    }
    if (target.hp <= 0) breakProp(w, target, cause);
    return amount;
  }
  if (target.state === 'ko') return 0;
  const src = get(w, sourceId);
  let final = amount;
  if (damageType === 'electric' && tagsOf(w, target).has('state:wet')) final *= 2;
  const mitig = clamp(-statusMod(w, target, 'damageTakenBp'), -10000, 6000);
  final = bpMul(final, 10000 - mitig);
  let crit = false;
  if (allowCrit && src?.stats && w.rng.chance(derived.critBp(src.stats))) {
    final = idiv(final * 3, 2);
    crit = true;
  }
  // Sudden death escalates: every wave (10 s) everyone takes +30% more damage, up to +120%.
  if (w.tick >= w.suddenDeathTick && target.kind === 'char') final = bpMul(final, 10000 + 3000 * Math.min(4, 1 + idiv(w.tick - w.suddenDeathTick, 200)));
  final = Math.max(1, final);
  const hitEv = emit(w, crit ? 'crit' : 'hit', sourceId, target.id, final, damageType, cause);
  if (src && src.kind === 'char') {
    src.counters.damageDealt += final;
    if (target.kind === 'npc') src.counters.refereeHits++;
    if (target.kind === 'char' && target.team === src.team && target.id !== src.id) src.counters.friendlyHits++;
  }
  target.counters.damageTaken += final;
  if (src?.kind === 'char' && target.kind === 'char' && src.team !== target.team) banter(w, src, target, hitEv);
  target.lastHitBy = sourceId;
  target.lastCause = hitEv;
  w.queue.push({ event: 'hit', a: sourceId, b: target.id, status: '', cause: hitEv });

  if (target.kind === 'npc') {
    target.hp -= final;
    if (target.hp <= 0 && target.state === 'active') {
      target.hp = 0;
      target.state = 'ko';
      target.action = null;
      emit(w, 'refereeDown', sourceId, target.id, 0, '', hitEv);
      w.suddenDeathTick = Math.min(w.suddenDeathTick, Math.max(w.tick + 100, w.suddenDeathTick - 300));
    }
    return final;
  }

  if (target.state === 'downed') {
    // Hitting a downed character: shortens their timer and is a foul (02 §5.4, §7.5).
    target.downTimer -= 20;
    if (src && src.kind === 'char') registerFoul(w, src, 3, hitEv);
    return final;
  }
  target.hp -= final;
  // Morale loss on big hits: −1 per 5% of max HP.
  target.morale = clamp(target.morale - idiv(final * 20, target.maxHp), 0, 100);
  if (target.hp <= 0) {
    target.hp = 0;
    const noRevive = w.mode === 'ffa' || target.revived;
    if (noRevive) knockOut(w, target, sourceId, hitEv);
    else {
      target.state = 'downed';
      target.downTimer = DOWNED_TICKS;
      target.action = null;
      target.tagsDirty = true;
      target.counters.downs++;
      dropHeld(w, target, hitEv);
      emit(w, 'downed', sourceId, target.id, 0, '', hitEv);
    }
  }
  return final;
}

/**
 * Getting up hurts: after a knockdown, a hurt character crawls for a while
 * before standing — the lower their HP, the longer (0.6 s at 50% HP up to
 * 3.6 s near 0). Crawlers are slow, hit softly and can still be attacked.
 */
function startCrawl(w: World, e: Entity, cause: number): void {
  if (e.kind !== 'char' || e.state !== 'active' || e.maxHp <= 0 || e.removed) return;
  const hpBp = idiv(e.hp * 10000, e.maxHp);
  if (hpBp >= 5000) return;
  applyStatus(w, e, 'status.crawling', 12 + idiv((5000 - hpBp) * 60, 5000), e.id, cause);
  e.action = null;
}

/** How long a character stays downed (crawling for help) before the KO (02 §5.4). */
export const DOWNED_TICKS = 140;

export function knockOut(w: World, target: Entity, sourceId: number, cause: number): void {
  if (target.state === 'ko') return;
  target.state = 'ko';
  target.hp = 0;
  target.action = null;
  target.tagsDirty = true;
  dropHeld(w, target, cause);
  if (target.rideId >= 0) dismount(w, target);
  const src = get(w, sourceId) ?? w.byId.get(sourceId);
  const koEv = emit(w, 'ko', sourceId, target.id, 0, '', cause);
  if (src && src.kind === 'char' && src.id !== target.id) {
    if (src.team !== target.team) {
      src.counters.kos++;
      src.morale = clamp(src.morale + 15, 0, 100);
    } else if (w.refereeId >= 0) registerFoul(w, src, 2, koEv);
  }
  for (const e of w.entities) {
    if (e.kind === 'char' && e.team === target.team && e.id !== target.id && isAlive(e)) {
      e.morale = clamp(e.morale - e.allyKoMoraleLoss, 0, 100);
    }
  }
  w.queue.push({ event: 'ko', a: target.id, b: sourceId, status: '', cause: koEv });
}

export function heal(w: World, target: Entity, amount: number, sourceId: number, cause: number): void {
  if (target.kind !== 'char' || target.state !== 'active') return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const done = target.hp - before;
  if (done > 0) {
    emit(w, 'heal', sourceId, target.id, done, '', cause);
    const src = get(w, sourceId);
    if (src) src.counters.healing += done;
  }
}

export function registerFoul(w: World, offender: Entity, points: number, cause: number): void {
  const ref = get(w, w.refereeId);
  if (!ref || ref.state !== 'active') return;
  const cha = offender.stats?.charisma ?? 5;
  const add = Math.max(10, idiv(points * 100 * (100 - 5 * Math.min(cha, 15)), 100));
  offender.fouls += add;
  offender.counters.fouls++;
  emit(w, 'foul', ref.id, offender.id, points, '', cause);
  if (offender.fouls >= 300) {
    offender.fouls = 0;
    offender.counters.cards++;
    const ev = emit(w, 'card', ref.id, offender.id, 0, 'yellow', cause);
    applyStatus(w, offender, 'status.lectured', undefined, ref.id, ev);
  }
}

// ---------------------------------------------------------------------------
// Statuses (02 §5.3)
// ---------------------------------------------------------------------------
export function applyStatus(w: World, target: Entity, statusId: string, duration: number | undefined, sourceId: number, cause: number): boolean {
  if (target.removed || target.state === 'ko') return false;
  const def = w.content.statuses.get(statusId);
  if (!def) return false;
  if (target.immune.includes(statusId)) return false;
  if (target.kind === 'npc' && def.flags?.down) return false;
  const tags = tagsOf(w, target);
  if (def.blockedBy?.some((t) => tags.has(t))) return false;
  const dur = duration ?? def.durationTicks;
  const existing = target.statuses.find((s) => s.id === statusId);
  if (existing) {
    if (def.stacking === 'ignore') return false;
    if (def.stacking === 'refresh') existing.remaining = Math.max(existing.remaining, dur);
    else existing.remaining += dur;
    return true;
  }
  const ev = emit(w, 'statusApplied', sourceId, target.id, dur, statusId, cause);
  target.statuses.push({ id: statusId, remaining: dur, sourceId, cause: ev, age: 0 });
  target.tagsDirty = true;
  const src = get(w, sourceId);
  if (src?.kind === 'char') src.counters.statusCaused[statusId] = (src.counters.statusCaused[statusId] ?? 0) + 1;
  if (target.kind === 'char') target.counters.statusReceived[statusId] = (target.counters.statusReceived[statusId] ?? 0) + 1;
  if (def.flags?.down || def.flags?.noActions) {
    target.action = null;
    if (target.rideId >= 0) dismount(w, target);
  }
  if (def.flags?.down && target.kind === 'char') target.counters.knockdowns++;
  w.queue.push({ event: 'statusApplied', a: target.id, b: sourceId, status: statusId, cause: ev });
  for (const eff of def.onApply ?? []) applyEffect(w, eff, target, { sourceId, cause: ev, powerBp: 10000, scale: 'none' });
  return true;
}

export function removeStatus(w: World, target: Entity, statusId: string, cause: number): boolean {
  const i = target.statuses.findIndex((s) => s.id === statusId);
  if (i < 0) return false;
  target.statuses.splice(i, 1);
  target.tagsDirty = true;
  emit(w, 'statusExpired', -1, target.id, 0, statusId, cause);
  return true;
}

export function tickStatuses(w: World): void {
  for (const e of w.entities) {
    if (e.removed || e.statuses.length === 0) continue;
    for (let i = 0; i < e.statuses.length; i++) {
      const s = e.statuses[i]!;
      const def = w.content.statuses.get(s.id);
      s.age++;
      s.remaining--;
      if (def?.periodic && s.age % def.periodic.everyTicks === 0) {
        for (const eff of def.periodic.effects) applyEffect(w, eff, e, { sourceId: s.sourceId, cause: s.cause, powerBp: 10000, scale: 'none' });
      }
    }
    for (let i = e.statuses.length - 1; i >= 0; i--) {
      const s = e.statuses[i]!;
      if (s.remaining > 0 || e.removed) continue;
      e.statuses.splice(i, 1);
      e.tagsDirty = true;
      const ev = emit(w, 'statusExpired', -1, e.id, 0, s.id, s.cause);
      const def = w.content.statuses.get(s.id);
      for (const eff of def?.onExpire ?? []) applyEffect(w, eff, e, { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'none' });
      if (s.id === 'status.knocked-down') startCrawl(w, e, ev);
    }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export function breakProp(w: World, p: Entity, cause: number): void {
  if (p.removed) return;
  const def = w.content.props.get(p.def);
  const ev = emit(w, 'propBroken', p.lastHitBy, p.id, 0, p.def, cause);
  w.queue.push({ event: 'propBroken', a: p.id, b: p.lastHitBy, status: '', cause: ev });
  removeEntity(w, p);
  if (def?.onBreak) {
    for (const s of def.onBreak.spawn ?? []) {
      spawnProp(w, s, p.x + w.envRng.range(-200, 200), p.y + w.envRng.range(-200, 200), ev, p.id);
    }
    if (def.onBreak.effects) {
      const r = def.onBreak.radiusMm ?? 1500;
      for (const e of w.entities) {
        if (e.removed || e.kind === 'prop' || dist(e.x, e.y, p.x, p.y) > r + e.radius) continue;
        for (const eff of def.onBreak.effects) applyEffect(w, eff, e, { sourceId: p.lastHitBy, cause: ev, powerBp: 10000, scale: 'none' }, p);
      }
    }
  }
}

export function explode(w: World, p: Entity): void {
  const def = w.content.props.get(p.def)?.explode;
  if (!def || p.removed) return;
  const ev = emit(w, 'explosion', p.lastHitBy, p.id, def.radiusMm, p.def, p.lastCause);
  removeEntity(w, p);
  for (const e of w.entities) {
    if (e.removed || e.id === p.id) continue;
    if (e.kind === 'prop' && e.areaRadius > 0) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d > def.radiusMm + e.radius) continue;
    const ctx: EffectCtx = { sourceId: p.lastHitBy >= 0 ? p.lastHitBy : p.id, cause: ev, powerBp: 10000, scale: 'none' };
    for (const eff of def.effects) applyEffect(w, eff, e, ctx, p);
    if (def.forceMm > 0) push(w, e, p.x, p.y, idiv(def.forceMm * (def.radiusMm + e.radius - d), def.radiusMm + e.radius) + 200);
  }
}

export function dropHeld(w: World, e: Entity, cause: number): void {
  if (e.heldId < 0) return;
  const p = w.byId.get(e.heldId);
  e.heldId = -1;
  e.tagsDirty = true;
  if (!p) return;
  p.carriedBy = -1;
  p.z = 0;
  e.counters.drops++;
  emit(w, 'drop', e.id, p.id, 0, p.def, cause);
}

export function dismount(w: World, e: Entity): void {
  const p = w.byId.get(e.rideId);
  e.rideId = -1;
  if (p) p.riddenBy = -1;
}

/** Impulse away from (ox, oy). */
export function push(w: World, e: Entity, ox: number, oy: number, forceMm: number): void {
  if (e.removed) return;
  if (e.kind === 'prop' && w.content.props.get(e.def)?.anchored) return;
  if (e.kind === 'prop' && e.areaRadius > 0) return;
  let [dx, dy] = dir1000(e.x - ox, e.y - oy);
  if (dx === 0 && dy === 0) [dx, dy] = [e.fx, e.fy];
  // Heavier things move less; 75 kg is the reference.
  const massFactor = clamp(idiv(75000 * 1000, Math.max(5000, e.weightG)), 300, 3000);
  const impulse = idiv(idiv(forceMm, 8) * massFactor, 1000);
  e.vx += idiv(dx * impulse, 1000);
  e.vy += idiv(dy * impulse, 1000);
  if (e.z === 0) e.vz += Math.min(60, idiv(impulse, 4));
}

// ---------------------------------------------------------------------------
// Career banter (02 §8.5): specific career pairings trigger lines and reactions
// ---------------------------------------------------------------------------
function banter(w: World, src: Entity, target: Entity, cause: number): void {
  const aCareers = src.snap?.careers ?? [];
  const vCareers = target.snap?.careers ?? [];
  for (const ac of aCareers) {
    for (const sy of w.content.synergiesByAttacker.get(ac) ?? []) {
      if (!vCareers.includes(sy.victim)) continue;
      const key = `${sy.id}:${src.id}>${target.id}`;
      if ((w.banter.get(key) ?? 0) > w.tick) continue;
      if (!w.rng.chance(sy.chanceBp)) continue;
      w.banter.set(key, w.tick + 400);
      const speaker = sy.speaker === 'attacker' ? src : target;
      const other = speaker === src ? target : src;
      const line = w.rng.int(sy.lines.length);
      const ev = emit(w, 'banter', speaker.id, other.id, line, sy.id, cause);
      for (const eff of sy.effects ?? []) applyEffect(w, eff, speaker, { sourceId: other.id, cause: ev, powerBp: 10000, scale: 'none' });
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Grapples and throws (02 §5.6)
// ---------------------------------------------------------------------------
const GRAVITY = 12;

/**
 * Lift a character and throw them on a ballistic arc. They can't act while
 * airborne, take `landDamage` and fall over on landing, and bowl over anyone
 * they hit on the way (see physics contacts).
 */
export function toss(w: World, t: Entity, src: Entity | undefined, eff: Extract<Effect, { type: 'toss' }>, cause: number): void {
  if (t.kind === 'prop' || t.state !== 'active' || t.z > 0) return;
  const vz = isqrt(2 * GRAVITY * eff.heightMm);
  const flight = Math.max(4, idiv(2 * vz, GRAVITY));
  let [dx, dy] = src && src.id !== t.id ? dir1000(t.x - src.x, t.y - src.y) : [t.fx, t.fy];
  if (eff.direction === 'behind') [dx, dy] = [-dx, -dy];
  let distance = eff.distanceMm;
  // Throw them INTO someone: aim at the nearest other opponent of the thrower within reach.
  if (eff.direction === 'away' && src) {
    let best: Entity | null = null;
    let bestD = eff.distanceMm + 2000;
    for (const o of w.entities) {
      if (o.kind !== 'char' || o.id === t.id || o.team === src.team || o.state !== 'active') continue;
      const d = dist(t.x, t.y, o.x, o.y);
      if (d < bestD && d > 800) {
        bestD = d;
        best = o;
      }
    }
    if (best) {
      [dx, dy] = dir1000(best.x - t.x, best.y - t.y);
      distance = bestD + 400;
    }
  }
  const sp = eff.direction === 'up' ? 0 : idiv(distance, flight);
  // Over-the-shoulder throws start from the thrower's position.
  if (eff.direction === 'behind' && src) {
    t.x = src.x;
    t.y = src.y;
  }
  const ev = emit(w, 'grab', src?.id ?? -1, t.id, eff.heightMm, eff.direction, cause);
  dropHeld(w, t, ev);
  if (t.rideId >= 0) dismount(w, t);
  t.action = null;
  t.z = 1;
  t.vz = vz;
  t.vx = idiv(dx * sp, 1000);
  t.vy = idiv(dy * sp, 1000);
  t.tossedBy = src?.id ?? -1;
  t.tossLand = eff.landDamage;
  t.tossCause = ev;
  applyStatus(w, t, 'status.airborne', flight + 2, src?.id ?? -1, ev);
}

// ---------------------------------------------------------------------------
// Effect executor (the closed set from 01 §5.3)
// ---------------------------------------------------------------------------
export function applyEffect(w: World, eff: Effect, target: Entity, ctx: EffectCtx, origin?: Entity): void {
  if (eff.chanceBp !== undefined && !w.rng.chance(eff.chanceBp)) return;
  const src = get(w, ctx.sourceId) ?? w.byId.get(ctx.sourceId);
  const t = eff.toSelf && src ? src : target;
  if (t.removed) return;
  const statScale = (): number => {
    if (!src?.stats) return 10000;
    if (ctx.scale === 'melee') return derived.meleeMulBp(src.stats) + statusMod(w, src, 'damageDealtBp');
    if (ctx.scale === 'throw') return derived.throwMulBp(src.stats) + statusMod(w, src, 'damageDealtBp');
    if (ctx.scale === 'social') return derived.socialMulBp(src.stats);
    return 10000;
  };
  switch (eff.type) {
    case 'damage': {
      const amt = bpMul(bpMul(eff.amount, statScale()), ctx.powerBp);
      applyDamage(w, t, Math.max(1, amt), eff.damageType, ctx.sourceId, ctx.cause, ctx.scale !== 'none');
      break;
    }
    case 'heal': {
      const mul = src?.stats ? derived.effectMulBp(src.stats) : 10000;
      heal(w, t, bpMul(bpMul(eff.amount, mul), ctx.powerBp), ctx.sourceId, ctx.cause);
      break;
    }
    case 'applyStatus': {
      let dur = eff.durationTicks;
      if (dur !== undefined && src?.stats) dur = bpMul(dur, derived.effectMulBp(src.stats));
      applyStatus(w, t, eff.status, dur, ctx.sourceId, ctx.cause);
      break;
    }
    case 'removeStatus':
      removeStatus(w, t, eff.status, ctx.cause);
      break;
    case 'knockback': {
      const o = origin ?? src;
      if (o && o.id !== t.id) push(w, t, o.x, o.y, bpMul(eff.forceMm, ctx.powerBp));
      else push(w, t, t.x - t.fx, t.y - t.fy, eff.forceMm);
      break;
    }
    case 'knockdown':
      if (t.kind === 'char') {
        const standUp = t.stats ? derived.standUp(t.stats) : 30;
        applyStatus(w, t, 'status.knocked-down', standUp, ctx.sourceId, ctx.cause);
      }
      break;
    case 'spawnProp': {
      const at = eff.at === 'self' && src ? src : t;
      spawnProp(w, eff.prop, at.x + w.envRng.range(-150, 150), at.y + w.envRng.range(-150, 150), ctx.cause, ctx.sourceId);
      break;
    }
    case 'morale':
      if (t.kind === 'char') {
        const amt = eff.amount < 0 ? bpMul(eff.amount, statScale()) : eff.amount;
        t.morale = clamp(t.morale + amt, 0, 100);
      }
      break;
    case 'energy':
      if (t.kind === 'char') t.energy = clamp(t.energy + eff.amount * 100, 0, t.maxEnergy);
      break;
    case 'taunt':
      if (t.kind === 'char' && src && src.id !== t.id) {
        const conf = t.stats?.confidence ?? 5;
        // Confidence resists taunts.
        if (w.rng.chance(10000 - conf * 300)) {
          t.tauntedBy = src.id;
          t.tauntUntil = w.tick + eff.ticks;
          t.action = null;
          emit(w, 'taunt', src.id, t.id, eff.ticks, '', ctx.cause);
        }
      }
      break;
    case 'toss':
      toss(w, t, src, eff, ctx.cause);
      break;
    case 'pull': {
      const o = origin ?? src;
      if (o && o.id !== t.id) push(w, t, 2 * t.x - o.x, 2 * t.y - o.y, bpMul(eff.forceMm, ctx.powerBp));
      break;
    }
    case 'dash': {
      if (!src) break;
      const [dx, dy] = dir1000(t.x - src.x, t.y - src.y);
      const d = Math.min(eff.distanceMm, Math.max(0, dist(t.x, t.y, src.x, src.y) - src.radius - t.radius));
      src.vx += idiv(dx * idiv(d, 6), 1000);
      src.vy += idiv(dy * idiv(d, 6), 1000);
      break;
    }
    case 'breakProp':
      if (t.kind === 'prop') breakProp(w, t, ctx.cause);
      break;
    case 'dropHeld':
      dropHeld(w, t, ctx.cause);
      break;
  }
}
