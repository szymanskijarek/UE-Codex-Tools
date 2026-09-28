import type { AbilityDef, Goal } from '@cc/content-schema';
import { bpMul, clamp, DIRS8, dir1000, dist, idiv } from '../core/math';
import type { ActionKind, Entity, World } from '../types';
import { canAct, derived, get, isAlive, tagsOf } from '../world';
import { matchTags } from './effects';
import { isBlockedAt } from './nav';

/**
 * Utility AI (02 §6). Every decision enumerates a bounded set of candidate
 * (action, target) pairs, scores them with integer response curves, weights
 * them by goal (personality + traits), adds Intelligence-scaled noise and
 * picks the best. New abilities and props become usable purely through data.
 */
export interface Candidate {
  kind: ActionKind;
  targetId: number;
  tx: number;
  ty: number;
  abilityId: string;
  goal: Goal;
  base: number;
}

const DECISION_INTERVAL = 5;

/** 10000 at `ideal`, falling linearly to 1000 at `ideal ± falloff`. */
function near(d: number, ideal: number, falloff: number): number {
  return 10000 - clamp(idiv(Math.abs(d - ideal) * 9000, Math.max(1, falloff)), 0, 9000);
}

function hpBp(e: Entity): number {
  return e.maxHp > 0 ? idiv(e.hp * 10000, e.maxHp) : 0;
}

function byDistance(from: Entity, list: Entity[]): Entity[] {
  return list
    .map((e) => ({ e, d: dist(from.x, from.y, e.x, e.y) }))
    .sort((p, q) => p.d - q.d || p.e.id - q.e.id)
    .map((p) => p.e);
}

export function isEnemy(a: Entity, b: Entity): boolean {
  return b.kind === 'char' && b.id !== a.id && b.team !== a.team;
}

/** Entities an ability would affect when aimed at (tx, ty). */
export function affectedBy(w: World, caster: Entity, ab: AbilityDef, target: Entity): Entity[] {
  const tg = ab.targeting;
  if (!tg) return [caster];
  const affects = tg.affects ?? (tg.type === 'ally' || tg.type === 'self' ? 'target' : tg.type === 'enemy' ? 'target' : 'enemies');
  if (tg.type === 'self') return [caster];
  if (affects === 'target') return [target];
  const pass = (e: Entity): boolean => {
    if (e.removed || e.kind === 'prop' || e.state === 'ko') return false;
    if (affects === 'enemies') return isEnemy(caster, e);
    if (affects === 'allies') return e.kind === 'char' && e.team === caster.team && e.state === 'active';
    if (affects === 'allExceptSelf') return e.id !== caster.id;
    return true;
  };
  const out: Entity[] = [];
  const r = tg.radiusMm ?? tg.rangeMm;
  if (tg.type === 'circleSelf' || tg.type === 'circleTarget') {
    const cx = tg.type === 'circleSelf' ? caster.x : target.x;
    const cy = tg.type === 'circleSelf' ? caster.y : target.y;
    for (const e of w.entities) if (pass(e) && dist(e.x, e.y, cx, cy) <= r + e.radius) out.push(e);
  } else if (tg.type === 'cone') {
    const [dx, dy] = dir1000(target.x - caster.x, target.y - caster.y);
    const cos = tg.coneCosBp ?? 7071;
    for (const e of w.entities) {
      if (!pass(e) || e.id === caster.id) continue;
      const d = dist(e.x, e.y, caster.x, caster.y);
      if (d > tg.rangeMm + e.radius) continue;
      if (d < e.radius + caster.radius) {
        out.push(e);
        continue;
      }
      const [ex, ey] = dir1000(e.x - caster.x, e.y - caster.y);
      if ((dx * ex + dy * ey) / 100 >= cos) out.push(e);
    }
  } else {
    out.push(target);
  }
  return out;
}

