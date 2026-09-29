import type { Graphics } from 'pixi.js';

/**
 * Cosmetic Verlet ragdoll (MDickie-style floppiness). Purely visual: the
 * deterministic simulation still owns where a character is; the ragdoll's
 * pelvis is pulled toward that position while head and limbs flop, tumble
 * and settle on the floor under gravity.
 *
 * Points: 0 head, 1 chest, 2 pelvis, 3 lElbow, 4 lHand, 5 rElbow, 6 rHand,
 *         7 lKnee, 8 lFoot, 9 rKnee, 10 rFoot.
 */
const LINKS: [number, number, number][] = [
  // a, b, rest length in units of r
  [0, 1, 1.15],
  [1, 2, 1.35],
  [1, 3, 0.85],
  [3, 4, 0.8],
  [1, 5, 0.85],
  [5, 6, 0.8],
  [2, 7, 0.95],
  [7, 8, 0.95],
  [2, 9, 0.95],
  [9, 10, 0.95],
];
// Soft "muscle" links that keep the body from folding completely flat.
const SOFT: [number, number, number, number][] = [
  [0, 2, 2.3, 0.2],
  [7, 9, 0.7, 0.1],
  [3, 5, 1.2, 0.05],
];

/** Custom proportions (sprite puppets): links as [a, b, restPx], soft links as [a, b, minPx, stiffness]. */
export interface RagdollSpec {
  links: [number, number, number][];
  soft: [number, number, number, number][];
}

export interface RagdollStyle {
  r: number;
  body: number;
  skin: number;
  hair: number;
  legs: number;
  outline: number;
  ko: boolean;
}

export class Ragdoll {
  x = new Float32Array(11);
  y = new Float32Array(11);
  px = new Float32Array(11);
  py = new Float32Array(11);
  /** Rotational kick applied while airborne (tumbling). */
  spin = 0;
  settledMs = 0;
  private links: [number, number, number][];
  private soft: [number, number, number, number][];

  constructor(
    private r: number,
    ax: number,
    ay: number,
    facing: number,
    spec?: RagdollSpec,
  ) {
    this.links = spec?.links ?? LINKS.map(([a, b, l]) => [a, b, l * r]);
    this.soft = spec?.soft ?? SOFT.map(([a, b, l, k]) => [a, b, l * r, k]);
    // Start from an upright pose at the anchor (feet on the floor).
    const pose: [number, number][] = [
      [0.1, -3.3],
      [0, -2.2],
      [0, -0.95],
      [-0.55, -1.8],
      [-0.7, -1.1],
      [0.55, -1.8],
      [0.7, -1.1],
      [-0.3, -0.45],
      [-0.35, 0],
      [0.3, -0.45],
      [0.35, 0],
    ];
    pose.forEach(([dx, dy], i) => {
      this.x[i] = this.px[i] = ax + dx * r * facing;
      this.y[i] = this.py[i] = ay + dy * r;
    });
  }

  /** Start from an existing pose (e.g. the puppet's current stance). */
  setPoints(xs: ArrayLike<number>, ys: ArrayLike<number>): void {
    for (let i = 0; i < 11; i++) {
      this.x[i] = this.px[i] = xs[i]!;
      this.y[i] = this.py[i] = ys[i]!;
    }
  }

  /** Add velocity (px per frame-ish) to the upper body, falling off toward the feet. */
  impulse(dx: number, dy: number): void {
    const w = [1, 0.8, 0.45, 0.9, 1, 0.9, 1, 0.3, 0.2, 0.3, 0.2];
    for (let i = 0; i < 11; i++) {
      this.px[i] -= dx * w[i]!;
      this.py[i] -= dy * w[i]!;
    }
  }

