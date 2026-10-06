import { clamp } from '../core/math';
import type { Entity, World } from '../types';
import { emit, isFighter, removeEntity, spawnCharacter } from '../world';
import { applyStatus, dropHeld } from './effects';

/**
 * Endless floors (08 §4.1): a knocked-out fighter is delisted for a while,
 * then re-lists at one of the floor's spots with full health, a fresh head and
 * a short shield. Grudges carry over: they come back for whoever floored them.
 */
export function relistTick(w: World): void {
  const cfg = w.input.endless;
  if (!cfg) return;
  for (const e of w.entities) {
    if (!isFighter(e) || e.removed || e.state !== 'ko' || e.koTick < 0 || e.carriedBy >= 0) continue;
    // Gatecrashers (the Regulators) aren't listed: floored, they stay down.
    if (e.team === w.crashTeam) continue;
    // A floor with a lobby (09 §4): the floored one is escorted out and the next in line walks on.
    if (cfg.seats !== undefined && w.lobby.length > 0 && !cfg.resident?.includes(e.team)) {
      if (w.tick - e.koTick < (cfg.walkOnTicks ?? cfg.relistTicks)) continue;
      walkOn(w, e, cfg.spawns, cfg.shieldTicks);
      continue;
    }
    const wait = e.snap?.leveraged ? cfg.liquidatedTicks : cfg.relistTicks;
    if (w.tick - e.koTick < wait) continue;
    relist(w, e, cfg.spawns, cfg.shieldTicks);
  }
}

function relist(w: World, e: Entity, spawns: [number, number][], shieldTicks: number): void {
  // Each comeback uses the next spot along, so nobody keeps re-listing on top of the same crowd.
  const [x, y] = spawns[(e.id + e.relists * 3) % spawns.length]!;
  e.x = x;
  e.y = y;
  e.z = 0;
  e.vx = e.vy = e.vz = 0;
  e.mx = e.my = 0;
  e.fx = x < w.arena.sizeMm[0] / 2 ? 1000 : -1000;
  e.fy = 0;
  e.state = 'active';
  e.hp = e.maxHp;
  e.energy = e.maxEnergy;
  e.morale = clamp(50 + 2 * (e.stats?.confidence ?? 5), 0, 100);
  e.panicking = false;
  e.statuses = [];
  e.action = null;
  e.downTimer = 0;
  e.path = [];
  e.pathGoal = -1;
  e.tossedBy = -1;
  e.dashUntil = 0;
  e.rideId = -1;
  e.tauntedBy = -1;
  e.decideAt = w.tick + 4;
  e.koTick = -1;
  e.relists++;
  e.tagsDirty = true;
  emit(w, 'relist', e.id, -1, e.relists, '', -1);
  if (shieldTicks > 0) applyStatus(w, e, 'status.armoured', shieldTicks, e.id, -1);
}

/**
 * The lobby (09 §4): `out` leaves the floor for good (this session), and the
 * first team in the lobby walks on as a fresh fighter, at one of the floor's
 * spots, with a short shield. The team that left joins the back of the queue,
 * so a long session brings everyone round again.
 */
function walkOn(w: World, out: Entity, spawns: [number, number][], shieldTicks: number): void {
  const team = w.lobby.shift()!;
  const snap = w.input.teams[team]?.characters[0];
  dropHeld(w, out, -1);
  const ride = out.rideId >= 0 ? w.byId.get(out.rideId) : undefined;
  if (ride && ride.riddenBy === out.id) ride.riddenBy = -1;
  out.rideId = -1;
  removeEntity(w, out);
  w.lobby.push(out.team);
  if (!snap) return;
  const [x, y] = spawns[(out.id + w.tick) % spawns.length]!;
  const e = spawnCharacter(w, snap, team, x, y);
  e.decideAt = w.tick + 4;
  emit(w, 'spawn', e.id, -1, e.team, e.snapshotId);
  emit(w, 'walkon', e.id, out.id, team, snap.id, -1);
  if (shieldTicks > 0) applyStatus(w, e, 'status.armoured', shieldTicks, e.id, -1);
  // A mood they bring on every entrance (09: a Mandate, or under-represented), not just at kick-off.
  for (const st of snap.startStatuses ?? []) applyStatus(w, e, st.status, st.durationTicks, e.id, -1);
}
