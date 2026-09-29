import { idiv } from '../core/math';
import type { Entity, World } from '../types';
import { emit, get, spawnProp } from '../world';
import { applyDamage, applyEffect } from './effects';
import { buildNav } from './nav';

/**
 * Destructible obstacles (02 §7.4b): shelves, desks, racks and kiosks take
 * damage from thrown bodies, flying props and explosions. At 0 they topple —
 * onto whichever side has more people — crushing anyone there and scattering
 * debris props. Broken obstacles stop blocking movement for the rest of the fight.
 */
const TOPPLE_REACH = 2200;
const CRUSH_DAMAGE = 16;

export function initWalls(w: World): void {
  w.wallMaxHp = w.arena.walls.map(([, , ww, hh]) => (ww * hh > 3_000_000 ? 170 : 120));
  w.wallHp = [...w.wallMaxHp];
  w.wallBroken = w.wallMaxHp.map(() => false);
}

export function damageWall(w: World, idx: number, amount: number, src: number, cause: number): void {
  if (idx < 0 || w.wallBroken[idx] || amount <= 0) return;
  w.wallHp[idx] = Math.max(0, w.wallHp[idx]! - amount);
  const ev = emit(w, 'wallHit', src, idx, amount, '', cause);
  if (w.wallHp[idx] === 0) topple(w, idx, src, ev);
}

function charsIn(w: World, x0: number, y0: number, x1: number, y1: number): Entity[] {
  return w.entities.filter((e) => e.kind === 'char' && !e.removed && e.state !== 'ko' && e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1);
}

function topple(w: World, idx: number, src: number, cause: number): void {
  w.wallBroken[idx] = true;
  const [x, y, ww, hh] = w.arena.walls[idx]!;
  // Fall towards the side with more people on it (towards the camera on a tie).
  const back = charsIn(w, x - 300, y - TOPPLE_REACH, x + ww + 300, y);
  const front = charsIn(w, x - 300, y + hh, x + ww + 300, y + hh + TOPPLE_REACH);
  const dir = back.length > front.length ? -1 : 1;
  const ev = emit(w, 'wallBroken', src, idx, dir, '', cause);
  for (const e of dir > 0 ? front : back) {
    applyDamage(w, e, CRUSH_DAMAGE, 'blunt', src >= 0 ? src : -1, ev, false);
    applyEffect(w, { type: 'knockdown' }, e, { sourceId: src, cause: ev, powerBp: 10000, scale: 'none' });
  }
  // Scatter what was on it.
  const debris = w.arena.debris ?? [];
  for (let i = 0; i < Math.min(3, debris.length * 2); i++) {
    const px = x + idiv(ww * (1 + i * 2), 6);
    const py = dir > 0 ? y + hh + 500 + i * 250 : y - 500 - i * 250;
    spawnProp(w, debris[w.envRng.int(debris.length)]!, px, py, ev, -1);
  }
  w.nav = buildNav({ ...w.arena, walls: activeWalls(w) });
}

export function activeWalls(w: World): [number, number, number, number][] {
  return (w.arena.walls as [number, number, number, number][]).filter((_, i) => !w.wallBroken[i]);
}

/** Something slammed into wall `idx` at speed: work out how hard, and hurt the wall (and a flying body). */
export function wallImpact(w: World, e: Entity, idx: number, speed: number): void {
  if (idx < 0 || w.wallBroken[idx]) return;
  if ((e.cooldowns['wall'] ?? 0) > w.tick) return;
  if (e.kind === 'char') {
    const thrown = e.tossedBy >= 0 || e.z > 0;
    if (!thrown && speed < 110) return;
    e.cooldowns['wall'] = w.tick + 10;
    const src = e.tossedBy >= 0 ? e.tossedBy : e.lastHitBy;
    damageWall(w, idx, thrown ? 30 : 12, src, e.tossCause >= 0 ? e.tossCause : e.lastCause);
    if (!e.removed && e.state === 'active') applyDamage(w, e, thrown ? 8 : 4, 'blunt', src, e.lastCause, false);
    return;
  }
  if (e.kind === 'prop' && e.flying) {
    e.cooldowns['wall'] = w.tick + 10;
    const def = w.content.props.get(e.def);
    const thrower = get(w, e.thrownBy);
    damageWall(w, idx, Math.max(6, (def?.throwDamage ?? idiv(e.weightG, 1000)) * 2), thrower?.id ?? -1, e.flightCause);
  }
}

/** Explosions damage every obstacle in range. */
export function explosionHitsWalls(w: World, x: number, y: number, radius: number, src: number, cause: number): void {
  w.arena.walls.forEach(([wx, wy, ww, wh], i) => {
    const cx = Math.max(wx, Math.min(x, wx + ww));
    const cy = Math.max(wy, Math.min(y, wy + wh));
    if ((cx - x) * (cx - x) + (cy - y) * (cy - y) <= radius * radius) damageWall(w, i, 45, src, cause);
  });
}