function abilityCandidates(w: World, e: Entity, enemies: Entity[], allies: Entity[], out: Candidate[]): void {
  for (const aid of e.actives) {
    const ab = w.content.abilities.get(aid);
    if (!ab || ab.kind !== 'active' || !ab.targeting || !ab.aiHints) continue;
    if ((e.cooldowns[aid] ?? 0) > w.tick) continue;
    if ((ab.cost?.energy ?? 0) * 100 > e.energy) continue;
    const hints = ab.aiHints;
    if (hints.selfHpBelowBp !== undefined && hpBp(e) > hints.selfHpBelowBp) continue;
    const tt = ab.targeting.type;
    const aim = hints.aimAt ?? (tt === 'ally' ? 'ally' : tt === 'self' || tt === 'circleSelf' ? 'self' : 'enemy');
    let targets: Entity[];
    if (aim === 'self') targets = [e];
    else if (aim === 'enemy') targets = enemies.slice(0, 3);
    else if (aim === 'woundedAlly') targets = [e, ...allies].filter((a) => hpBp(a) < 7000);
    else targets = allies.slice(0, 3);
    for (const t of targets) {
      if (hints.requireTargetTags && !matchTags(w, t, { hasAll: hints.requireTargetTags })) continue;
      const affected = affectedBy(w, e, ab, t);
      let good = 0;
      let bad = 0;
      let preferred = 0;
      const affects = ab.targeting.affects;
      for (const x of affected) {
        const friendly = x.kind === 'char' && x.team === e.team;
        const wantFriendly = affects === 'allies' || aim === 'ally' || aim === 'woundedAlly' || (aim === 'self' && (affects === 'target' || affects === undefined));
        if (x.kind === 'npc') continue;
        if (friendly === wantFriendly) good++;
        else bad++;
        if (hints.preferTargetsWithTags && matchTags(w, x, { hasAny: hints.preferTargetsWithTags })) preferred++;
      }
      if (good < (hints.minTargets ?? 1)) continue;
      let base = 5500 + 1500 * (good - 1);
      if (!e.quirks.includes('friendlyFireCareless')) {
        const iq = e.stats?.intelligence ?? 5;
        base -= bad * (1000 + 250 * iq);
      }
      if (aim === 'woundedAlly') base = 3000 + idiv((10000 - hpBp(t)) * 8, 10);
      if (preferred > 0) base = idiv(base * (10000 + 5000 * preferred), 10000);
      else if (hints.preferTargetsWithTags && hints.goal !== 'damage') base = idiv(base, 2);
      const d = dist(e.x, e.y, t.x, t.y);
      if (aim !== 'self' && d > ab.targeting.rangeMm) base = bpMul(base, near(d, ab.targeting.rangeMm, 9000));
      if (base <= 0) continue;
      out.push({ kind: 'ability', targetId: t.id, tx: t.x, ty: t.y, abilityId: aid, goal: hints.goal, base: idiv(base * 5, 4) });
    }
  }
}

function prefScore(w: World, e: Entity, t: Entity, d: number): number {
  switch (e.targetPref) {
    case 'weakest':
      return 10000 - hpBp(t);
    case 'strongest':
      return hpBp(t);
    case 'mostKos':
      return clamp(3000 + t.counters.kos * 2500, 0, 10000);
    default:
      return near(d, 0, 10000);
  }
}

function retreatPoint(w: World, e: Entity, enemies: Entity[]): [number, number] {
  let best: [number, number] = [e.x, e.y];
  let bestScore = -1;
  for (const [dx, dy] of DIRS8) {
    const x = e.x + idiv(dx * 4000, 1000);
    const y = e.y + idiv(dy * 4000, 1000);
    if (isBlockedAt(w.nav, x, y)) continue;
    let minD = 1_000_000;
    for (const en of enemies) minD = Math.min(minD, dist(x, y, en.x, en.y));
    let s = minD;
    if (e.quirks.includes('hideBehindProps')) {
      for (const p of w.entities) if (p.kind === 'prop' && !p.removed && w.content.props.get(p.def)?.solid && dist(x, y, p.x, p.y) < 1500) s += 2500;
    }
    if (s > bestScore) {
      bestScore = s;
      best = [x, y];
    }
  }
  return best;
}

