import { clamp, dist } from '../core/math';
import type { World } from '../types';
import { derived, emit, isSummon } from '../world';
import { applyEffect, dropHeld, knockOut } from './effects';

/** Energy regen, morale drift and panic, downed timers (02 §5.4–5.5). */
export function resources(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || e.removed || e.state === 'ko' || isSummon(e)) continue;
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

/**
 * Shop consumables (03 §3.6): each fires once — at kick-off, or the first time
 * its owner drops below the item's HP threshold.
 */
export function useConsumables(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || e.removed || e.state !== 'active' || e.consumables.length === 0) continue;
    for (let i = e.consumables.length - 1; i >= 0; i--) {
      const item = w.content.shopItems.get(e.consumables[i]!);
      const trig = item?.trigger;
      if (!item || !trig) continue;
      const fire = trig.when === 'start' ? w.tick === 2 : e.hp * 10000 < e.maxHp * (trig.hpBp ?? 5000);
      if (!fire) continue;
      e.consumables.splice(i, 1);
      const ev = emit(w, 'consume', e.id, e.id, trig.when === 'start' ? 0 : 1, item.id, -1);
      for (const eff of item.effects ?? []) applyEffect(w, eff, e, { sourceId: e.id, cause: ev, powerBp: 10000, scale: 'none' });
    }
  }
}