  /**
   * Advance the ragdoll. `ax, ay` is where the simulation says the body is
   * (projected, including height); `floorY` is the character's floor line.
   */
  step(dtMs: number, ax: number, ay: number, floorY: number, airborne: boolean, twitch: boolean): void {
    const r = this.r;
    const dt = Math.min(0.05, dtMs / 1000);
    const g = 55 * r;
    // Integrate.
    const vmax = r * 1.2;
    for (let i = 0; i < 11; i++) {
      const vx = Math.max(-vmax, Math.min(vmax, (this.x[i]! - this.px[i]!) * 0.985));
      const vy = Math.max(-vmax, Math.min(vmax, (this.y[i]! - this.py[i]!) * 0.985));
      this.px[i] = this.x[i]!;
      this.py[i] = this.y[i]!;
      this.x[i]! += vx;
      this.y[i]! += vy + g * dt * dt;
      if (twitch) {
        this.x[i]! += (Math.random() - 0.5) * r * 0.25;
        this.y[i]! += (Math.random() - 0.5) * r * 0.25;
      }
    }
    // Tumble while airborne: head and feet swing in opposite directions around the pelvis.
    if (airborne && this.spin !== 0) {
      const cx = this.x[2]!;
      const cy = this.y[2]!;
      for (const i of [0, 4, 6, 8, 10]) {
        const rx = this.x[i]! - cx;
        const ry = this.y[i]! - cy;
        this.x[i]! += -ry * this.spin * dt * 6;
        this.y[i]! += rx * this.spin * dt * 6;
      }
    }
    // Pelvis follows the simulated position: tightly in the air, loosely on the ground.
    const k = airborne ? 0.45 : 0.18;
    const tx = ax;
    const ty = airborne ? ay - r * 0.9 : Math.min(ay - r * 0.3, floorY - r * 0.3);
    this.x[2]! += (tx - this.x[2]!) * k;
    this.y[2]! += (ty - this.y[2]!) * (airborne ? k : k * 0.5);
    // Constraints.
    for (let it = 0; it < 6; it++) {
      for (const [a, b, len] of this.links) this.solve(a, b, len, 1);
      for (const [a, b, len, stiff] of this.soft) this.solveMin(a, b, len, stiff);
      // Floor: nothing goes below the floor line (with a sliver of depth for lying bodies).
      const floor = floorY - r * 0.1;
      for (let i = 0; i < 11; i++) {
        if (this.y[i]! > floor) {
          this.y[i] = floor;
          // Friction: slide less along the floor.
          this.px[i] = this.px[i]! + (this.x[i]! - this.px[i]!) * 0.4;
        }
      }
    }
    // Safety net: never let a limb leave the body (tunnelling, NaN, camera jumps).
    const maxD = r * 6;
    for (let i = 0; i < 11; i++) {
      let dx = this.x[i]! - ax;
      let dy = this.y[i]! - ay;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) dx = dy = 0;
      const d = Math.hypot(dx, dy);
      if (d > maxD || d === 0) {
        const f = d > 0 ? maxD / d : 0;
        this.x[i] = this.px[i] = ax + dx * f;
        this.y[i] = this.py[i] = ay + dy * f - (d === 0 ? r * (i === 0 ? 2 : 1) : 0);
      }
    }
    const moving = Math.abs(this.x[0]! - this.px[0]!) + Math.abs(this.y[0]! - this.py[0]!);
    this.settledMs = moving < 0.3 ? this.settledMs + dtMs : 0;
  }

  private solve(a: number, b: number, len: number, stiff: number): void {
    const dx = this.x[b]! - this.x[a]!;
    const dy = this.y[b]! - this.y[a]!;
    const d = Math.hypot(dx, dy) || 0.0001;
    const diff = ((d - len) / d) * 0.5 * stiff;
    this.x[a]! += dx * diff;
    this.y[a]! += dy * diff;
    this.x[b]! -= dx * diff;
    this.y[b]! -= dy * diff;
  }

  private solveMin(a: number, b: number, len: number, stiff: number): void {
    const dx = this.x[b]! - this.x[a]!;
    const dy = this.y[b]! - this.y[a]!;
    const d = Math.hypot(dx, dy) || 0.0001;
    if (d >= len) return;
    const diff = ((d - len) / d) * 0.5 * stiff;
    this.x[a]! += dx * diff;
    this.y[a]! += dy * diff;
    this.x[b]! -= dx * diff;
    this.y[b]! -= dy * diff;
  }

  draw(g: Graphics, s: RagdollStyle): void {
    const r = s.r;
    const X = this.x;
    const Y = this.y;
    g.clear();
    const limb = (a: number, b: number, w: number, color: number) => {
      g.moveTo(X[a]!, Y[a]!).lineTo(X[b]!, Y[b]!).stroke({ width: w + r * 0.28, color: s.outline, cap: 'round' });
      g.moveTo(X[a]!, Y[a]!).lineTo(X[b]!, Y[b]!).stroke({ width: w, color, cap: 'round' });
    };
    // Back limbs, torso, front limbs, head.
    limb(2, 7, r * 0.5, s.legs);
    limb(7, 8, r * 0.45, s.legs);
    limb(1, 3, r * 0.4, s.body);
    limb(3, 4, r * 0.36, s.body);
    limb(1, 2, r * 1.25, s.body);
    limb(2, 9, r * 0.5, s.legs);
    limb(9, 10, r * 0.45, s.legs);
    limb(1, 5, r * 0.4, s.body);
    limb(5, 6, r * 0.36, s.body);
    for (const h of [4, 6]) g.circle(X[h]!, Y[h]!, r * 0.22).fill(s.skin).stroke({ width: r * 0.1, color: s.outline });
    for (const f of [8, 10]) g.circle(X[f]!, Y[f]!, r * 0.25).fill(0x1f2937);
    // Head oriented along the neck.
    const hx = X[0]!;
    const hy = Y[0]!;
    const ang = Math.atan2(Y[0]! - Y[1]!, X[0]! - X[1]!) + Math.PI / 2;
    g.circle(hx, hy, r * 0.95).fill(s.skin).stroke({ width: r * 0.14, color: s.outline });
    // Hair cap: start the path on the arc, or Pixi joins it to the origin.
    g.moveTo(hx + Math.cos(ang + Math.PI) * r * 0.95, hy + Math.sin(ang + Math.PI) * r * 0.95)
      .arc(hx, hy, r * 0.95, ang + Math.PI, ang + Math.PI * 2)
      .closePath()
      .fill(s.hair);
    // Eyes perpendicular to the neck direction.
    const ex = Math.cos(ang);
    const ey = Math.sin(ang);
    for (const side of [-0.35, 0.35]) {
      const cx = hx + ex * side * r - Math.sin(ang) * -0.05 * r;
      const cy = hy + ey * side * r + Math.cos(ang) * 0.05 * r;
      if (s.ko) {
        const q = r * 0.14;
        g.moveTo(cx - q, cy - q).lineTo(cx + q, cy + q).moveTo(cx + q, cy - q).lineTo(cx - q, cy + q).stroke({ width: r * 0.12, color: s.outline });
      } else {
        g.circle(cx, cy, r * 0.18).fill(0xffffff).stroke({ width: r * 0.06, color: s.outline });
        g.circle(cx, cy, r * 0.07).fill(s.outline);
      }
    }
  }
}
