/**
 * Spinning With Intent (Chairs Recalled): the chair's physics, apart from the
 * screen so they can be tested. The player steers towards a direction (the
 * chair turns at a fixed rate) and pushes (thrust along where it faces); the
 * chair keeps its momentum and only slowly rolls to a stop, so turns have to
 * be planned. Anything solid it hits costs integrity by how hard it hit.
 */
import { BROCK, PROPS, WALLS, type Rect } from './map';

export const CHAIR = {
  /** Collision radius (world units). */
  r: 34,
  /** Push along the facing, units/s². */
  thrust: 900,
  /** Rolling friction: speed decays by e^(-drag·t), so it glides. */
  drag: 0.9,
  maxSpeed: 640,
  /** Turn rate towards the steering direction, rad/s. */
  turn: 3.4,
  /** How much of the speed into a wall bounces back. */
  bounce: 0.45,
  /** Impacts under this speed are free; above it, damage per unit of speed. */
  safeImpact: 140,
  damagePerSpeed: 0.075,
  hp: 100,
  /** Hitting Brock at least this fast knocks him over; slower just bumps. */
  knockout: 230,
} as const;

export interface ChairState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Facing, radians (0 = east). */
  angle: number;
  /** The seat's spin, for show: it spins with speed and whips round on impacts. */
  spin: number;
  spinRate: number;
  hp: number;
}

export interface Input {
  /** Desired heading; (0, 0) = keep the current one. */
  dx: number;
  dy: number;
  thrust: boolean;
}

/** What happened this step. */
export interface StepEvents {
  /** Speed into whatever was hit (0 = nothing). */
  impact: number;
  damage: number;
  /** Brock: knocked over, or only bumped (too slow). */
  brock?: 'hit' | 'bump';
}

const SOLIDS: Rect[] = [...WALLS, ...PROPS];

export function newChair(x: number, y: number, angle: number): ChairState {
  return { x, y, vx: 0, vy: 0, angle, spin: 0, spinRate: 0, hp: CHAIR.hp };
}

/** Shortest signed angle from a to b. */
const turnTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Advance the chair by `dt` seconds (call with small steps, ≤ 1/60). */
export function step(s: ChairState, input: Input, dt: number, solids: Rect[] = SOLIDS, brock = BROCK): StepEvents {
  const ev: StepEvents = { impact: 0, damage: 0 };
  // Steer: turn towards the wanted heading at a fixed rate.
  if (input.dx || input.dy) {
    const d = turnTo(s.angle, Math.atan2(input.dy, input.dx));
    s.angle += Math.sign(d) * Math.min(Math.abs(d), CHAIR.turn * dt);
  }
  // Push, roll, cap.
  if (input.thrust) {
    s.vx += Math.cos(s.angle) * CHAIR.thrust * dt;
    s.vy += Math.sin(s.angle) * CHAIR.thrust * dt;
  }
  const k = Math.exp(-CHAIR.drag * dt);
  s.vx *= k;
  s.vy *= k;
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > CHAIR.maxSpeed) {
    s.vx *= CHAIR.maxSpeed / sp;
    s.vy *= CHAIR.maxSpeed / sp;
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  // Anything solid: push out along the shortest way, bounce the speed going into it.
  for (const r of solids) {
    const cx = Math.max(r.x, Math.min(s.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(s.y, r.y + r.h));
    let nx = s.x - cx;
    let ny = s.y - cy;
    let d = Math.hypot(nx, ny);
    if (d >= CHAIR.r) continue;
    if (d === 0) {
      // Centre inside the box (a big step): out through the nearest side.
      const left = s.x - r.x, right = r.x + r.w - s.x, top = s.y - r.y, bottom = r.y + r.h - s.y;
      const m = Math.min(left, right, top, bottom);
      [nx, ny] = m === left ? [-1, 0] : m === right ? [1, 0] : m === top ? [0, -1] : [0, 1];
      d = -m;
    } else {
      nx /= d;
      ny /= d;
    }
    s.x += nx * (CHAIR.r - d);
    s.y += ny * (CHAIR.r - d);
    const into = -(s.vx * nx + s.vy * ny);
    if (into > 0) {
      s.vx += (1 + CHAIR.bounce) * into * nx;
      s.vy += (1 + CHAIR.bounce) * into * ny;
      ev.impact = Math.max(ev.impact, into);
    }
  }
  if (ev.impact > CHAIR.safeImpact) {
    ev.damage = Math.round((ev.impact - CHAIR.safeImpact) * CHAIR.damagePerSpeed);
    s.hp = Math.max(0, s.hp - ev.damage);
  }
  // Brock, at the desk.
  const bd = Math.hypot(s.x - brock.x, s.y - brock.y);
  if (bd < CHAIR.r + brock.r) {
    const speed = Math.hypot(s.vx, s.vy);
    ev.brock = speed >= CHAIR.knockout ? 'hit' : 'bump';
    // Bounce off him either way (he's sturdier than he looks).
    const nx = (s.x - brock.x) / (bd || 1), ny = (s.y - brock.y) / (bd || 1);
    s.x = brock.x + nx * (CHAIR.r + brock.r);
    s.y = brock.y + ny * (CHAIR.r + brock.r);
    const into = -(s.vx * nx + s.vy * ny);
    if (into > 0) {
      s.vx += (1 + CHAIR.bounce) * into * nx;
      s.vy += (1 + CHAIR.bounce) * into * ny;
    }
  }
  // The seat spins with speed and whips round on a hit.
  s.spinRate = s.spinRate * Math.exp(-2.5 * dt) + (ev.impact > 60 ? (s.vx * Math.sin(s.angle) - s.vy * Math.cos(s.angle) < 0 ? -1 : 1) * ev.impact * 0.03 : 0);
  s.spin += (s.spinRate + Math.hypot(s.vx, s.vy) * 0.004) * dt;
  return ev;
}

/** The sign-off line (short: it's the card's headline). */
export function resultLine(won: boolean, hp: number, seconds: number): string {
  if (!won) return 'The chair has been recalled. Again.';
  if (hp >= 90) return `Direct hit in ${seconds.toFixed(1)} s. Not a scratch on it.`;
  if (hp >= 50) return `Brock down in ${seconds.toFixed(1)} s. The chair has notes.`;
  return `Brock down in ${seconds.toFixed(1)} s, on one wheel.`;
}
