import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { PUPPET_DEFS as DEFS, puppetUrl, type PuppetDef } from './puppet-art';
import type { RagdollSpec } from './ragdoll';

/**
 * Sprite puppets: characters built from sliced body-part art
 * (tools/art-pipeline → puppets/). The same 11-point skeleton as the ragdoll
 * drives them, so a standing puppet (posed procedurally) and a flying one
 * (Verlet ragdoll) are drawn by one function and hand over seamlessly.
 *
 * Points: 0 head centre, 1 neck, 2 hips, 3 back elbow, 4 back hand,
 *         5 front elbow, 6 front hand, 7 back knee, 8 back ankle,
 *         9 front knee, 10 front ankle.
 */
const TEXTURES = new Map<string, Record<string, Texture>>();
let loading: Promise<void> | null = null;

/** Load every puppet atlas once (data URIs in the standalone build). Safe to call repeatedly. */
export function loadPuppets(): Promise<void> {
  loading ??= Promise.all(
    Object.entries(DEFS).map(async ([career, def]) => {
      const url = puppetUrl(career);
      if (!url) return;
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        return;
      }
      const base = Texture.from(img);
      base.source.scaleMode = 'linear';
      const parts: Record<string, Texture> = {};
      for (const [name, p] of Object.entries(def.parts)) parts[name] = new Texture({ source: base.source, frame: new Rectangle(p.x, p.y, p.w, p.h) });
      TEXTURES.set(career, parts);
    }),
  ).then(() => undefined);
  return loading;
}

export function hasPuppet(career: string): boolean {
  return TEXTURES.has(career);
}

export interface Pose {
  bob: number;
  lean: number;
  offX: number;
  armF: number;
  armB: number;
  elbowF: number;
  elbowB: number;
  legF: number;
  legB: number;
  kneeF: number;
  kneeB: number;
  headRot: number;
}

export const NEUTRAL: Pose = { bob: 0, lean: 0, offX: 0, armF: -0.12, armB: 0.12, elbowF: -0.08, elbowB: 0.08, legF: -0.04, legB: 0.04, kneeF: 0, kneeB: 0, headRot: 0 };

const len = (p: { a: [number, number]; b: [number, number] } | undefined): number => (p ? Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) : 0);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

type Slot = 'head' | 'torso' | 'pelvis' | 'upperArmL' | 'upperArmR' | 'foreArmL' | 'foreArmR' | 'handL' | 'handR' | 'thighL' | 'thighR' | 'shinL' | 'shinR' | 'footL' | 'footR';
/** Back-to-front. Front limbs use the art's right-hand pieces so an unmirrored puppet reads naturally. */
const ORDER: Slot[] = ['upperArmL', 'foreArmL', 'handL', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'pelvis', 'torso', 'head', 'upperArmR', 'foreArmR', 'handR'];

/** Heads drawn a little oversized: reads better at arena scale (and it's funnier). */
const HEAD_SCALE = 1.3;
/** Puppet height in character radii. */
export const PUPPET_HEIGHT = 4.7;

export class Puppet {
  readonly root = new Container();
  readonly xs = new Float32Array(11);
  readonly ys = new Float32Array(11);
  private tx = new Float32Array(11);
  private ty = new Float32Array(11);
  /** While > 0, poses ease in from the current points (mode changes: stand ↔ ragdoll ↔ crawl). */
  private blendMs = 0;
  /** Screen px per atlas px. */
  readonly k: number;
  private sprites = new Map<Slot, Sprite>();
  private def: PuppetDef;
  private d: { head: number; torso: number; pelvis: number; upper: number; fore: number; hand: number; thigh: number; shin: number; foot: number; shoulder: number; shoulderDrop: number; hip: number };
  /** Where the held item sits, updated every render (screen coords). */
  hand = { x: 0, y: 0, rot: 0 };

