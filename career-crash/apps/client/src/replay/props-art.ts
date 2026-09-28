import type { Graphics } from 'pixi.js';

/**
 * Procedural prop art (placeholder until generated sprites arrive, 04 Phase 7).
 * Each drawer paints a recognisable everyday object in local space: origin at
 * the floor contact point, up is -y, `u` is the prop radius in pixels.
 */
const O = 0x1b1f2a;

type Drawer = (g: Graphics, u: number) => void;

const ow = (u: number): number => Math.max(1, u * 0.12);
const shadow = (g: Graphics, u: number, w = 1): void => {
  g.ellipse(0, 0, u * w, u * 0.35 * w).fill({ color: 0x000000, alpha: 0.18 });
};

const DRAWERS: Record<string, Drawer> = {
  'prop.shopping-trolley': (g, u) => {
    shadow(g, u, 1.1);
    const s = ow(u) * 0.8;
    g.circle(-u * 0.6, -u * 0.12, u * 0.14).circle(u * 0.55, -u * 0.12, u * 0.14).fill(0x222222);
    g.poly([-u * 0.95, -u * 1.5, u * 0.8, -u * 1.5, u * 0.6, -u * 0.35, -u * 0.75, -u * 0.35]).fill({ color: 0xcfd6de, alpha: 0.35 }).stroke({ width: s, color: 0x6b7280 });
    for (let i = 1; i < 4; i++) {
      const x = -u * 0.95 + (u * 1.75 * i) / 4;
      g.moveTo(x, -u * 1.5).lineTo(x - u * 0.05 * i, -u * 0.35);
    }
    g.moveTo(-u * 0.88, -u * 0.95).lineTo(u * 0.7, -u * 0.95);
    g.stroke({ width: s * 0.6, color: 0x6b7280 });
    g.moveTo(u * 0.8, -u * 1.5).lineTo(u * 1.05, -u * 1.85).stroke({ width: s * 1.4, color: 0xd93b2b });
  },
  'prop.cardboard-display': (g, u) => {
    shadow(g, u);
    g.rect(-u * 0.8, -u * 2.4, u * 1.6, u * 2.4).fill(0xe4a15a).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.8, -u * 2.4, u * 1.6, u * 0.45).fill(0xd93b2b);
    for (let i = 0; i < 3; i++) g.rect(-u * 0.6 + i * u * 0.42, -u * 1.7, u * 0.34, u * 0.55).fill(0xfbbf24).stroke({ width: 1, color: O });
    for (let i = 0; i < 3; i++) g.rect(-u * 0.6 + i * u * 0.42, -u * 1.0, u * 0.34, u * 0.55).fill(0x60a5fa).stroke({ width: 1, color: O });
  },
  'prop.cereal-box': (g, u) => {
    shadow(g, u);
    g.rect(-u * 0.6, -u * 2, u * 1.2, u * 2).fill(0xfbbf24).stroke({ width: ow(u), color: O });
    g.circle(0, -u * 0.8, u * 0.35).fill(0xffffff).stroke({ width: 1, color: O });
    g.rect(-u * 0.6, -u * 2, u * 1.2, u * 0.4).fill(0xef4444);
  },
  'prop.watermelon': (g, u) => {
    shadow(g, u);
    g.ellipse(0, -u * 0.7, u * 1.0, u * 0.7).fill(0x16a34a).stroke({ width: ow(u), color: O });
    for (let i = -2; i <= 2; i++) g.moveTo(i * u * 0.3, -u * 1.35).quadraticCurveTo(i * u * 0.42, -u * 0.7, i * u * 0.3, -u * 0.05);
    g.stroke({ width: Math.max(1, u * 0.1), color: 0x14532d });
  },
  'prop.wine-bottle': (g, u) => bottle(g, u, 0x7f1d1d, 0xf5f5f4),
  'prop.olive-oil': (g, u) => bottle(g, u, 0xa3a23a, 0x365314),
  'prop.frozen-turkey': (g, u) => {
    shadow(g, u);
    g.ellipse(0, -u * 0.6, u * 0.95, u * 0.6).fill(0xf5e6c8).stroke({ width: ow(u), color: O });
    g.circle(-u * 0.95, -u * 0.95, u * 0.22).circle(u * 0.95, -u * 0.95, u * 0.22).fill(0xf5e6c8).stroke({ width: 1, color: O });
    for (let i = 0; i < 6; i++) g.circle(-u * 0.6 + i * u * 0.25, -u * (0.5 + (i % 2) * 0.3), u * 0.06).fill(0xbfdbfe);
  },
  'prop.soda-can': (g, u) => {
    shadow(g, u);
    g.roundRect(-u * 0.55, -u * 1.9, u * 1.1, u * 1.9, u * 0.2).fill(0xdc2626).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.55, -u * 1.9, u * 1.1, u * 0.3).fill(0xd1d5db);
    g.moveTo(-u * 0.45, -u * 0.9).bezierCurveTo(-u * 0.1, -u * 1.3, u * 0.1, -u * 0.5, u * 0.45, -u * 0.9).stroke({ width: Math.max(1, u * 0.12), color: 0xffffff });
  },
  'prop.vending-machine': (g, u) => {
    shadow(g, u, 1.1);
    g.roundRect(-u * 0.9, -u * 3.2, u * 1.8, u * 3.2, u * 0.12).fill(0x1d4ed8).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.7, -u * 3.0, u * 1.0, u * 2.2).fill(0xdbeafe).stroke({ width: 1, color: O });
    const cols = [0xdc2626, 0x16a34a, 0xf59e0b, 0x7c3aed];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.rect(-u * 0.62 + c * u * 0.32, -u * 2.9 + r * u * 0.52, u * 0.22, u * 0.36).fill(cols[(r + c) % 4]!);
    g.rect(u * 0.42, -u * 2.6, u * 0.3, u * 0.9).fill(0x111827);
    g.rect(-u * 0.7, -u * 0.6, u * 1.0, u * 0.35).fill(0x111827);
  },
  'prop.freezer': (g, u) => {
    shadow(g, u, 1.2);
    g.roundRect(-u * 1.1, -u * 1.5, u * 2.2, u * 1.5, u * 0.15).fill(0xe0f2fe).stroke({ width: ow(u), color: O });
    g.rect(-u * 1.0, -u * 1.45, u * 2.0, u * 0.55).fill({ color: 0x7dd3fc, alpha: 0.7 });
    g.moveTo(0, -u * 1.45).lineTo(0, -u * 0.9).stroke({ width: 1, color: O });
    g.moveTo(-u * 0.8, -u * 1.3).lineTo(-u * 0.5, -u * 1.05).moveTo(u * 0.3, -u * 1.3).lineTo(u * 0.6, -u * 1.05).stroke({ width: 1, color: 0xffffff });
  },
  'prop.mop-bucket': (g, u) => {
    shadow(g, u);
    g.poly([-u * 0.9, -u * 1.2, u * 0.9, -u * 1.2, u * 0.7, 0, -u * 0.7, 0]).fill(0xfacc15).stroke({ width: ow(u), color: O });
    g.ellipse(0, -u * 1.2, u * 0.9, u * 0.22).fill(0x60a5fa).stroke({ width: 1, color: O });
    g.moveTo(u * 0.2, -u * 1.2).lineTo(u * 0.7, -u * 2.9).stroke({ width: Math.max(1.5, u * 0.14), color: 0x92400e });
  },
  'prop.wet-floor-sign': (g, u) => {
    shadow(g, u);
    g.poly([0, -u * 2.2, u * 0.8, 0, -u * 0.8, 0]).fill(0xfde047).stroke({ width: ow(u), color: O });
    g.poly([0, -u * 1.5, u * 0.35, -u * 0.6, -u * 0.35, -u * 0.6]).stroke({ width: Math.max(1, u * 0.1), color: O });
    g.rect(-u * 0.04, -u * 1.25, u * 0.08, u * 0.35).fill(O);
  },
  'prop.office-chair': (g, u) => {
    shadow(g, u);
    g.moveTo(-u * 0.8, -u * 0.1).lineTo(u * 0.8, -u * 0.1).stroke({ width: Math.max(1, u * 0.14), color: 0x111827 });
    g.circle(-u * 0.8, -u * 0.08, u * 0.12).circle(u * 0.8, -u * 0.08, u * 0.12).circle(0, -u * 0.08, u * 0.12).fill(0x111827);
    g.rect(-u * 0.07, -u * 0.9, u * 0.14, u * 0.8).fill(0x6b7280);
    g.roundRect(-u * 0.75, -u * 1.15, u * 1.5, u * 0.3, u * 0.1).fill(0x334155).stroke({ width: ow(u), color: O });
    g.roundRect(-u * 0.6, -u * 2.3, u * 1.2, u * 1.1, u * 0.25).fill(0x334155).stroke({ width: ow(u), color: O });
  },
  'prop.water-cooler': (g, u) => {
    shadow(g, u);
    g.rect(-u * 0.6, -u * 1.9, u * 1.2, u * 1.9).fill(0xf1f5f9).stroke({ width: ow(u), color: O });
    g.roundRect(-u * 0.55, -u * 3.1, u * 1.1, u * 1.25, u * 0.35).fill({ color: 0x60a5fa, alpha: 0.8 }).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.25, -u * 1.5, u * 0.18, u * 0.18).fill(0x3b82f6).rect(u * 0.07, -u * 1.5, u * 0.18, u * 0.18).fill(0xef4444);
  },
  'prop.printer': (g, u) => {
    shadow(g, u, 1.1);
    g.roundRect(-u * 1.0, -u * 1.2, u * 2.0, u * 1.2, u * 0.12).fill(0xe5e7eb).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.7, -u * 1.55, u * 1.4, u * 0.4).fill(0xffffff).stroke({ width: 1, color: O });
    g.rect(-u * 0.8, -u * 0.55, u * 1.6, u * 0.12).fill(0x111827);
    g.circle(u * 0.7, -u * 0.95, u * 0.08).fill(0x22c55e);
  },
  'prop.laptop': (g, u) => {
    shadow(g, u);
    g.poly([-u * 0.9, -u * 0.1, u * 0.9, -u * 0.1, u * 0.7, -u * 0.35, -u * 0.7, -u * 0.35]).fill(0x374151).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.7, -u * 1.45, u * 1.4, u * 1.1).fill(0x374151).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.58, -u * 1.33, u * 1.16, u * 0.86).fill(0x93c5fd);
  },
  'prop.stapler': (g, u) => {
    shadow(g, u);
    g.roundRect(-u * 1.0, -u * 0.5, u * 2.0, u * 0.35, u * 0.1).fill(0x111827);
    g.roundRect(-u * 1.0, -u * 0.95, u * 1.9, u * 0.4, u * 0.18).fill(0xdc2626).stroke({ width: ow(u), color: O });
  },
  'prop.coffee-machine': (g, u) => {
    shadow(g, u);
    g.roundRect(-u * 0.9, -u * 2.2, u * 1.8, u * 2.2, u * 0.15).fill(0x78350f).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.6, -u * 1.9, u * 1.2, u * 0.5).fill(0x111827);
    g.rect(-u * 0.12, -u * 1.25, u * 0.24, u * 0.3).fill(0x9ca3af);
    g.roundRect(-u * 0.25, -u * 0.75, u * 0.5, u * 0.55, u * 0.08).fill(0xffffff).stroke({ width: 1, color: O });
  },
  'prop.potted-plant': (g, u) => {
    shadow(g, u);
    g.poly([-u * 0.6, -u * 0.9, u * 0.6, -u * 0.9, u * 0.45, 0, -u * 0.45, 0]).fill(0xc2410c).stroke({ width: ow(u), color: O });
    const leaves: [number, number, number][] = [
      [0, -1.9, 0.5],
      [-0.5, -1.5, 0.42],
      [0.5, -1.5, 0.42],
      [-0.2, -2.4, 0.35],
      [0.3, -2.3, 0.35],
    ];
    for (const [x, y, r] of leaves) g.circle(x * u, y * u, r * u).fill(0x16a34a).stroke({ width: 1, color: O });
  },
  'prop.filing-cabinet': (g, u) => {
    shadow(g, u);
    g.rect(-u * 0.8, -u * 3.0, u * 1.6, u * 3.0).fill(0x9ca3af).stroke({ width: ow(u), color: O });
    for (let i = 0; i < 3; i++) {
      g.rect(-u * 0.68, -u * 2.9 + i * u * 0.97, u * 1.36, u * 0.85).stroke({ width: 1, color: O });
      g.rect(-u * 0.22, -u * 2.55 + i * u * 0.97, u * 0.44, u * 0.1).fill(O);
    }
  },
  'prop.paper-stack': (g, u) => {
    shadow(g, u);
    for (let i = 0; i < 4; i++) g.rect(-u * 0.8 + (i % 2) * u * 0.08, -u * 0.3 * (i + 1), u * 1.6, u * 0.3).fill(0xf8fafc).stroke({ width: 1, color: 0x94a3b8 });
  },
  'prop.power-strip': (g, u) => {
    g.moveTo(u * 0.9, -u * 0.2).bezierCurveTo(u * 1.8, -u * 0.6, u * 2.2, u * 0.4, u * 3.0, 0).stroke({ width: Math.max(1, u * 0.12), color: 0x111827 });
    g.roundRect(-u * 1.0, -u * 0.45, u * 1.9, u * 0.45, u * 0.1).fill(0xf8fafc).stroke({ width: ow(u), color: O });
    for (let i = 0; i < 3; i++) g.circle(-u * 0.6 + i * u * 0.55, -u * 0.22, u * 0.1).fill(0x111827);
    g.circle(u * 0.75, -u * 0.22, u * 0.07).fill(0xef4444);
  },
  'prop.fire-extinguisher': (g, u) => {
    shadow(g, u);
    g.roundRect(-u * 0.5, -u * 2.2, u * 1.0, u * 2.2, u * 0.4).fill(0xdc2626).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.25, -u * 2.6, u * 0.5, u * 0.4).fill(0x9ca3af).stroke({ width: 1, color: O });
    g.moveTo(u * 0.25, -u * 2.45).quadraticCurveTo(u * 1.0, -u * 2.3, u * 0.7, -u * 1.2).stroke({ width: Math.max(1, u * 0.12), color: 0x111827 });
    g.rect(-u * 0.5, -u * 1.4, u * 1.0, u * 0.35).fill(0xffffff);
  },
  'prop.gas-canister': (g, u) => {
    shadow(g, u);
    g.roundRect(-u * 0.6, -u * 2.0, u * 1.2, u * 2.0, u * 0.5).fill(0xef4444).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.6, -u * 1.2, u * 1.2, u * 0.35).fill(0xfacc15);
    g.poly([0, -u * 1.15, u * 0.15, -u * 0.9, -u * 0.15, -u * 0.9]).fill(O);
    g.rect(-u * 0.18, -u * 2.35, u * 0.36, u * 0.4).fill(0x6b7280).stroke({ width: 1, color: O });
  },
  'prop.rubber-chicken': (g, u) => {
    shadow(g, u);
    g.ellipse(0, -u * 0.5, u * 1.1, u * 0.35).fill(0xfacc15).stroke({ width: ow(u), color: O });
    g.circle(u * 1.05, -u * 0.8, u * 0.3).fill(0xfacc15).stroke({ width: ow(u), color: O });
    g.poly([u * 1.3, -u * 0.8, u * 1.7, -u * 0.72, u * 1.3, -u * 0.62]).fill(0xf97316);
    g.poly([u * 0.85, -u * 1.05, u * 1.0, -u * 1.35, u * 1.15, -u * 1.05]).fill(0xef4444);
    g.circle(u * 1.1, -u * 0.88, u * 0.05).fill(O);
  },
  'prop.cake': (g, u) => {
    shadow(g, u);
    g.roundRect(-u * 0.9, -u * 0.9, u * 1.8, u * 0.9, u * 0.1).fill(0xfbcfe8).stroke({ width: ow(u), color: O });
    g.roundRect(-u * 0.55, -u * 1.55, u * 1.1, u * 0.65, u * 0.1).fill(0xf9a8d4).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.05, -u * 1.95, u * 0.1, u * 0.4).fill(0x60a5fa);
    g.ellipse(0, -u * 2.05, u * 0.09, u * 0.15).fill(0xf59e0b);
  },
  'prop.coffee-cup': (g, u) => {
    shadow(g, u);
    g.poly([-u * 0.55, -u * 1.7, u * 0.55, -u * 1.7, u * 0.4, 0, -u * 0.4, 0]).fill(0xffffff).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.5, -u * 1.15, u * 1.0, u * 0.45).fill(0x92400e);
    g.roundRect(-u * 0.65, -u * 1.95, u * 1.3, u * 0.3, u * 0.1).fill(0x111827);
  },
  'prop.cardboard-box': (g, u) => {
    shadow(g, u);
    g.rect(-u * 0.9, -u * 1.5, u * 1.8, u * 1.5).fill(0xc49a6c).stroke({ width: ow(u), color: O });
    g.rect(-u * 0.15, -u * 1.5, u * 0.3, u * 1.5).fill(0xe7c9a0);
    g.rect(-u * 0.7, -u * 0.6, u * 0.5, u * 0.3).fill(0xffffff);
  },
  'prop.snack': (g, u) => {
    shadow(g, u);
    g.poly([-u * 0.9, 0, u * 0.9, 0, 0, -u * 1.1]).fill(0xfde68a).stroke({ width: ow(u), color: O });
    g.moveTo(-u * 0.7, -u * 0.25).lineTo(u * 0.7, -u * 0.25).stroke({ width: Math.max(1, u * 0.15), color: 0x16a34a });
  },
  'prop.floor-scrubber': (g, u) => {
    shadow(g, u, 1.2);
    // Ride-on scrubber: body, seat, steering column, spinning brush skirt, hazard light.
    g.roundRect(-u * 1.1, -u * 0.35, u * 2.2, u * 0.35, u * 0.15).fill(0x1f2937);
    g.roundRect(-u * 1.0, -u * 1.25, u * 2.0, u * 1.0, u * 0.25).fill(0x0ea5e9).stroke({ width: ow(u), color: O });
    g.rect(-u * 1.0, -u * 0.75, u * 2.0, u * 0.14).fill(0xfacc15);
    g.roundRect(-u * 0.7, -u * 1.75, u * 0.6, u * 0.5, u * 0.12).fill(0x111827);
    g.moveTo(u * 0.45, -u * 1.25).lineTo(u * 0.6, -u * 1.9).stroke({ width: Math.max(1.5, u * 0.1), color: 0x111827 });
    g.ellipse(u * 0.6, -u * 1.95, u * 0.22, u * 0.08).fill(0x111827);
    g.circle(-u * 0.9, -u * 1.35, u * 0.12).fill(0xf97316).stroke({ width: 1, color: O });
    g.circle(u * 0.75, -u * 0.12, u * 0.2).circle(-u * 0.75, -u * 0.12, u * 0.2).fill(0x111827);
  },
  'prop.robot-vacuum': (g, u) => {
    shadow(g, u, 1);
    g.ellipse(0, -u * 0.25, u * 1.0, u * 0.45).fill(0x374151).stroke({ width: ow(u), color: O });
    g.ellipse(0, -u * 0.4, u * 0.85, u * 0.35).fill(0x4b5563);
    g.circle(u * 0.35, -u * 0.45, u * 0.12).fill(0x22c55e);
    g.moveTo(-u * 0.5, -u * 0.4).lineTo(u * 0.1, -u * 0.4).stroke({ width: Math.max(1, u * 0.08), color: 0x9ca3af });
  },
  'prop.garden-rake': (g, u) => {
    // Lying on the floor, tines up. Classic.
    g.moveTo(-u * 1.3, -u * 0.1).lineTo(u * 0.9, -u * 0.25).stroke({ width: Math.max(1.5, u * 0.14), color: 0x92400e });
    g.rect(u * 0.85, -u * 0.55, u * 0.14, u * 0.6).fill(0x6b7280);
    for (let i = 0; i < 5; i++) g.moveTo(u * 0.92, -u * 0.5 + i * u * 0.12).lineTo(u * 1.2, -u * 0.62 + i * u * 0.12);
    g.stroke({ width: Math.max(1, u * 0.06), color: 0x6b7280 });
  },
  'prop.scrap-metal': (g, u) => {
    shadow(g, u);
    g.poly([-u * 0.9, 0, -u * 0.5, -u * 0.9, 0, -u * 0.5, u * 0.4, -u * 1.1, u * 0.9, 0]).fill(0x94a3b8).stroke({ width: ow(u), color: O });
  },
};

