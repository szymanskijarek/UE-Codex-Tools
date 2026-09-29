import type { Graphics } from 'pixi.js';

/**
 * Two-handed heavy weapons (sim props with `heavy`). Until painted art lands in
 * the item atlas (names in HEAVY_ART, items.ts), they're drawn here: in local
 * space the grip is at the origin and the weapon extends along +y for `len` px
 * (the same convention as held equipment), so the same drawing works in hand
 * and, rotated, lying on the floor.
 */
const O = 0x1b1f2a;

type Drawer = (g: Graphics, len: number) => void;

const pole = (g: Graphics, len: number, w: number, color: number, to = 1): void => {
  g.roundRect(-w / 2, -len * 0.08, w, len * to, w / 2).fill(color).stroke({ width: 1, color: O });
};

const DRAW: Record<string, Drawer> = {
  'prop.frozen-salmon': (g, L) => {
    g.ellipse(0, L * 0.55, L * 0.17, L * 0.5).fill(0xfda4af).stroke({ width: 1.5, color: O });
    g.ellipse(0, L * 0.55, L * 0.07, L * 0.42).fill(0xfb7185);
    g.poly([0, L * 0.02, -L * 0.18, -L * 0.12, L * 0.18, -L * 0.12]).fill(0xfda4af).stroke({ width: 1.5, color: O });
    g.circle(-L * 0.06, L * 0.95, L * 0.03).fill(O);
    g.ellipse(L * 0.08, L * 0.4, L * 0.03, L * 0.12).fill({ color: 0xe0f2fe, alpha: 0.8 });
  },
  'prop.sale-sign': (g, L) => {
    pole(g, L, L * 0.06, 0x9ca3af, 0.75);
    g.roundRect(-L * 0.3, L * 0.62, L * 0.6, L * 0.34, 4).fill(0xfacc15).stroke({ width: 2, color: O });
    g.rect(-L * 0.22, L * 0.72, L * 0.44, L * 0.05).rect(-L * 0.18, L * 0.83, L * 0.36, L * 0.05).fill(0xdc2626);
  },
  'prop.coat-stand': (g, L) => {
    pole(g, L, L * 0.06, 0x92400e, 0.95);
    for (const s of [-1, 1]) g.moveTo(0, L * 0.85).lineTo(s * L * 0.16, L * 0.97).moveTo(0, L * 0.1).quadraticCurveTo(s * L * 0.14, L * 0.02, s * L * 0.14, -L * 0.06);
    g.stroke({ width: L * 0.035, color: 0x78350f });
  },
  'prop.novelty-cheque': (g, L) => {
    pole(g, L, L * 0.05, 0xd6d3d1, 0.3);
    g.roundRect(-L * 0.45, L * 0.25, L * 0.9, L * 0.55, 4).fill(0xf8fafc).stroke({ width: 2, color: O });
    g.rect(-L * 0.38, L * 0.33, L * 0.4, L * 0.06).fill(0x0a66c2);
    g.rect(-L * 0.38, L * 0.48, L * 0.76, L * 0.03).rect(-L * 0.38, L * 0.6, L * 0.5, L * 0.03).fill(0x94a3b8);
    g.rect(L * 0.1, L * 0.66, L * 0.28, L * 0.08).fill(0x16a34a);
  },
  'prop.platform-bench': (g, L) => {
    g.roundRect(-L * 0.12, 0, L * 0.24, L, 3).fill(0x64748b).stroke({ width: 1.5, color: O });
    for (let i = 0; i < 4; i++) g.rect(-L * 0.1, L * (0.06 + i * 0.24), L * 0.2, L * 0.16).fill(0x92400e);
    g.rect(-L * 0.18, L * 0.1, L * 0.06, L * 0.12).rect(-L * 0.18, L * 0.78, L * 0.06, L * 0.12).fill(O);
  },
  'prop.platform-sign': (g, L) => {
    pole(g, L, L * 0.05, 0x9ca3af, 0.7);
    g.roundRect(-L * 0.32, L * 0.62, L * 0.64, L * 0.3, 3).fill(0x1d4ed8).stroke({ width: 2, color: O });
    g.rect(-L * 0.24, L * 0.72, L * 0.48, L * 0.05).fill(0xffffff);
    g.circle(L * 0.2, L * 0.84, L * 0.04).fill(0xfacc15);
  },
  'prop.beer-keg': (g, L) => {
    pole(g, L, L * 0.05, 0x9ca3af, 0.3);
    g.roundRect(-L * 0.26, L * 0.25, L * 0.52, L * 0.7, L * 0.12).fill(0xa8a29e).stroke({ width: 2, color: O });
    g.rect(-L * 0.26, L * 0.38, L * 0.52, L * 0.05).rect(-L * 0.26, L * 0.78, L * 0.52, L * 0.05).fill(0x57534e);
  },
  'prop.pepper-grinder': (g, L) => {
    g.roundRect(-L * 0.12, 0, L * 0.24, L * 0.9, L * 0.1).fill(0x78350f).stroke({ width: 1.5, color: O });
    g.circle(0, L * 0.95, L * 0.1).fill(0x9ca3af).stroke({ width: 1, color: O });
    g.rect(-L * 0.12, L * 0.3, L * 0.24, L * 0.04).fill(0x451a03);
  },
  'prop.sledgehammer': (g, L) => {
    pole(g, L, L * 0.06, 0xb45309, 0.9);
    g.roundRect(-L * 0.22, L * 0.8, L * 0.44, L * 0.2, 3).fill(0x6b7280).stroke({ width: 2, color: O });
    g.rect(-L * 0.22, L * 0.8, L * 0.08, L * 0.2).rect(L * 0.14, L * 0.8, L * 0.08, L * 0.2).fill(0x4b5563);
  },
  'prop.road-sign': (g, L) => {
    pole(g, L, L * 0.05, 0x9ca3af, 0.7);
    g.poly([0, L * 0.98, -L * 0.28, L * 0.56, L * 0.28, L * 0.56]).fill(0xffffff).stroke({ width: 3, color: 0xef4444 });
    g.rect(-L * 0.03, L * 0.64, L * 0.06, L * 0.18).fill(O);
  },
  'prop.wooden-pallet': (g, L) => {
    g.rect(-L * 0.3, 0, L * 0.6, L).fill(0xd97706).stroke({ width: 1.5, color: O });
    for (let i = 1; i < 5; i++) g.rect(-L * 0.3, (L * i) / 5 - L * 0.02, L * 0.6, L * 0.04).fill(0x92400e);
    g.rect(-L * 0.04, 0, L * 0.08, L).fill({ color: 0x78350f, alpha: 0.6 });
  },
  'prop.rolled-carpet': (g, L) => {
    g.roundRect(-L * 0.12, 0, L * 0.24, L, L * 0.1).fill(0x7c3aed).stroke({ width: 1.5, color: O });
    for (let i = 1; i < 6; i++) g.moveTo(-L * 0.12, (L * i) / 6).lineTo(L * 0.12, (L * i) / 6 + L * 0.03);
    g.stroke({ width: 1, color: 0xfacc15 });
    g.circle(0, L, L * 0.12).fill(0x6d28d9).stroke({ width: 1, color: O });
  },
};

/** Draw a heavy weapon (grip at origin, along +y). Unknown ids get a generic plank. */
export function drawHeavy(g: Graphics, id: string, len: number): void {
  const d = DRAW[id];
  if (d) d(g, len);
  else g.roundRect(-len * 0.1, 0, len * 0.2, len, 3).fill(0x78716c).stroke({ width: 1.5, color: O });
}

/** In-hand length relative to the character radius (px), per weapon. */
export function heavyLength(id: string, r: number): number {
  const k: Record<string, number> = { 'prop.platform-bench': 3.2, 'prop.wooden-pallet': 2.6, 'prop.beer-keg': 2.4, 'prop.novelty-cheque': 3.0, 'prop.rolled-carpet': 3.2 };
  return r * (k[id] ?? 2.8);
}
