import type { ArenaDef } from '@cc/content-schema';
import { clamp, idiv } from '../core/math';
import type { World } from '../types';
import { emit, removeEntity, spawnProp, tagsOf } from '../world';
import { applyEffect, explode } from './effects';

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
  if (action.effects) {
    for (const e of w.entities) {
      if (e.removed || e.kind === 'prop' || e.state === 'ko') continue;
      if (e.x < x || e.y < y || e.x > x + rw || e.y > y + rh) continue;
      for (const eff of action.effects) applyEffect(w, eff, e, { sourceId: -1, cause, powerBp: 10000, scale: 'none' });
    }
  }
}

/** Scheduled hazards and sudden death (02 §7.4, §10). */
export function scheduled(w: World): void {
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

/** Area growth/lifetime, fuses, explosion triggers, flying age. */
export function propsTick(w: World): void {
  for (const p of w.entities) {
    if (p.removed || p.kind !== 'prop') continue;
    p.age++;
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
