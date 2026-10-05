import type { Graphics } from 'pixi.js';

/**
 * Impact effects: what it looks like when someone takes damage, hits the
 * floor or gets knocked out. Each effect plays painted frames from the item
 * atlas (`fx-<id>-1` … `fx-<id>-<frames>`, brief in art/FX_BRIEF.md) when the
 * art exists, and a drawn stand-in until then, so art can arrive one effect at
 * a time without code changes.
 */
export type ImpactFxId =
  | 'hit'
  | 'hit-heavy'
  | 'crit'
  | 'slash'
  | 'zap'
  | 'scorch'
  | 'social'
  | 'bite'
  | 'sweat'
  | 'land-dust'
  | 'debris'
  | 'ko-stars'
  | 'parry'
  | 'explosion'
  | 'dash'
  /** Market floors (08, art/cryptobro/05-FX.md). */
  | 'laser-eyes'
  | 'liquidated-stamp'
  | 'margin-call'
  | 'coin-shower'
  | 'ceiling-launch';

export interface ImpactFxDef {
  /** Painted frames, played once over `ms`. */
  frames: number;
  ms: number;
  /** Drawn width as a multiple of a fighter's radius on screen (a fighter stands about 4.7 radii). */
  size: number;
  /** Where the effect sits on its point: the centre (bursts) or the bottom (floor dust). */
  anchor: 'center' | 'bottom';
  /** The art may be mirrored to point away from the attacker (slashes, dust). */
  directional: boolean;
  /** Stand-in drawing at progress p (0 → 1), centred on x, y, `w` wide, facing `dir`. */
  draw: (g: Graphics, p: number, x: number, y: number, w: number, dir: number, seed: number) => void;
}

const INK = 0x1b1f2a;
/** A deterministic 0–1 value per seed and index, so a stand-in keeps its shape while it animates. */
const rnd = (seed: number, i: number): number => {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const ease = (p: number): number => 1 - (1 - p) * (1 - p);

function burst(g: Graphics, x: number, y: number, r: number, points: number, inner: number, fill: number, alpha: number, seed: number): void {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + seed;
    const rr = i % 2 ? r * inner : r * (0.85 + rnd(seed, i) * 0.3);
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts).fill({ color: fill, alpha }).stroke({ width: Math.max(1.5, r * 0.09), color: INK, alpha });
}

function sparkle(g: Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
  g.poly([x, y - r, x + r * 0.22, y - r * 0.22, x + r, y, x + r * 0.22, y + r * 0.22, x, y + r, x - r * 0.22, y + r * 0.22, x - r, y, x - r * 0.22, y - r * 0.22]).fill({ color, alpha });
}

function puffs(g: Graphics, x: number, y: number, w: number, p: number, dir: number, seed: number, color: number, count: number): void {
  const k = 1 - p;
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const spread = (0.15 + rnd(seed, i) * 0.35) * w * ease(p);
    const px = x + side * spread + dir * w * 0.05;
    const py = y - (0.05 + rnd(seed, i + 9) * 0.12) * w * ease(p);
    const r = w * (0.09 + rnd(seed, i + 3) * 0.08) * (0.6 + p * 0.8);
    g.circle(px, py, r).fill({ color, alpha: 0.75 * k });
  }
}

