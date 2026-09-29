import type { ContentBundle } from '@cc/content-schema';
import { idiv } from './core/math';
import { hash64 } from './core/rng';
import { decide } from './systems/ai';
import { progressActions } from './systems/actions';
import { applyEffect, tickStatuses } from './systems/effects';
import { propsTick, scheduled } from './systems/environment';
import { contacts, physics, slipChecks } from './systems/physics';
import { resources, useConsumables } from './systems/resources';
import { processRules } from './systems/rules';
import { MAX_TICKS, type BattleInput, type BattleOutput, type BattleResult, type Entity, type World } from './types';
import { createWorld, emit, announceRivalries } from './world';

/** Canonical serialization of world state for hashing (01 §4.3). */
export function serializeState(w: World): string {
  const parts: number[] = [w.tick, w.rng.s.a, w.rng.s.b, w.rng.s.c, w.rng.s.d, w.aiRng.s.a, w.events.length];
  for (const e of w.entities) {
    if (e.removed) continue;
    parts.push(e.id, e.x, e.y, e.z, e.vx, e.vy, e.hp, e.energy, e.morale, e.heldId, e.statuses.length);
    for (const s of e.statuses) parts.push(s.remaining);
  }
  parts.push(...w.wallHp);
  return parts.join(',');
}

export function stateHash(w: World): string {
  return hash64(serializeState(w));
}

function teamAlive(w: World, team: number): boolean {
  for (const e of w.entities) if (e.kind === 'char' && e.team === team && e.state === 'active') return true;
  return false;
}

function teamHpBp(w: World, team: number): number {
  let hp = 0;
  let max = 0;
  for (const e of w.entities) {
    if (e.kind !== 'char' || e.team !== team) continue;
    max += e.maxHp;
    if (e.state === 'active') hp += e.hp;
  }
  return max > 0 ? idiv(hp * 10000, max) : 0;
}

function mvpOf(w: World, winner: number): number {
  let best = -1;
  let bestScore = -1;
  for (const e of w.entities) {
    if (e.kind !== 'char') continue;
    const c = e.counters;
    let s = c.kos * 100 + c.damageDealt + c.healing * 2 + c.revives * 80 - c.friendlyHits * 10;
    if (e.team === winner) s += 50;
    if (s > bestScore) {
      bestScore = s;
      best = e.id;
    }
  }
  return best;
}

function finish(w: World, winner: number, reason: BattleResult['reason']): void {
  const chars = w.entities.filter((e): e is Entity => e.kind === 'char');
  const teamHp = Array.from({ length: w.teamCount }, (_, t) => teamHpBp(w, t));
  w.result = {
    winner,
    reason,
    ticks: w.tick,
    mvp: mvpOf(w, winner),
    teamHpBp: teamHp,
    characters: chars.map((e) => ({
      entityId: e.id,
      snapshotId: e.snapshotId,
      team: e.team,
      name: e.name,
      state: e.state,
      hp: e.hp,
      maxHp: e.maxHp,
      counters: e.counters,
    })),
  };
  w.finished = true;
  emit(w, 'battleEnd', -1, -1, winner, reason);
}

/** Win conditions (02 §10). */
function winCheck(w: World): void {
  const alive: number[] = [];
  for (let t = 0; t < w.teamCount; t++) if (teamAlive(w, t)) alive.push(t);
  if (alive.length <= 1) {
    // Downed characters might still be revived — only if a teammate is active; otherwise the team is out.
    finish(w, alive.length === 1 ? alive[0]! : -1, 'elimination');
    return;
  }
  if (w.tick >= MAX_TICKS) {
    let best = -1;
    let bestHp = -1;
    let tie = false;
    for (const t of alive) {
      const hp = teamHpBp(w, t);
      if (hp > bestHp + 100) {
        best = t;
        bestHp = hp;
        tie = false;
      } else if (Math.abs(hp - bestHp) <= 100) {
        tie = true;
        if (hp > bestHp) {
          best = t;
          bestHp = hp;
        }
      }
    }
    finish(w, tie ? -1 : best, 'timeout');
  }
}

/** One simulation tick in the fixed order from 02 §4. */
export function step(w: World): void {
  if (w.finished) return;
  w.tick++;
  w.firedThisTick.clear();
  w.spawnedThisTick = 0;
  if (w.tick === 20) announceRivalries(w);
  scheduled(w);
  decide(w);
  progressActions(w);
  physics(w);
  contacts(w);
  slipChecks(w);
  processRules(w);
  tickStatuses(w);
  resources(w);
  useConsumables(w);
  propsTick(w);
  // Referee enforcement happens inside effects (fouls/cards) as events occur.
  if (w.tick % 50 === 0) w.entities = w.entities.filter((e) => !e.removed);
  winCheck(w);
}

function applyStartEffects(w: World): void {
  for (const e of w.entities) {
    if (e.kind !== 'char' || !e.snap) continue;
    const passives = e.snap.careers.map((c) => w.content.careers.get(c)?.passive ?? '');
    for (const m of e.snap.masteries) passives.push(w.content.masteries.get(m)?.passive ?? '');
    for (const pid of passives) {
      for (const eff of w.content.abilities.get(pid)?.passive?.startEffects ?? []) {
        applyEffect(w, eff, e, { sourceId: e.id, cause: -1, powerBp: 10000, scale: 'none' });
      }
    }
  }
}

export interface Battle {
  world: World;
  step(): void;
  done(): boolean;
}

export function createBattle(input: BattleInput, bundle: ContentBundle): Battle {
  const world = createWorld(input, bundle);
  applyStartEffects(world);
  return {
    world,
    step: () => step(world),
    done: () => world.finished,
  };
}

/** Run a whole battle. Pure: same input + bundle → same output, in any JS runtime. */
export function simulate(input: BattleInput, bundle: ContentBundle): BattleOutput {
  const b = createBattle(input, bundle);
  const hashes: string[] = [];
  while (!b.done()) {
    b.step();
    if (b.world.tick % 100 === 0) hashes.push(stateHash(b.world));
  }
  return { events: b.world.events, result: b.world.result!, resultHash: stateHash(b.world), hashes };
}
