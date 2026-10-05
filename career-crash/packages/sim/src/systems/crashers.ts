import { clamp, idiv } from '../core/math';
import type { World } from '../types';
import { emit, isFighter, spawnCharacter } from '../world';
import { isBlockedAt } from './nav';

/** How far apart the gatecrashers come in, side by side (mm). */
const SPREAD = 1800;

/** Each real side still has at least `minActiveBp` of its fighters standing: the fight is well open. */
function fightIsOpen(w: World, minActiveBp: number): boolean {
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
  if (!c || w.crashed || w.tick < c.tick || w.tick > c.until || !c.characters.length) return;
  if (!fightIsOpen(w, c.minActiveBp)) return;
  w.crashed = true;
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
  });
  emit(w, 'crash', ids[0]!, -1, n, c.set);
}
