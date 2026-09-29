import type { AttackDef, PropDef } from '@cc/content-schema';
import { bpMul, clamp, dir1000, dist, idiv } from '../core/math';
import type { Entity, World } from '../types';
import { emit, get, SHOVE, spawnProp, tagsOf } from '../world';
import { applyStatus, dropHeld, removeStatus } from './effects';

/**
 * What's in a fighter's hands (02 §5.2c):
 * - their career weapon (one-handed equipment), which a hard hit can knock
 *   out of their hands onto the floor — anyone with free hands can grab it;
 * - a carried throwable, which doubles as a clumsy club (weaker than a weapon);
 * - a two-handed heavy weapon (sledgehammer, road sign...), only for empty
 *   hands: slow, sends people flying, breaks after a few swings;
 * - nothing: bare-hand shoves are weak, but an unarmed fighter can put
 *   someone in a choke hold.
 */
export const DROPPED_WEAPON = 'prop.weapon';

export function heldProp(w: World, e: Entity): { p: Entity; def: PropDef } | null {
  if (e.heldId < 0) return null;
  const p = get(w, e.heldId);
  const def = p ? w.content.props.get(p.def) : undefined;
  return p && def ? { p, def } : null;
}

export function heavyOf(w: World, e: Entity): PropDef['heavy'] | undefined {
  return heldProp(w, e)?.def.heavy;
}

export function emptyHanded(e: Entity): boolean {
  return e.weapon === '' && e.heldId < 0;
}

/** A throwable swung as a club: a bit better than a shove, clearly worse than a real weapon. */
function improvised(def: PropDef): AttackDef {
  return { base: clamp(idiv((def.throwDamage ?? 8) * 6, 10), 6, 9), rangeMm: 1100, windupTicks: 8, recoverTicks: 12, knockbackMm: 600, damageType: 'blunt' };
}

/** Recompute the basic attack from what's in hand. */
export function rearm(w: World, e: Entity): void {
  if (e.kind !== 'char') return;
  const h = heldProp(w, e);
  if (h?.def.heavy) e.attack = h.def.heavy.attack;
  else if (h) e.attack = improvised(h.def);
  else if (e.weapon) e.attack = w.content.equipment.get(e.weapon)?.attack ?? SHOVE;
  else e.attack = SHOVE;
}

/** Knock everything out of a character's hands, scattering it away from (ox, oy). */
export function disarm(w: World, t: Entity, ox: number, oy: number, cause: number): void {
  if (t.kind !== 'char') return;
  const had = t.heldId >= 0 || t.weapon !== '';
  if (!had) return;
  const [dx, dy] = dir1000(t.x - ox, t.y - oy);
  const ev = emit(w, 'disarm', get(w, t.lastHitBy)?.id ?? -1, t.id, 0, t.weapon || (heldProp(w, t)?.p.def ?? ''), cause);
  const prop = heldProp(w, t)?.p;
  dropHeld(w, t, ev);
  if (prop) {
    prop.vx = idiv(dx * 90, 1000);
    prop.vy = idiv(dy * 90, 1000);
  }
  if (t.weapon) {
    const p = spawnProp(w, DROPPED_WEAPON, t.x + idiv(dx * 500, 1000), t.y + idiv(dy * 500, 1000), ev, t.id);
    if (p) {
      p.weapon = t.weapon;
      p.vx = idiv(dx * 120, 1000);
      p.vy = idiv(dy * 120, 1000);
      p.vz = 40;
    }
    t.weapon = '';
  }
  rearm(w, t);
}

/**
 * A hard hit or a big shove may knock things out of someone's hands.
 * `severity` ≈ percent of max HP lost + knockback in 100 mm units.
 */
export function maybeDisarm(w: World, t: Entity, severity: number, ox: number, oy: number, cause: number): void {
  if (t.kind !== 'char' || t.state !== 'active' || (t.heldId < 0 && t.weapon === '')) return;
  const grip = (t.stats?.strength ?? 5) * 250;
  const chance = clamp((severity - 11) * 450 - grip, 0, 7000);
  if (chance > 0 && w.rng.chance(chance)) disarm(w, t, ox, oy, cause);
}

