import type { ArenaDef } from '@cc/content-schema';
import { clamp, dir1000, dist, idiv } from '../core/math';
import type { Entity, World } from '../types';
import { emit, removeEntity, spawnProp, tagsOf } from '../world';
import { applyEffect, applyStatus, explode, toss } from './effects';

type HazardAction = ArenaDef['hazards'][number]['action'];

function runAction(w: World, action: HazardAction, region: [number, number, number, number], cause: number, count: number): void {
  const [x, y, rw, rh] = region;
  if (action.spawn) {
    for (let i = 0; i < action.spawn.count * count; i++) {
      const px = x + w.envRng.int(Math.max(1, rw));
      const py = y + w.envRng.int(Math.max(1, rh));
      const p = spawnProp(w, action.spawn.prop, px, py, cause, -1);
      if (p && action.spawn.dropFromMm) {
        p.z = action.spawn.dropFromMm;
        p.flying = true;
        p.flightCause = cause;
        p.age = 0;
      }
    }
  }
  if (action.wind) {
    // Gusts are temporary belts; drop the ones that have blown over.
    w.belts = w.belts.filter((b) => b.until === undefined || b.until > w.tick);
    w.belts.unshift({ rect: [x, y, rw, rh], vx: action.wind.vx, vy: action.wind.vy, until: w.tick + action.wind.ticks });
  }
  if (action.spin || action.trapdoor) {
    const cx = x + idiv(rw, 2);
    const cy = y + idiv(rh, 2);
    const ffa = w.arena.spawns.ffa;
    for (const e of w.entities) {
      if (e.removed || e.kind !== 'char' || e.state !== 'active' || e.z > 0 || e.summonOf >= 0) continue;
      if (e.x < x || e.y < y || e.x > x + rw || e.y > y + rh) continue;
      if (action.spin) {
        // Flung out of the door, away from its middle.
        const [dx, dy] = e.x === cx && e.y === cy ? [1000, 0] : dir1000(e.x - cx, e.y - cy);
        e.fx = dx;
        e.fy = dy;
        toss(w, e, undefined, { type: 'toss', direction: 'away', ...action.spin }, cause);
      } else if (action.trapdoor) {
        // Through the floor, and up somewhere else a moment later, seeing stars.
        const [sx, sy] = ffa[w.envRng.int(ffa.length)]!;
        e.x = sx;
        e.y = sy;
        e.vx = 0;
        e.vy = 0;
        applyStatus(w, e, 'status.stunned', action.trapdoor.stunTicks, -1, cause);
        emit(w, 'landed', -1, e.id, 0, 'trapdoor', cause);
      }
    }
  }
  if (action.effects) {
    for (const e of w.entities) {
      if (e.removed || e.kind === 'prop' || e.state === 'ko') continue;
      if (e.x < x || e.y < y || e.x > x + rw || e.y > y + rh) continue;
      for (const eff of action.effects) applyEffect(w, eff, e, { sourceId: -1, cause, powerBp: 10000, scale: 'none' });
    }
  }
}

function spawnMover(w: World, prop: string, path: [number, number][], speedMm: number, loop: boolean, cause: number): void {
  const [x0, y0] = path[0]!;
  const p = spawnProp(w, prop, x0, y0, cause, -1);
  if (!p) return;
  p.moverPath = path.flatMap(([x, y]) => [x, y]);
  p.moverIdx = 1;
  p.moverSpeed = speedMm;
  p.moverLoop = loop;
}

