import type { Entity, World } from './types';
import { tagsOf } from './world';

/** Render-friendly snapshot of one tick (used by the replay viewer). */
export interface FrameEntity {
  id: number;
  kind: Entity['kind'];
  def: string;
  team: number;
  name: string;
  /** Character snapshot id ('' for props/NPCs). */
  snap: string;
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  r: number;
  area: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  state: Entity['state'];
  statuses: string[];
  action: string;
  held: number;
  riding: number;
  panicking: boolean;
  flying: boolean;
}

export interface Frame {
  tick: number;
  entities: FrameEntity[];
}

export function frameOf(w: World): Frame {
  const entities: FrameEntity[] = [];
  for (const e of w.entities) {
    if (e.removed) continue;
    tagsOf(w, e);
    entities.push({
      id: e.id,
      kind: e.kind,
      def: e.def,
      team: e.team,
      name: e.name,
      snap: e.snapshotId,
      x: e.x,
      y: e.y,
      z: e.z,
      fx: e.fx,
      fy: e.fy,
      r: e.radius,
      area: e.areaRadius,
      hp: e.hp,
      maxHp: e.maxHp,
      energy: e.energy,
      maxEnergy: e.maxEnergy,
      state: e.state,
      statuses: e.statuses.map((s) => s.id),
      action: e.action ? (e.action.kind === 'ability' ? e.action.abilityId : e.action.kind) + ':' + e.action.phase : '',
      held: e.heldId,
      riding: e.rideId,
      panicking: e.panicking,
      flying: e.flying,
    });
  }
  return { tick: w.tick, entities };
}