/** Pick up a loose weapon / heavy weapon; returns false if it wasn't one. */
export function takeWeapon(w: World, e: Entity, p: Entity): boolean {
  if (p.def === DROPPED_WEAPON) {
    if (e.weapon !== '' || !p.weapon) return true;
    e.weapon = p.weapon;
    emit(w, 'pickUp', e.id, p.id, 1, p.weapon, -1);
    p.removed = true;
    rearm(w, e);
    return true;
  }
  const def = w.content.props.get(p.def);
  if (!def?.heavy) return false;
  if (!emptyHanded(e)) return true;
  p.carriedBy = e.id;
  p.vx = p.vy = p.vz = 0;
  if (p.uses <= 1) p.uses = def.heavy.swings;
  e.heldId = p.id;
  e.tagsDirty = true;
  emit(w, 'pickUp', e.id, p.id, 2, p.def, -1);
  rearm(w, e);
  return true;
}

/** After a heavy swing: wear it down; it breaks after its last swing. */
export function wearHeavy(w: World, e: Entity, cause: number): void {
  const h = heldProp(w, e);
  if (!h?.def.heavy) return;
  h.p.uses--;
  if (h.p.uses <= 0) {
    emit(w, 'propBroken', e.id, h.p.id, 0, h.p.def, cause);
    h.p.removed = true;
    e.heldId = -1;
    e.tagsDirty = true;
    rearm(w, e);
  }
}

// ---------------------------------------------------------------------------
// Choke holds
// ---------------------------------------------------------------------------
/** Chance (bp) that an unarmed attack becomes a choke hold. */
export function chokeChance(w: World, e: Entity, t: Entity): number {
  if (!emptyHanded(e) || t.kind !== 'char' || t.state !== 'active' || e.chokeId >= 0) return 0;
  if (t.statuses.some((s) => s.id === 'status.choked')) return 0;
  const tags = tagsOf(w, t);
  let c = 1200 + ((e.stats?.strength ?? 5) - 5) * 300;
  if (tags.has('state:stunned') || tags.has('state:crawling') || tags.has('state:prone')) c += 4000;
  // From behind: the target is facing away from us.
  if ((e.x - t.x) * t.fx + (e.y - t.y) * t.fy < 0) c += 2500;
  return clamp(c, 0, 8000);
}

export function startChoke(w: World, e: Entity, t: Entity, cause: number): void {
  const ticks = 30 + (e.stats?.strength ?? 5) * 3;
  const ev = emit(w, 'choke', e.id, t.id, ticks, '', cause);
  e.chokeId = t.id;
  applyStatus(w, t, 'status.choked', ticks, e.id, ev);
  applyStatus(w, e, 'status.choking', ticks, e.id, ev);
  e.action = null;
  t.action = null;
}

export function releaseChoke(w: World, e: Entity, cause: number): void {
  const t = get(w, e.chokeId);
  e.chokeId = -1;
  removeStatus(w, e, 'status.choking', cause);
  if (t) removeStatus(w, t, 'status.choked', cause);
}

/** Keep choke holds going: hold the victim close; they may wriggle free; it ends when either is out. */
export function chokes(w: World): void {
  for (const e of w.entities) {
    if (e.chokeId < 0) continue;
    const t = get(w, e.chokeId);
    const holding = e.statuses.some((s) => s.id === 'status.choking');
    if (!t || !holding || e.state !== 'active' || t.state !== 'active' || dist(e.x, e.y, t.x, t.y) > 1400) {
      releaseChoke(w, e, -1);
      continue;
    }
    // Pull the victim in front of the choker.
    const tx = e.x + idiv(e.fx * 550, 1000);
    const ty = e.y + idiv(e.fy * 550, 1000);
    t.vx = idiv(tx - t.x, 3);
    t.vy = idiv(ty - t.y, 3);
    if (w.tick % 5 === 0) {
      const breakFree = clamp(300 + ((t.stats?.strength ?? 5) - (e.stats?.strength ?? 5)) * 250 + (t.stats?.strength ?? 5) * 60, 100, 3000);
      if (w.rng.chance(breakFree)) releaseChoke(w, e, -1);
    }
  }
}

/** Heavy weapons slow their carrier down. */
export function heavySlow(w: World, e: Entity, speed: number): number {
  const h = heavyOf(w, e);
  return h ? bpMul(speed, 10000 - h.slowBp) : speed;
}