/** Scheduled hazards, patrolling machines and sudden death (02 §7.4, §10). */
export function scheduled(w: World): void {
  for (const m of w.arena.movers ?? []) {
    if (m.telegraphTicks > 0 && w.tick === m.startTick - m.telegraphTicks) emit(w, 'hazardWarn', -1, -1, m.telegraphTicks, m.id);
    if (w.tick !== m.startTick) continue;
    const ev = emit(w, 'hazardStart', -1, -1, 0, m.id);
    spawnMover(w, m.prop, m.path, m.speedMm, m.loop, ev);
  }
  // Endless floors (08 §6): the candle's scene events.
  for (const e of w.input.endless?.events ?? []) {
    if (e.telegraphTicks > 0 && w.tick === e.tick - e.telegraphTicks) emit(w, 'hazardWarn', -1, -1, e.telegraphTicks, e.id);
    if (w.tick !== e.tick) continue;
    const ev = emit(w, 'hazardStart', -1, -1, 0, e.id);
    if (e.mover) spawnMover(w, e.mover.prop, e.mover.path, e.mover.speedMm, false, ev);
    if (e.action) runAction(w, e.action, e.region, ev, 1);
  }
  w.arena.hazards.forEach((h, i) => {
    const next = w.hazardNext[i]!;
    if (w.tick === next - h.telegraphTicks && h.telegraphTicks > 0) emit(w, 'hazardWarn', -1, -1, h.telegraphTicks, h.id);
    if (w.tick === next) {
      const ev = emit(w, 'hazardStart', -1, -1, 0, h.id);
      runAction(w, h.action, h.region, ev, 1);
      w.hazardNext[i] = next + h.everyTicks;
    }
  });
  if (w.tick >= w.suddenDeathTick) {
    const sd = w.arena.suddenDeath;
    const since = w.tick - w.suddenDeathTick;
    if (since % sd.everyTicks === 0) {
      const wave = 1 + idiv(since, sd.everyTicks);
      const ev = emit(w, 'suddenDeath', -1, -1, wave, w.arena.id);
      runAction(w, sd.action, sd.region, ev, clamp(wave, 1, 4));
    }
  }
}

/** Move patrolling machines along their paths, leaving trails. */
function moveMover(w: World, p: Entity): void {
  const n = p.moverPath.length / 2;
  if (p.moverIdx >= n) {
    if (!p.moverLoop) return removeEntity(w, p);
    p.moverIdx = 0;
  }
  const tx = p.moverPath[p.moverIdx * 2]!;
  const ty = p.moverPath[p.moverIdx * 2 + 1]!;
  const d = dist(p.x, p.y, tx, ty);
  if (d <= p.moverSpeed) {
    p.x = tx;
    p.y = ty;
    p.moverIdx++;
  } else {
    const [dx, dy] = dir1000(tx - p.x, ty - p.y);
    p.x += idiv(dx * p.moverSpeed, 1000);
    p.y += idiv(dy * p.moverSpeed, 1000);
    p.fx = dx;
    p.fy = dy;
  }
  const m = w.content.props.get(p.def)?.mover;
  if (m?.trail && m.trailEveryTicks && p.age % m.trailEveryTicks === 0) spawnProp(w, m.trail, p.x - idiv(p.fx * p.radius, 1000), p.y - idiv(p.fy * p.radius, 1000), -1, p.id);
}

/** Area growth/lifetime, fuses, explosion triggers, flying age, movers. */
export function propsTick(w: World): void {
  for (const p of w.entities) {
    if (p.removed || p.kind !== 'prop') continue;
    p.age++;
    if (p.moverSpeed > 0) moveMover(w, p);
    const def = w.content.props.get(p.def);
    if (!def) continue;
    if (def.area) {
      if (p.areaRadius < def.area.maxRadiusMm) p.areaRadius = Math.min(def.area.maxRadiusMm, p.areaRadius + def.area.growMmPerTick);
      if (def.area.lifetimeTicks > 0 && p.age >= def.area.lifetimeTicks) removeEntity(w, p);
      continue;
    }
    if (def.explode) {
      if (p.fuse < 0) {
        const t = tagsOf(w, p);
        if (def.explode.triggerTags.some((x) => t.has(x))) {
          p.fuse = def.explode.fuseTicks;
          const st = p.statuses[0];
          if (st) {
            p.lastHitBy = p.lastHitBy >= 0 ? p.lastHitBy : st.sourceId;
            p.lastCause = st.cause;
          }
        }
      } else if (p.fuse-- <= 0) {
        explode(w, p);
      }
    }
  }
}