  constructor(
    career: string,
    /** Character radius in screen px; the puppet is PUPPET_HEIGHT radii tall. */
    readonly r: number,
  ) {
    this.def = DEFS[career]!;
    const P = this.def.parts;
    const tex = TEXTURES.get(career)!;
    const avg = (a: string, b: string) => (len(P[a]) + len(P[b])) / 2;
    const d = {
      head: len(P.head) * 0.5,
      torso: len(P.torso),
      pelvis: len(P.pelvis),
      upper: avg('upperArmL', 'upperArmR'),
      // Forearm bone runs elbow → fingertips; separate hand art (if any) sits on its end.
      fore: avg('foreArmL', 'foreArmR') + (P.handL ? avg('handL', 'handR') : 0),
      hand: P.handL ? avg('handL', 'handR') : 0,
      thigh: avg('thighL', 'thighR'),
      shin: avg('shinL', 'shinR'),
      foot: P.footL ? avg('footL', 'footR') : 0,
      shoulder: P.torso!.w * 0.33,
      shoulderDrop: P.torso!.h * 0.1,
      hip: P.pelvis!.w * 0.22,
    };
    const figure = len(P.head) * HEAD_SCALE + d.torso + d.pelvis + d.thigh + d.shin + d.foot;
    this.k = (r * PUPPET_HEIGHT) / figure;
    const k = this.k;
    this.d = { head: d.head * k * HEAD_SCALE, torso: d.torso * k, pelvis: d.pelvis * k, upper: d.upper * k, fore: d.fore * k, hand: d.hand * k, thigh: d.thigh * k, shin: d.shin * k, foot: d.foot * k, shoulder: d.shoulder * k, shoulderDrop: d.shoulderDrop * k, hip: d.hip * k };
    for (const slot of ORDER) {
      const t = tex[slot];
      if (!t) continue;
      const s = new Sprite(t);
      this.sprites.set(slot, s);
      this.root.addChild(s);
    }
  }

  /** Rest lengths for the ragdoll, measured on the neutral pose. */
  ragdollSpec(): RagdollSpec {
    const xs = new Float32Array(11);
    const ys = new Float32Array(11);
    this.pose(NEUTRAL, 0, 0, 1, xs, ys);
    const dist = (a: number, b: number) => Math.hypot(xs[a]! - xs[b]!, ys[a]! - ys[b]!);
    const links: [number, number][] = [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [1, 5],
      [5, 6],
      [2, 7],
      [7, 8],
      [2, 9],
      [9, 10],
    ];
    return {
      links: links.map(([a, b]) => [a, b, dist(a, b)]),
      soft: [
        [0, 2, dist(0, 2) * 0.95, 0.2],
        [7, 9, dist(7, 9) * 0.8, 0.1],
        [3, 5, dist(3, 5) * 0.6, 0.05],
      ],
    };
  }

  /** Ease the next poses in from wherever the body is now. */
  settle(ms: number): void {
    this.blendMs = Math.max(this.blendMs, ms);
  }

  private blend(dt: number, f: number): void {
    const k = this.blendMs > 0 ? Math.min(1, dt / 90) : 1;
    this.blendMs = Math.max(0, this.blendMs - dt);
    for (let i = 0; i < 11; i++) {
      this.xs[i]! += (this.tx[i]! - this.xs[i]!) * k;
      this.ys[i]! += (this.ty[i]! - this.ys[i]!) * k;
    }
    this.render(this.xs, this.ys, f);
  }

  /** Standing/acting pose, eased in after a mode change. */
  poseBlended(p: Pose, X: number, Y: number, f: number, dt: number): void {
    this.pose(p, X, Y, f, this.tx, this.ty);
    this.blend(dt, f);
  }

  /**
   * Belly crawl at (X, Y) facing f: body flat, head up, arms reaching forward
   * in turn and dragging the body, legs trailing with a feeble kick.
   */
  crawl(X: number, Y: number, f: number, t: number, dt: number, moving: boolean, weak: boolean): void {
    const d = this.d;
    const r = this.r;
    const ph = t * (moving ? (weak ? 5 : 8) : 1.5);
    const body = d.torso + d.pelvis;
    const xs = this.tx;
    const ys = this.ty;
    const set = (i: number, x: number, y: number) => {
      xs[i] = X + f * x;
      ys[i] = Y + y;
    };
    const heave = Math.max(0, Math.sin(ph)) * r * 0.12;
    set(2, -body * 0.45, -r * 0.3);
    set(1, body * 0.55, -r * 0.45 - heave);
    set(0, body * 0.55 + d.head * 0.75, -r * 0.45 - heave - d.head * 0.65);
    const reach = d.upper + d.fore;
    const arm = (ie: number, ih: number, phase: number) => {
      const c = Math.sin(phase);
      const hx = body * 0.55 + reach * (0.45 + 0.35 * c);
      const lift = Math.max(0, Math.cos(phase)) * r * 0.45;
      set(ih, hx, -r * 0.08 - lift);
      set(ie, body * 0.55 + (hx - body * 0.55) * 0.45, -r * 0.45 - heave - r * 0.5 - lift * 0.4);
    };
    arm(5, 6, ph);
    arm(3, 4, ph + Math.PI);
    const leg = (ik: number, ia: number, phase: number) => {
      const kick = Math.max(0, Math.sin(phase)) * r * 0.5;
      set(ik, -body * 0.45 - d.thigh * 0.95, -r * 0.2);
      set(ia, -body * 0.45 - d.thigh * 0.95 - d.shin * 0.85, -r * 0.15 - kick);
    };
    leg(9, 10, ph + Math.PI / 2);
    leg(7, 8, ph - Math.PI / 2);
    this.blend(dt, f);
  }

