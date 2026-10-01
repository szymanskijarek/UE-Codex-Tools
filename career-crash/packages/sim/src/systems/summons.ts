import type { SummonDef } from '@cc/content-schema';
import { clamp, DIRS8, dist, idiv } from '../core/math';
import type { Entity, World } from '../types';
import { emit, isFighter, isSummon, removeEntity, spawnSummonEntity, tagsOf } from '../world';
import { isBlockedAt } from './nav';
import { applyEffect, applyStatus, dropHeld } from './effects';

/**
 * Summoned critters (05 §3–4). Rabbits, geese, interns: weak, short-lived
 * characters that distract rather than damage. This module spawns them,
 * decides where they go (one of five behaviours), applies what they do by
 * touch or aura, turns them into panic for fighters who fear them, and sends
 * them off when they're beaten, their time is up or their summoner is out.
 */
export const MAX_PER_SUMMONER = 4;
export const MAX_PER_TEAM = 6;
/** Fear: how close a scary critter has to be, and the chance per second to spook someone who fears it. */
const FEAR_RADIUS = 2500;
const FEAR_CHANCE_BP = 3500;
const COWARD_FEAR_CHANCE_BP = 1800;
const SPOOK_TICKS = 50;

/** Counts towards the fear traits (Ailurophobe, Pigeon PTSD, Stage Fright): pestered or spooked by a critter of that group. */
function bumpScared(x: Entity, fear: string): void {
  const k = `scaredBy:${fear}`;
  x.counters.statusReceived[k] = (x.counters.statusReceived[k] ?? 0) + 1;
}

function summonsOf(w: World, owner: Entity): Entity[] {
  return w.entities.filter((e) => !e.removed && e.summonOf === owner.id);
}

/** Animals leave animal lovers alone (and don't scare them). */
function ignores(w: World, critter: Entity, fighter: Entity): boolean {
  return critter.baseTags.includes('summon:animal') && tagsOf(w, fighter).has('animal-friend');
}

/** How many more critters `owner` may summon right now. */
export function summonRoom(w: World, owner: Entity): number {
  const team = w.entities.filter((e) => !e.removed && isSummon(e) && e.team === owner.team).length;
  return Math.max(0, Math.min(MAX_PER_SUMMONER - summonsOf(w, owner).length, MAX_PER_TEAM - team));
}

export function summon(w: World, owner: Entity, def: SummonDef, count: number, cause: number): void {
  if (!isFighter(owner) || owner.state !== 'active') return;
  const n = Math.min(count, summonRoom(w, owner));
  if (n <= 0) {
    // At the cap: the ones already out stay longer instead.
    for (const m of summonsOf(w, owner)) if (m.summonDef === def.id) m.expires = w.tick + def.lifetimeTicks;
    return;
  }
  for (let i = 0; i < n; i++) {
    const [dx, dy] = DIRS8[(i * 3 + w.tick) % 8]!;
    let x = owner.x + idiv(dx * 900, 1000);
    let y = owner.y + idiv(dy * 900, 1000);
    const [W, H] = w.arena.sizeMm;
    x = clamp(x, 600, W - 600);
    y = clamp(y, 600, H - 600);
    if (isBlockedAt(w.nav, x, y)) [x, y] = [owner.x, owner.y];
    const e = spawnSummonEntity(w, def, owner, x, y);
    if (e) emit(w, 'summon', owner.id, e.id, 0, def.id, cause);
  }
}

/** A critter leaves the fight: beaten (it may pop), or just gone. */
export function summonGone(w: World, e: Entity, by: number, beaten: boolean): void {
  if (e.removed) return;
  const def = w.content.summons.get(e.summonDef);
  e.hp = 0;
  e.state = 'ko';
  e.action = null;
  const ev = emit(w, 'summonGone', e.id, by, beaten ? 1 : 0, e.summonDef, e.lastCause);
  if (beaten && def?.pop) {
    for (const x of w.entities) {
      if (x.removed || !isFighter(x) || x.team === e.team || x.state !== 'active') continue;
      if (dist(x.x, x.y, e.x, e.y) > def.pop.radiusMm + x.radius) continue;
      for (const eff of def.pop.effects) applyEffect(w, eff, x, { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'none' });
    }
  }
  if (e.heldId >= 0) dropHeld(w, e, ev);
  removeEntity(w, e);
}

function enemiesOf(w: World, e: Entity): Entity[] {
  return w.entities
    .filter((x) => !x.removed && isFighter(x) && x.team !== e.team && x.state === 'active' && !ignores(w, e, x))
    .map((x) => ({ x, d: dist(e.x, e.y, x.x, x.y) }))
    .sort((p, q) => p.d - q.d || p.x.id - q.x.id)
    .map((p) => p.x);
}

