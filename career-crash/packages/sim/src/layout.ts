import type { ArenaDef } from '@cc/content-schema';
import { clamp, DIRS8, idiv } from './core/math';
import { Rng } from './core/rng';

type Rect = [number, number, number, number];

export interface PlacedObstacle {
  rect: Rect;
  /** Art name in the client's obstacle atlas. */
  art: string;
  /** Conveyor belts are walkable and carry things along (mm/tick); null for solid obstacles. */
  belt: [number, number] | null;
}

export interface ArenaLayout {
  /** The arena with this battle's walls and prop positions baked in. */
  arena: ArenaDef;
  obstacles: PlacedObstacle[];
}

const PROP_JITTER_MM = 700;
/** Loose (carryable) props left out of a given battle. */
const PROP_DROP_BP = 1500;
/** Clearance kept between obstacles and mover paths / spawn points. */
const MOVER_CLEARANCE = 1000;
const SPAWN_CLEARANCE = 800;

function segRectDist2(ax: number, ay: number, bx: number, by: number, [x, y, w, h]: Rect): number {
  // Sample the segment; paths are short lists of long straight runs, so 32 samples is plenty.
  let best = -1;
  for (let i = 0; i <= 32; i++) {
    const px = ax + idiv((bx - ax) * i, 32);
    const py = ay + idiv((by - ay) * i, 32);
    const dx = px - clamp(px, x, x + w);
    const dy = py - clamp(py, y, y + h);
    const d2 = dx * dx + dy * dy;
    if (best < 0 || d2 < best) best = d2;
  }
  return best;
}

function inRect(px: number, py: number, [x, y, w, h]: Rect, pad: number): boolean {
  return px >= x - pad && px <= x + w + pad && py >= y - pad && py <= y + h + pad;
}

/**
 * Per-battle arena layout (deterministic from the battle seed): optional
 * obstacles roll their chance, each obstacle picks one of its art variants and
 * shifts a little, and loose props jitter around their spots or sit the battle
 * out — so no two fights in the same arena look or play quite the same.
 * Obstacles never move onto mover paths or spawn points.
 */
export function layoutArena(base: ArenaDef, seed: string): ArenaLayout {
  const rng = Rng.fromSeed(seed).fork('layout');
  const [W, H] = base.sizeMm;
  const jitter = base.layoutJitterMm ?? 400;
  const spawns = [...base.spawns.a, ...base.spawns.b, ...base.spawns.ffa, base.refereeSpawn];
  const paths = (base.movers ?? []).flatMap((m) => m.path.slice(1).map((p, i) => [m.path[i]!, p] as const));
  const clear = (r: Rect): boolean =>
    r[0] >= 0 &&
    r[1] >= 0 &&
    r[0] + r[2] <= W &&
    r[1] + r[3] <= H &&
    spawns.every(([sx, sy]) => !inRect(sx, sy, r, SPAWN_CLEARANCE)) &&
    paths.every(([a, b]) => segRectDist2(a[0], a[1], b[0], b[1], r) >= MOVER_CLEARANCE * MOVER_CLEARANCE);

  const obstacles: PlacedObstacle[] = [];
  for (const o of base.obstacles ?? []) {
    // Roll everything unconditionally so one obstacle's outcome doesn't shift the others' rolls.
    const present = rng.chance(o.chanceBp ?? 10000);
    const art = o.art[rng.int(o.art.length)]!;
    const dx = rng.range(-jitter, jitter);
    const dy = rng.range(-jitter, jitter);
    if (!present) continue;
    const moved: Rect = [o.at[0] + dx, o.at[1] + dy, o.at[2], o.at[3]];
    const rect = o.belt || !clear(moved) ? ([...o.at] as Rect) : moved;
    obstacles.push({ rect, art, belt: o.belt ? [o.belt[0], o.belt[1]] : null });
  }
  const walls: Rect[] = [...(base.walls as Rect[]), ...obstacles.filter((o) => !o.belt).map((o) => o.rect)];

  const props: ArenaDef['props'] = [];
  for (const p of base.props) {
    const drop = rng.chance(PROP_DROP_BP);
    const x = clamp(p.at[0] + rng.range(-PROP_JITTER_MM, PROP_JITTER_MM), 400, W - 400);
    const y = clamp(p.at[1] + rng.range(-PROP_JITTER_MM, PROP_JITTER_MM), 400, H - 400);
    const blocked = (px: number, py: number) => walls.some((r) => inRect(px, py, r, 450));
    // Keep the arena's key set pieces (every prop defined once, at the centre line) and big machines in place.
    const fixed = p.at[0] * 2 === W || p.prop === 'prop.vending-machine' || p.prop === 'prop.freezer' || p.prop === 'prop.coffee-machine';
    if (fixed) {
      if (!blocked(p.at[0], p.at[1])) props.push(p);
      continue;
    }
    if (drop) continue;
    if (!blocked(x, y)) props.push({ prop: p.prop, at: [x, y] });
    else if (!blocked(p.at[0], p.at[1])) props.push(p);
    else {
      // Its spot is under an obstacle this time: find the nearest clear floor around it.
      for (const [dx, dy] of DIRS8) {
        const nx = clamp(p.at[0] + idiv(dx * 1500, 1000), 400, W - 400);
        const ny = clamp(p.at[1] + idiv(dy * 1500, 1000), 400, H - 400);
        if (!blocked(nx, ny)) {
          props.push({ prop: p.prop, at: [nx, ny] });
          break;
        }
      }
    }
  }
  return { arena: { ...base, walls, props }, obstacles };
}
