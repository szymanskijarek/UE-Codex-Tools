import type { RuleDef } from '@cc/content-schema';
import type { Entity, RuleQueueItem, World } from '../types';
import { emit, get, hasBit, tagsOf } from '../world';
import { applyEffect, matchTags } from './effects';

const MAX_ROUNDS = 3;
const SYMMETRIC = new Set(['contact', 'touching']);

function tryRule(w: World, rule: RuleDef, item: RuleQueueItem, a: Entity, b: Entity | undefined): boolean {
  if (rule.when.status && rule.when.status !== item.status) return false;
  if (!matchTags(w, a, rule.when.a)) return false;
  if (rule.when.b) {
    if (!b || !matchTags(w, b, rule.when.b)) return false;
  }
  const key = `${rule.id}:${a.id}:${b?.id ?? -1}`;
  if (w.firedThisTick.has(key)) return false;
  if (rule.when.chanceBp !== undefined && !w.rng.chance(rule.when.chanceBp)) return false;
  w.firedThisTick.add(key);
  const ev = emit(w, 'ruleFired', a.id, b?.id ?? -1, 0, rule.id, item.cause);
  for (const step of rule.then) {
    const target = step.target === 'a' ? a : b;
    if (!target || target.removed) continue;
    const other = step.target === 'a' ? b : a;
    // The "source" of a rule effect is whoever is responsible for the other party, for attribution.
    const responsible = other ? (other.kind === 'char' ? other.id : other.lastHitBy >= 0 ? other.lastHitBy : other.spawnedBy >= 0 ? other.spawnedBy : other.id) : -1;
    applyEffect(w, step.effect, target, { sourceId: responsible, cause: ev, powerBp: 10000, scale: 'none' }, other);
  }
  return true;
}

/**
 * Evaluates interaction rules for queued events (02 §7.3). Effects may enqueue
 * more events; up to three cascade rounds run per tick, the rest carry over.
 */
export function processRules(w: World): void {
  for (let round = 0; round < MAX_ROUNDS && w.queue.length > 0; round++) {
    const items = w.queue;
    w.queue = [];
    for (const item of items) {
      const rules = w.content.rulesByEvent.get(item.event);
      if (!rules) continue;
      const a = get(w, item.a) ?? (item.event === 'ko' || item.event === 'propBroken' ? w.byId.get(item.a) : undefined);
      if (!a) continue;
      const b = get(w, item.b);
      const sym = SYMMETRIC.has(item.event);
      if (sym && b) {
        tagsOf(w, a);
        tagsOf(w, b);
      }
      for (const rule of rules) {
        if (sym && b) {
          const bit = w.content.contactRuleBit.get(rule.id)!;
          if (hasBit(a.maskA, bit) && hasBit(b.maskB, bit) && tryRule(w, rule, item, a, b)) continue;
          if (hasBit(b.maskA, bit) && hasBit(a.maskB, bit)) tryRule(w, rule, item, b, a);
          continue;
        }
        tryRule(w, rule, item, a, b);
      }
    }
  }
}