function bottle(g: Graphics, u: number, body: number, label: number): void {
  shadow(g, u);
  g.roundRect(-u * 0.45, -u * 1.8, u * 0.9, u * 1.8, u * 0.2).fill(body).stroke({ width: ow(u), color: O });
  g.rect(-u * 0.15, -u * 2.6, u * 0.3, u * 0.85).fill(body).stroke({ width: ow(u), color: O });
  g.rect(-u * 0.45, -u * 1.2, u * 0.9, u * 0.5).fill(label);
}

/** Draw a solid prop. Unknown ids fall back to a coloured box or ball. */
export function drawProp(g: Graphics, id: string, u: number, color: number, square: boolean): void {
  const d = DRAWERS[id];
  if (d) return d(g, u);
  shadow(g, u);
  if (square) g.roundRect(-u, -u * 1.7, u * 2, u * 1.7, u * 0.2).fill(color).stroke({ width: ow(u), color: O });
  else g.circle(0, -u * 0.9, u * 0.9).fill(color).stroke({ width: ow(u), color: O });
}

/**
 * Animated ground areas (spills, fire, sparks...). Drawn unsquashed; the
 * caller squashes the container vertically for the 3/4 view. `t` is seconds.
 */
export function drawArea(g: Graphics, id: string, rr: number, color: number, t: number, seed: number): void {
  g.clear();
  const rnd = (k: number): number => {
    const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  switch (id) {
    case 'prop.fire-patch': {
      g.circle(0, 0, rr).fill({ color: 0xf97316, alpha: 0.35 });
      g.circle(0, 0, rr * 0.6).fill({ color: 0xfacc15, alpha: 0.35 });
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(i);
        const d = rr * (0.2 + rnd(i + 10) * 0.6);
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        const h = rr * (0.5 + 0.35 * Math.sin(t * 9 + i * 1.7));
        g.poly([x - rr * 0.14, y, x + rr * 0.14, y, x, y - h * 1.6]).fill({ color: i % 2 ? 0xef4444 : 0xfb923c, alpha: 0.9 });
      }
      break;
    }
    case 'prop.sparks': {
      g.circle(0, 0, rr).fill({ color: 0xfde047, alpha: 0.18 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 5 + rnd(i) * 3;
        let x = 0;
        let y = 0;
        g.moveTo(0, 0);
        for (let k = 1; k <= 4; k++) {
          x = Math.cos(a) * rr * (k / 4) + (rnd(i * 7 + k + Math.floor(t * 12)) - 0.5) * rr * 0.4;
          y = Math.sin(a) * rr * (k / 4) + (rnd(i * 5 + k + Math.floor(t * 12)) - 0.5) * rr * 0.4;
          g.lineTo(x, y);
        }
      }
      g.stroke({ width: Math.max(1.5, rr * 0.06), color: 0xfff59d });
      break;
    }
    case 'prop.broken-glass': {
      for (let i = 0; i < 9; i++) {
        const a = rnd(i) * Math.PI * 2;
        const d = rnd(i + 20) * rr;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        const s = rr * 0.18;
        g.poly([x, y - s, x + s * 0.8, y + s * 0.5, x - s * 0.6, y + s * 0.3]).fill({ color: 0xe2e8f0, alpha: 0.9 }).stroke({ width: 1, color: 0x64748b });
      }
      break;
    }
    case 'prop.foam-cloud': {
      for (let i = 0; i < 12; i++) {
        const a = rnd(i) * Math.PI * 2;
        const d = rnd(i + 3) * rr * 0.8;
        const b = rr * (0.18 + 0.05 * Math.sin(t * 3 + i));
        g.circle(Math.cos(a) * d, Math.sin(a) * d, b).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 1, color: 0xcbd5e1 });
      }
      break;
    }
    default: {
      // Liquids: water, flood, oil, soda.
      g.circle(0, 0, rr).fill({ color, alpha: 0.45 });
      g.circle(rr * 0.15, -rr * 0.1, rr * 0.7).fill({ color: 0xffffff, alpha: id.includes('oil') ? 0.12 : 0.08 });
      if (id.includes('oil')) {
        g.circle(-rr * 0.2, rr * 0.1, rr * 0.35).stroke({ width: Math.max(1, rr * 0.05), color: 0xa855f7, alpha: 0.35 });
        g.circle(-rr * 0.2, rr * 0.1, rr * 0.45).stroke({ width: Math.max(1, rr * 0.05), color: 0x22d3ee, alpha: 0.3 });
      }
      const ripple = (t * 0.6 + rnd(1)) % 1;
      g.circle(0, 0, rr * (0.3 + ripple * 0.7)).stroke({ width: Math.max(1, rr * 0.04), color: 0xffffff, alpha: 0.5 * (1 - ripple) });
      if (id.includes('soda')) for (let i = 0; i < 5; i++) g.circle((rnd(i) - 0.5) * rr, (rnd(i + 9) - 0.5) * rr, rr * 0.05).fill({ color: 0xffffff, alpha: 0.7 });
    }
  }
}