  /** Forward kinematics: feet at (X, Y), facing f = ±1. Writes the 11 skeleton points. */
  pose(p: Pose, X: number, Y: number, f: number, xs = this.xs, ys = this.ys): void {
    const d = this.d;
    const set = (i: number, x: number, y: number) => {
      xs[i] = X + f * x;
      ys[i] = Y + y;
    };
    const down = (a: number): [number, number] => [-Math.sin(a), Math.cos(a)];
    const hipY = -(d.thigh * Math.cos(Math.abs(p.legF) * 0.5) + d.shin + d.foot * 0.85) - p.bob;
    const hx = p.offX;
    const up: [number, number] = [Math.sin(p.lean), -Math.cos(p.lean)];
    const perp: [number, number] = [Math.cos(p.lean), Math.sin(p.lean)];
    const body = d.torso + d.pelvis;
    const nx = hx + up[0] * body;
    const ny = hipY + up[1] * body;
    set(2, hx, hipY);
    set(1, nx, ny);
    const hr = p.lean + p.headRot;
    set(0, nx + Math.sin(hr) * d.head, ny - Math.cos(hr) * d.head);
    const arm = (side: number, a: number, e: number, ie: number, ih: number) => {
      const sx = nx + perp[0] * d.shoulder * side - up[0] * d.shoulderDrop;
      const sy = ny + perp[1] * d.shoulder * side - up[1] * d.shoulderDrop;
      const u = down(p.lean + a);
      const ex = sx + u[0] * d.upper;
      const ey = sy + u[1] * d.upper;
      const v = down(p.lean + a + e);
      set(ie, ex, ey);
      set(ih, ex + v[0] * d.fore, ey + v[1] * d.fore);
    };
    arm(-1, p.armB, p.elbowB, 3, 4);
    arm(1, p.armF, p.elbowF, 5, 6);
    const leg = (side: number, a: number, kn: number, ik: number, ia: number) => {
      const jx = hx + perp[0] * d.hip * side;
      const jy = hipY + perp[1] * d.hip * side;
      const u = down(a);
      const kx = jx + u[0] * d.thigh;
      const ky = jy + u[1] * d.thigh;
      const v = down(a + kn);
      set(ik, kx, ky);
      set(ia, kx + v[0] * d.shin, ky + v[1] * d.shin);
    };
    leg(-1, p.legB, p.kneeB, 7, 8);
    leg(1, p.legF, p.kneeF, 9, 10);
  }