export function candidates(w: World, e: Entity): Candidate[] {
  const out: Candidate[] = [];
  const per = derived.perception(e.stats!);
  const chars = w.entities.filter((x) => x.kind === 'char' && !x.removed && x.state !== 'ko' && x.id !== e.id);
  const enemiesAll = byDistance(
    e,
    chars.filter((x) => isEnemy(e, x)),
  );
  const activeEnemies = enemiesAll.filter((x) => x.state === 'active');
  const enemies = activeEnemies.length > 0 ? activeEnemies : enemiesAll;
  const allies = byDistance(
    e,
    chars.filter((x) => x.team === e.team),
  );
  const props = byDistance(
    e,
    w.entities.filter((p) => p.kind === 'prop' && !p.removed && p.carriedBy < 0 && p.riddenBy < 0 && !p.flying && dist(e.x, e.y, p.x, p.y) <= per),
  );
  const held = e.heldId >= 0 ? w.byId.get(e.heldId) : undefined;

  // Basic attacks / throws
  for (const t of enemies.slice(0, 3)) {
    const d = dist(e.x, e.y, t.x, t.y);
    let base = idiv(near(d, e.attack.rangeMm, 12000) * 6 + prefScore(w, e, t, d) * 4, 10);
    if (e.snap?.rivals?.includes(t.snapshotId)) base = idiv(base * 14, 10);
    if (e.quirks.includes('grudge') && e.lastHitBy === t.id) base = idiv(base * 15, 10);
    if (e.preferTags.length && matchTags(w, t, { hasAny: e.preferTags })) base = idiv(base * 13, 10);
    if (t.state === 'downed') base = idiv(base, 3);
    out.push({ kind: 'attack', targetId: t.id, tx: t.x, ty: t.y, abilityId: '', goal: 'damage', base });
    if (held && d > 1500 && d < 10000 && !(e.quirks.includes('hoarder') && d > 4000)) {
      out.push({ kind: 'throw', targetId: t.id, tx: t.x, ty: t.y, abilityId: '', goal: 'damage', base: idiv(near(d, 5000, 7000) * 11, 10) });
    }
  }

  abilityCandidates(w, e, enemies, allies, out);

  // Props
  let propsConsidered = 0;
  for (const p of props) {
    if (propsConsidered >= 5) break;
    const def = w.content.props.get(p.def);
    if (!def) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    const closeness = near(d, 0, 9000);
    let used = false;
    if (!held && def.carry && def.throwDamage && p.weightG <= derived.carryG(e.stats!)) {
      const danger = activeEnemies.some((x) => dist(e.x, e.y, x.x, x.y) < 2500) ? 2 : 1;
      out.push({ kind: 'pickUp', targetId: p.id, tx: p.x, ty: p.y, abilityId: '', goal: 'loot', base: idiv(bpMul(clamp(3500 + def.throwDamage * 300, 0, 9000), closeness), danger) });
      used = true;
    }
    if (def.use && e.rideId < 0 && p.uses > 0) {
      const effectsStatus = def.use.effects.find((x) => x.type === 'applyStatus');
      const already = effectsStatus && effectsStatus.type === 'applyStatus' && e.statuses.some((s) => s.id === effectsStatus.status);
      const heals = def.use.effects.some((x) => x.type === 'heal');
      if (!already && (!heals || hpBp(e) < 8000)) {
        const base = heals ? 3000 + idiv((10000 - hpBp(e)) * 7, 10) : def.use.spawn ? 2500 : 4500;
        out.push({ kind: 'use', targetId: p.id, tx: p.x, ty: p.y, abilityId: '', goal: heals ? 'survive' : 'loot', base: bpMul(base, closeness) });
        used = true;
      }
    }
    if (def.ride && e.rideId < 0) {
      out.push({ kind: 'use', targetId: p.id, tx: p.x, ty: p.y, abilityId: '', goal: 'chaos', base: bpMul(4500, closeness) });
      used = true;
    }
    if (def.push && !def.anchored) {
      const victims = activeEnemies.filter((x) => dist(p.x, p.y, x.x, x.y) < 5000);
      if (victims.length > 0) {
        const v = victims[0]!;
        out.push({ kind: 'push', targetId: p.id, tx: v.x, ty: v.y, abilityId: '', goal: 'chaos', base: bpMul(3500 + 2000 * victims.length, closeness) });
        used = true;
      }
    }
    if ((def.explode || def.leak) && p.maxHp > 0) {
      const victims = activeEnemies.filter((x) => dist(p.x, p.y, x.x, x.y) < (def.explode?.radiusMm ?? 2500)).length;
      const friends = allies.filter((x) => dist(p.x, p.y, x.x, x.y) < (def.explode?.radiusMm ?? 2500)).length;
      if (victims > 0) {
        const base = bpMul(2500 + 2500 * victims - (e.quirks.includes('friendlyFireCareless') ? 0 : 2500 * friends), closeness);
        if (base > 0) out.push({ kind: 'attack', targetId: p.id, tx: p.x, ty: p.y, abilityId: '', goal: 'chaos', base });
        used = true;
      }
    }
    if (used) propsConsidered++;
  }

  // Survival: burning → run to water; low HP / morale → retreat.
  const tags = tagsOf(w, e);
  const threatened = e.statuses.some((s) => w.content.statuses.get(s.id)?.aiThreat);
  if (threatened) {
    const water = props.find((p) => p.areaRadius > 0 && tagsOf(w, p).has('element:water'));
    if (water) out.push({ kind: 'reposition', targetId: water.id, tx: water.x, ty: water.y, abilityId: '', goal: 'survive', base: 8500 });
  }
  const hp = hpBp(e);
  const closeEnemies = activeEnemies.filter((x) => dist(e.x, e.y, x.x, x.y) < 5000).length;
  let retreat = idiv((10000 - hp) * 7, 10) + (e.morale < 25 ? 5000 : 0);
  if (closeEnemies === 0) retreat = idiv(retreat, 4);
  if (tags.has('state:burning')) retreat += 2000;
  if (retreat > 500) {
    const [rx, ry] = retreatPoint(w, e, activeEnemies);
    out.push({ kind: 'retreat', targetId: -1, tx: rx, ty: ry, abilityId: '', goal: 'survive', base: retreat });
  }

  // Support
  for (const a of allies) {
    if (a.state !== 'downed') continue;
    const d = dist(e.x, e.y, a.x, a.y);
    if (d > 12000) continue;
    const skilled = tags.has('skill:heal') ? 12 : 10;
    out.push({ kind: 'revive', targetId: a.id, tx: a.x, ty: a.y, abilityId: '', goal: 'support', base: idiv(bpMul(8500, near(d, 0, 12000)) * skilled, 10) });
  }
  if (e.quirks.includes('bodyguard')) {
    const weakest = [...allies].filter((a) => a.state === 'active').sort((p, q) => hpBp(p) - hpBp(q) || p.id - q.id)[0];
    if (weakest && dist(e.x, e.y, weakest.x, weakest.y) > 2500) {
      out.push({ kind: 'reposition', targetId: weakest.id, tx: weakest.x, ty: weakest.y, abilityId: '', goal: 'support', base: 4000 });
    }
  }
  if (allies.length > 0 && dist(e.x, e.y, allies[0]!.x, allies[0]!.y) > 8000) {
    out.push({ kind: 'reposition', targetId: allies[0]!.id, tx: allies[0]!.x, ty: allies[0]!.y, abilityId: '', goal: 'support', base: 2000 });
  }

  // Show-off
  if ((e.cooldowns['taunt'] ?? 0) <= w.tick && activeEnemies.some((x) => dist(e.x, e.y, x.x, x.y) < 6000)) {
    out.push({ kind: 'taunt', targetId: -1, tx: e.x, ty: e.y, abilityId: '', goal: 'showOff', base: 2500 });
  }

  out.push({ kind: 'wander', targetId: -1, tx: e.x + w.aiRng.range(-3000, 3000), ty: e.y + w.aiRng.range(-3000, 3000), abilityId: '', goal: 'loot', base: 300 });
  return out.slice(0, 40);
}