export const IMPACT_FX: Record<ImpactFxId, ImpactFxDef> = {
  /** A punch, kick or thrown thing landing: a comic white starburst. */
  hit: {
    frames: 4,
    ms: 220,
    size: 2.2,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      const k = 1 - p;
      burst(g, x, y, (w / 2) * (0.5 + ease(p) * 0.5), 8, 0.45, 0xffffff, k, seed);
      g.circle(x, y, (w / 2) * (0.6 + p * 0.6)).stroke({ width: Math.max(1.5, w * 0.04), color: 0xffffff, alpha: 0.7 * k });
    },
  },
  /** A heavy weapon, a body thrown into a body, a machine: a bigger, hotter burst with chips flying. */
  'hit-heavy': {
    frames: 5,
    ms: 320,
    size: 3.2,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, dir, seed) => {
      const k = 1 - p;
      burst(g, x, y, (w / 2) * (0.45 + ease(p) * 0.55), 10, 0.4, 0xfb923c, k, seed);
      burst(g, x, y, (w / 2) * (0.25 + ease(p) * 0.3), 8, 0.5, 0xfff7d6, k, seed + 1);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (rnd(seed, i) - 0.5) * 2.4 + dir * 0.3;
        const d = (w / 2) * (0.4 + ease(p) * 0.9);
        g.rect(x + Math.cos(a) * d, y + Math.sin(a) * d + p * p * w * 0.3, w * 0.05, w * 0.05).fill({ color: 0x78716c, alpha: k });
      }
    },
  },
  /** A critical hit: a gold starburst with sparkles. */
  crit: {
    frames: 5,
    ms: 360,
    size: 3,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      const k = 1 - p;
      burst(g, x, y, (w / 2) * (0.45 + ease(p) * 0.55), 12, 0.42, 0xffd000, k, seed);
      burst(g, x, y, (w / 2) * (0.2 + ease(p) * 0.25), 6, 0.5, 0xffffff, k, seed + 2);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6 + seed;
        const d = (w / 2) * (0.7 + ease(p) * 0.4);
        sparkle(g, x + Math.cos(a) * d, y + Math.sin(a) * d, w * 0.08 * k, 0xfff7ae, k);
      }
    },
  },
  /** Sharp damage (scissors, shears, a saw): a curved white swipe. */
  slash: {
    frames: 4,
    ms: 220,
    size: 2.6,
    anchor: 'center',
    directional: true,
    draw: (g, p, x, y, w, dir) => {
      const k = 1 - p;
      const r = w * 0.42;
      const a0 = -2.3 + ease(p) * 0.9;
      const a1 = a0 + 1.6;
      const at = (a: number, rr: number) => [x + dir * Math.cos(a) * rr, y + Math.sin(a) * rr] as const;
      const steps = 10;
      const pts: number[] = [];
      for (let i = 0; i <= steps; i++) pts.push(...at(a0 + ((a1 - a0) * i) / steps, r));
      for (let i = steps; i >= 0; i--) pts.push(...at(a0 + ((a1 - a0) * i) / steps, r * (0.82 - 0.12 * Math.sin((i / steps) * Math.PI))));
      g.poly(pts).fill({ color: 0xffffff, alpha: k }).stroke({ width: Math.max(1.2, w * 0.025), color: INK, alpha: k });
    },
  },
  /** Electric damage: jagged cyan bolts. */
  zap: {
    frames: 4,
    ms: 260,
    size: 2.6,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      const k = 1 - p;
      const flick = Math.floor(p * 8);
      for (let b = 0; b < 5; b++) {
        const a = (b / 5) * Math.PI * 2 + rnd(seed, b + flick);
        let px = x;
        let py = y;
        g.moveTo(px, py);
        for (let s = 1; s <= 3; s++) {
          const d = (w / 2) * (s / 3) * (0.6 + ease(p) * 0.5);
          px = x + Math.cos(a + (rnd(seed, b * 7 + s + flick) - 0.5) * 0.9) * d;
          py = y + Math.sin(a + (rnd(seed, b * 5 + s + flick) - 0.5) * 0.9) * d;
          g.lineTo(px, py);
        }
      }
      g.stroke({ width: Math.max(2, w * 0.06), color: INK, alpha: k });
      g.stroke({ width: Math.max(1, w * 0.03), color: 0x67e8f9, alpha: k });
      g.circle(x, y, w * 0.12 * k).fill({ color: 0xfefce8, alpha: k });
    },
  },
  /** Fire damage: a flame puff that turns to smoke. */
  scorch: {
    frames: 5,
    ms: 420,
    size: 2.4,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      const k = 1 - p;
      for (let i = 0; i < 6; i++) {
        const dx = (rnd(seed, i) - 0.5) * w * 0.5;
        const dy = -p * w * (0.3 + rnd(seed, i + 4) * 0.3);
        const r = w * (0.1 + rnd(seed, i + 8) * 0.08) * (0.7 + p * 0.7);
        const smoke = p > 0.45 + rnd(seed, i) * 0.2;
        g.circle(x + dx, y + dy, r).fill({ color: smoke ? 0x6b7280 : i % 2 ? 0xfb923c : 0xfde047, alpha: (smoke ? 0.5 : 0.9) * k });
      }
    },
  },
  /** Social damage (insults, embarrassment): anger marks and a shock line or two. */
  social: {
    frames: 4,
    ms: 420,
    size: 1.8,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w) => {
      const k = 1 - p;
      const s = (w / 2) * (0.5 + ease(p) * 0.3);
      // The manga "throbbing vein" mark: four little hooks around a centre.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const cx = x + Math.cos(a) * s * 0.35;
        const cy = y + Math.sin(a) * s * 0.35;
        g.moveTo(cx + Math.cos(a - 0.8) * s * 0.3, cy + Math.sin(a - 0.8) * s * 0.3)
          .quadraticCurveTo(cx, cy, cx + Math.cos(a + 0.8) * s * 0.3, cy + Math.sin(a + 0.8) * s * 0.3);
      }
      g.stroke({ width: Math.max(2, w * 0.07), color: 0xef4444, alpha: k });
    },
  },
  /** An animal's bite, peck or pinch: two rows of teeth snapping shut. */
  bite: {
    frames: 4,
    ms: 300,
    size: 1.8,
    anchor: 'center',
    directional: true,
    draw: (g, p, x, y, w) => {
      const k = 1 - Math.max(0, (p - 0.5) * 2);
      const gap = (w / 2) * 0.55 * (1 - ease(Math.min(1, p * 2)));
      const half = w * 0.36;
      for (const side of [-1, 1]) {
        const base = y + side * (gap + w * 0.04);
        const pts: number[] = [x - half, base - side * w * 0.12];
        for (let i = 0; i <= 5; i++) {
          const tx = x - half + (i / 5) * half * 2;
          pts.push(tx, base, tx + half * 0.2, base + side * w * 0.12);
        }
        pts.push(x + half, base - side * w * 0.12);
        g.poly(pts).fill({ color: 0xffffff, alpha: k }).stroke({ width: Math.max(1.2, w * 0.03), color: INK, alpha: k });
      }
      if (p > 0.45) burst(g, x, y, (w / 2) * 0.35 * k, 6, 0.5, 0xffffff, k, 1);
    },
  },
  /** Pain sweat: a few comic droplets flying off the head (never blood). */
  sweat: {
    frames: 4,
    ms: 450,
    size: 1.6,
    anchor: 'center',
    directional: true,
    draw: (g, p, x, y, w, dir, seed) => {
      const k = 1 - p;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + dir * (0.4 + i * 0.35) + (rnd(seed, i) - 0.5) * 0.3;
        const d = (w / 2) * (0.2 + ease(p) * 0.8);
        const dx = x + Math.cos(a) * d;
        const dy = y + Math.sin(a) * d + p * p * w * 0.35;
        const r = w * 0.055;
        g.poly([dx, dy - r * 2, dx + r, dy, dx, dy + r, dx - r, dy]).fill({ color: 0xbae6fd, alpha: k }).stroke({ width: 1, color: INK, alpha: k });
      }
    },
  },
  /** A body hitting the floor: dust rolling out to both sides along the ground. */
  'land-dust': {
    frames: 6,
    ms: 650,
    size: 4,
    anchor: 'bottom',
    directional: true,
    draw: (g, p, x, y, w, dir, seed) => puffs(g, x, y, w, p, dir, seed, 0xe7dccb, 9),
  },
  /** Chips and pebbles knocked loose (walls, big slams). */
  debris: {
    frames: 5,
    ms: 500,
    size: 2.6,
    anchor: 'bottom',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      const k = 1 - Math.max(0, (p - 0.6) / 0.4);
      for (let i = 0; i < 7; i++) {
        const vx = (rnd(seed, i) - 0.5) * w * 1.1;
        const vy = -(0.4 + rnd(seed, i + 7) * 0.5) * w;
        const px = x + vx * p;
        const py = Math.min(y, y + vy * p + w * 1.6 * p * p);
        const s = w * (0.03 + rnd(seed, i + 3) * 0.04);
        g.rect(px - s / 2, py - s, s, s).fill({ color: i % 3 ? 0x78716c : 0xa8a29e, alpha: k }).stroke({ width: 1, color: INK, alpha: k * 0.6 });
      }
    },
  },
  /** A knockout: a white flash and a ring of stars flying out. */
  'ko-stars': {
    frames: 6,
    ms: 650,
    size: 3.4,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      const k = 1 - p;
      if (p < 0.3) g.circle(x, y, (w / 2) * (0.3 + p * 1.6)).fill({ color: 0xffffff, alpha: (0.3 - p) * 2.5 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + seed + p * 1.5;
        const d = (w / 2) * (0.25 + ease(p) * 0.7);
        sparkle(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, w * 0.09 * (0.6 + k * 0.4), i % 2 ? 0xffd000 : 0xffffff, k);
      }
    },
  },
  /** A parried blow: a sharp yellow-white cross flash. */
  parry: {
    frames: 4,
    ms: 240,
    size: 2.2,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w) => {
      const k = 1 - p;
      const r = (w / 2) * (0.5 + ease(p) * 0.5);
      sparkle(g, x, y, r, 0xfde047, k);
      sparkle(g, x, y, r * 0.55, 0xffffff, k);
    },
  },
  /** Something going bang (a gas bottle, a microwave): a fireball with a dark smoke ring. Sized by the caller to the blast radius. */
  explosion: {
    frames: 6,
    ms: 600,
    size: 6,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w) => {
      const k = 1 - p;
      const r = w / 2;
      g.circle(x, y, r * (0.3 + p * 0.8)).fill({ color: 0xff7a00, alpha: 0.55 * k });
      g.circle(x, y, r * (0.15 + p * 0.5)).fill({ color: 0xfff176, alpha: 0.7 * k });
      g.circle(x, y, r * (0.3 + p)).stroke({ width: 4, color: INK, alpha: 0.4 * k });
    },
  },
  /** A dash or dodge: a scuff of dust and speed streaks left behind, pointing back along the move. */
  dash: {
    frames: 4,
    ms: 380,
    size: 2.6,
    anchor: 'bottom',
    directional: true,
    draw: (g, p, x, y, w, dir, seed) => {
      const k = 1 - p;
      for (let i = 0; i < 4; i++) {
        const h = w * (0.12 + i * 0.12);
        const len = w * (0.35 + rnd(seed, i) * 0.3) * (0.7 + p * 0.5);
        g.moveTo(x, y - h).lineTo(x - dir * len, y - h);
      }
      g.stroke({ width: Math.max(1.5, w * 0.04), color: 0xffffff, alpha: 0.7 * k });
      g.ellipse(x + dir * w * 0.05, y, w * (0.3 - p * 0.12), w * 0.08).fill({ color: 0xd6d3d1, alpha: 0.45 * k });
    },
  },
  /** The OG's laser eyes: two red beams shooting forward from the eyes. */
  'laser-eyes': {
    frames: 4,
    ms: 420,
    size: 5,
    anchor: 'center',
    directional: true,
    draw: (g, p, x, y, w, dir) => {
      const len = w * ease(Math.min(1, p * 1.6));
      for (const dy of [-w * 0.04, w * 0.04]) g.moveTo(x, y + dy).lineTo(x + dir * len, y + dy);
      g.stroke({ width: Math.max(2, w * 0.025), color: 0xef4444, alpha: 1 - p * 0.6 });
    },
  },
  /** A liquidation: the giant red stamp slamming down over the fighter. */
  'liquidated-stamp': {
    frames: 5,
    ms: 1600,
    size: 7,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w) => {
      const s = 1 + Math.max(0, 0.3 - p) * 4;
      g.roundRect(x - (w / 2) * s * 0.9, y - w * 0.22 * s, w * 0.9 * s, w * 0.44 * s, 8).stroke({ width: Math.max(3, w * 0.04), color: 0xdc2626, alpha: 1 - p * 0.4 });
    },
  },
  /** The margin-call klaxon flashing over a leveraged fighter as they go down. */
  'margin-call': {
    frames: 4,
    ms: 700,
    size: 2.4,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      burst(g, x, y, (w / 2) * (0.6 + 0.4 * Math.abs(Math.sin(p * 9))), 8, 0.5, 0xef4444, 1 - p * 0.5, seed);
    },
  },
  /** The liquidated fighter's coins bursting out and raining down. */
  'coin-shower': {
    frames: 6,
    ms: 1200,
    size: 3.6,
    anchor: 'bottom',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      for (let i = 0; i < 8; i++) {
        const a = rnd(seed, i) * 2 - 1;
        const h = Math.sin(Math.PI * Math.min(1, p * 1.2)) * w * (0.4 + rnd(seed, i + 5) * 0.4);
        g.circle(x + a * w * 0.45 * ease(p), y - h, w * 0.035).fill(0xfacc15).stroke({ width: 1, color: INK });
      }
    },
  },
  /** Bursting out through the ceiling tiles, above the fighter. */
  'ceiling-launch': {
    frames: 5,
    ms: 900,
    size: 3,
    anchor: 'center',
    directional: false,
    draw: (g, p, x, y, w, _d, seed) => {
      burst(g, x, y, (w / 2) * (0.4 + ease(p) * 0.6), 7, 0.45, 0xe5e7eb, 1 - p, seed);
    },
  },
};
