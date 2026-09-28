import { clamp, dist } from '../core/math';
import type { World } from '../types';
import { derived, emit } from '../world';
import { dropHeld, knockOut } from './effects';

/** Energy regen, morale drift and panic, downed timers (02 §5.4–5.5). */
export function resources(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || e.removed || e.state === 'ko') continue;
    if (e.state === 'downed') {
      e.downTimer--;
      if (e.downTimer <= 0) knockOut(w, e, e.lastHitBy, e.lastCause);
      continue;
    }
    e.energy = Math.min(e.maxEnergy, e.energy + derived.regen(e.stats!));
    if ((w.tick + e.id) % 20 === 0) {
      let alone = true;
      for (const o of w.entities) {
        if (o.kind === 'char' && o.team === e.team && o.id !== e.id && o.state === 'active' && dist(o.x, o.y, e.x, e.y) < 5000) {
          alone = false;
          break;
        }
      }
      if (alone && w.mode !== 'ffa') e.morale -= 1;
      else if (e.morale < 50) e.morale += 1;
      e.morale = clamp(Math.max(e.morale, e.moraleFloor), 0, 100);
    }
    if (!e.panicking && e.morale < 10) {
      e.panicking = true;
      e.action = null;
      emit(w, 'panic', e.id, -1, e.morale, '', e.lastCause);
      dropHeld(w, e, e.lastCause);
    } else if (e.panicking && e.morale >= 25) {
      e.panicking = false;
    }
  }
}