/** Where a critter goes next (called from decide, instead of the fighters' utility AI). */
export function summonDecide(w: World, e: Entity): void {
  const def = w.content.summons.get(e.summonDef);
  if (!def) return;
  const owner = w.byId.get(e.summonOf);
  const foes = enemiesOf(w, e);
  const near = foes[0];
  const jitter = (r: number): number => w.aiRng.range(-r, r);
  let tx = e.x + jitter(2500);
  let ty = e.y + jitter(2500);
  let hold = 10;
  switch (def.behaviour) {
    case 'scatter': {
      // Zig-zag through the other side: a random one of the three closest enemies, overshooting.
      const t = foes.length ? foes[w.aiRng.int(Math.min(3, foes.length))]! : undefined;
      if (t) {
        tx = t.x + jitter(1800);
        ty = t.y + jitter(1800);
      }
      hold = 8;
      break;
    }
    case 'pester': {
      // Stick to one victim: the current one while they're up, else the nearest.
      const cur = e.action?.targetId ?? -1;
      const keep = foes.find((x) => x.id === cur);
      const t = keep ?? near;
      if (t) {
        e.action = { kind: 'reposition', targetId: t.id, tx: t.x, ty: t.y, abilityId: '', phase: 'approach', timer: 0, goal: 'damage', expires: w.tick + 12 };
        e.decideAt = w.tick + 6;
        return;
      }
      break;
    }
    case 'decoy':
    case 'entourage': {
      // Stay close to the summoner (decoys a little further out, in the way).
      if (owner && !owner.removed) {
        const r = def.behaviour === 'decoy' ? 1800 : 1100;
        const [dx, dy] = DIRS8[(e.id + idiv(w.tick, 40)) % 8]!;
        tx = owner.x + idiv(dx * r, 1000);
        ty = owner.y + idiv(dy * r, 1000);
        if (def.behaviour === 'decoy' && near && dist(owner.x, owner.y, near.x, near.y) < 6000) {
          // Step between the summoner and the nearest threat.
          tx = idiv(owner.x + near.x, 2);
          ty = idiv(owner.y + near.y, 2);
        }
      }
      hold = 14;
      break;
    }
    case 'aura': {
      if (near) {
        tx = near.x + jitter(700);
        ty = near.y + jitter(700);
      }
      hold = 10;
      break;
    }
  }
  const [W, H] = w.arena.sizeMm;
  tx = clamp(tx, 500, W - 500);
  ty = clamp(ty, 500, H - 500);
  e.action = { kind: 'wander', targetId: -1, tx, ty, abilityId: '', phase: 'approach', timer: 0, goal: 'loot', expires: w.tick + hold };
  e.decideAt = w.tick + hold;
}

/** Lifetimes, touches, auras and fear, once per tick. */
export function summonsTick(w: World): void {
  for (const e of w.entities) {
    if (e.removed || !isSummon(e) || e.state === 'ko') continue;
    const owner = w.byId.get(e.summonOf);
    if (w.tick >= e.expires || !owner || owner.removed || owner.state === 'ko') {
      summonGone(w, e, -1, false);
      continue;
    }
    const def = w.content.summons.get(e.summonDef);
    if (!def) continue;
    // Touch: nip, pinch, trip or steal from an enemy within reach.
    if (def.touch && w.tick >= e.touchAt) {
      const t = enemiesOf(w, e)[0];
      if (t && dist(e.x, e.y, t.x, t.y) <= e.radius + t.radius + 250) {
        const ev = emit(w, 'attack', e.id, t.id, 0, e.summonDef, -1);
        for (const eff of def.touch.effects) applyEffect(w, eff, t, { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'none' });
        if (def.scares) bumpScared(t, def.scares);
        e.touchAt = w.tick + def.touch.everyTicks;
      }
    }
    // Auras.
    for (const a of def.aura ?? []) {
      if ((w.tick + e.id) % a.everyTicks !== 0) continue;
      for (const x of w.entities) {
        if (x.removed || !isFighter(x) || x.state !== 'active') continue;
        if (a.affects === 'enemies' ? x.team === e.team || ignores(w, e, x) : x.team !== e.team) continue;
        if (dist(x.x, x.y, e.x, e.y) > a.radiusMm + x.radius) continue;
        for (const eff of a.effects) applyEffect(w, eff, x, { sourceId: e.id, cause: -1, powerBp: 10000, scale: 'none' });
      }
    }
    // Fear: once a second, fighters who fear this critter may be spooked into running.
    if (def.scares && (w.tick + e.id) % 20 === 0) {
      for (const x of w.entities) {
        if (x.removed || !isFighter(x) || x.team === e.team || x.state !== 'active' || ignores(w, e, x)) continue;
        if (dist(x.x, x.y, e.x, e.y) > FEAR_RADIUS) continue;
        if (x.statuses.some((s) => s.id === 'status.spooked')) continue;
        const chance = tagsOf(w, x).has(def.scares) ? FEAR_CHANCE_BP : x.snap?.personality === 'personality.coward' ? COWARD_FEAR_CHANCE_BP : 0;
        if (!chance || !w.rng.chance(chance)) continue;
        bumpScared(x, def.scares);
        const ev = emit(w, 'panic', x.id, e.id, x.morale, def.scares, -1);
        applyStatus(w, x, 'status.spooked', SPOOK_TICKS, e.id, ev);
        x.morale = clamp(x.morale - 10, 0, 100);
        dropHeld(w, x, ev);
        x.action = null;
      }
    }
  }
}