  /** Place every sprite from skeleton points (pose or ragdoll). */
  render(xs: ArrayLike<number>, ys: ArrayLike<number>, f: number): void {
    if (xs !== this.xs) {
      this.xs.set(xs as Float32Array);
      this.ys.set(ys as Float32Array);
    }
    const d = this.d;
    const X = this.xs;
    const Y = this.ys;
    // Body axis (neck → hips) and its perpendicular (towards the front side).
    let dx = X[2]! - X[1]!;
    let dy = Y[2]! - Y[1]!;
    const bl = Math.hypot(dx, dy) || 1;
    dx /= bl;
    dy /= bl;
    const kb = clamp(bl / (d.torso + d.pelvis), 0.75, 1.3);
    const px = dy * f;
    const py = -dx * f;
    const waistX = X[1]! + dx * d.torso * kb;
    const waistY = Y[1]! + dy * d.torso * kb;
    this.place('torso', X[1]!, Y[1]!, waistX, waistY, f, true);
    this.place('pelvis', waistX, waistY, X[2]!, Y[2]!, f, true);
    // Head: neck anchor on point 1, crown along neck → head centre.
    let hx = X[0]! - X[1]!;
    let hy = Y[0]! - Y[1]!;
    const hl = Math.hypot(hx, hy) || 1;
    hx /= hl;
    hy /= hl;
    this.place('head', X[1]!, Y[1]!, X[1]! + hx * d.head * 2, Y[1]! + hy * d.head * 2, f, false);
    for (const [side, up, fo, el, ha] of [
      [1, 'upperArmR', 'foreArmR', 5, 6],
      [-1, 'upperArmL', 'foreArmL', 3, 4],
    ] as const) {
      const sx = X[1]! + px * d.shoulder * side + dx * d.shoulderDrop;
      const sy = Y[1]! + py * d.shoulder * side + dy * d.shoulderDrop;
      this.place(up, sx, sy, X[el]!, Y[el]!, f, true);
      if (d.hand > 0) {
        // Split the forearm bone at the wrist and hang the hand off it.
        const w = 1 - d.hand / d.fore;
        const wx = X[el]! + (X[ha]! - X[el]!) * w;
        const wy = Y[el]! + (Y[ha]! - Y[el]!) * w;
        this.place(fo, X[el]!, Y[el]!, wx, wy, f, true);
        this.place(side > 0 ? 'handR' : 'handL', wx, wy, X[ha]!, Y[ha]!, f, true);
      } else this.place(fo, X[el]!, Y[el]!, X[ha]!, Y[ha]!, f, true);
    }
    for (const [side, th, sh, ft, kn, an] of [
      [1, 'thighR', 'shinR', 'footR', 9, 10],
      [-1, 'thighL', 'shinL', 'footL', 7, 8],
    ] as const) {
      const jx = X[2]! + px * d.hip * side - dx * d.hip * 0.3;
      const jy = Y[2]! + py * d.hip * side - dy * d.hip * 0.3;
      this.place(th, jx, jy, X[kn]!, Y[kn]!, f, true);
      this.place(sh, X[kn]!, Y[kn]!, X[an]!, Y[an]!, f, true);
      if (d.foot > 0) {
        let sx = X[an]! - X[kn]!;
        let sy = Y[an]! - Y[kn]!;
        const sl = Math.hypot(sx, sy) || 1;
        sx /= sl;
        sy /= sl;
        // Feet stay closer to upright than the shin so standing puppets plant them on the floor.
        const fx = sx * 0.5;
        const fy = sy * 0.5 + 0.5;
        const fl = Math.hypot(fx, fy) || 1;
        this.place(ft, X[an]!, Y[an]!, X[an]! + (fx / fl) * d.foot, Y[an]! + (fy / fl) * d.foot, f, false);
      }
    }
    let ex = X[6]! - X[5]!;
    let ey = Y[6]! - Y[5]!;
    const el = Math.hypot(ex, ey) || 1;
    ex /= el;
    ey /= el;
    this.hand = { x: X[6]! - ex * d.fore * 0.12, y: Y[6]! - ey * d.fore * 0.12, rot: Math.atan2(ey, ex) - Math.PI / 2 };
  }

  /** Put a part's joint anchor `a` on (ax, ay) and point its a→b axis at (bx, by). */
  private place(slot: Slot, ax: number, ay: number, bx: number, by: number, f: number, stretch: boolean): void {
    const s = this.sprites.get(slot);
    const p = this.def.parts[slot];
    if (!s || !p) return;
    const vx = p.b[0] - p.a[0];
    const vy = p.b[1] - p.a[1];
    const natural = Math.hypot(vx, vy) * this.k || 1;
    const k = stretch ? clamp(Math.hypot(bx - ax, by - ay) / natural, 0.8, 1.25) : 1;
    const big = slot === 'head' ? HEAD_SCALE : 1;
    const sx = this.k * f * big;
    const sy = this.k * k * big;
    s.pivot.set(p.a[0], p.a[1]);
    s.scale.set(sx, sy);
    s.position.set(ax, ay);
    s.rotation = Math.atan2(by - ay, bx - ax) - Math.atan2(vy * sy, vx * sx);
  }
}