export function score(w: World, e: Entity, c: Candidate): number {
  let s = bpMul(c.base, e.goalWeights[c.goal]);
  const needsWalk = c.kind !== 'taunt' && c.kind !== 'retreat';
  if (needsWalk && e.moveCostBp !== 10000) {
    const d = dist(e.x, e.y, c.tx, c.ty);
    if (d > 2000) s = idiv(s * 10000, 10000 + idiv((e.moveCostBp - 10000) * d, 8000));
  }
  const cur = e.action;
  if (cur && cur.kind === c.kind && cur.targetId === c.targetId && cur.abilityId === c.abilityId) s = idiv(s * 5, 4);
  const iq = e.stats?.intelligence ?? 5;
  const sigma = clamp((22 - iq) * 150, 0, 4000);
  const noise = idiv(w.aiRng.int(10001) + w.aiRng.int(10001), 1) - 10000; // triangular −10000..10000
  s += idiv(idiv(s * sigma, 10000) * noise, 10000);
  return s;
}

/** Decide the next action for every character whose timer expired (02 §4 step 3). */
export function decide(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || !canAct(w, e)) continue;
    const interrupted = e.action === null;
    if (!interrupted && w.tick < e.decideAt) continue;
    if (e.action && (e.action.phase === 'windup' || e.action.phase === 'recover')) continue;
    e.decideAt = w.tick + DECISION_INTERVAL;

    if (e.panicking) {
      const [dx, dy] = DIRS8[w.aiRng.int(8)]!;
      e.action = { kind: 'wander', targetId: -1, tx: e.x + dx * 4, ty: e.y + dy * 4, abilityId: '', phase: 'approach', timer: 0, goal: 'survive', expires: w.tick + 30 };
      continue;
    }
    const taunter = e.tauntUntil > w.tick ? get(w, e.tauntedBy) : undefined;
    if (taunter && isAlive(taunter) && taunter.state === 'active') {
      e.action = { kind: 'attack', targetId: taunter.id, tx: taunter.x, ty: taunter.y, abilityId: '', phase: 'approach', timer: 0, goal: 'damage', expires: w.tick + 40 };
      continue;
    }
    const cands = candidates(w, e);
    let best: Candidate | null = null;
    let bestScore = -1_000_000;
    for (const c of cands) {
      const s = score(w, e, c);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (!best) continue;
    const cur = e.action;
    if (cur && cur.kind === best.kind && cur.targetId === best.targetId && cur.abilityId === best.abilityId) {
      cur.tx = best.tx;
      cur.ty = best.ty;
      continue;
    }
    e.action = { kind: best.kind, targetId: best.targetId, tx: best.tx, ty: best.ty, abilityId: best.abilityId, phase: 'approach', timer: 0, goal: best.goal, expires: w.tick + 80 };
    e.path = [];
  }
}
