import type { Graphics } from 'pixi.js';

/**
 * Arena obstacles ("walls" in the sim) drawn as furniture that matches each
 * painted backdrop. (x0, y0)–(x1, y1) is the footprint on the floor in screen
 * space; `lift` is the height of a standard wall.
 */
const O = 0x1b1f2a;
const GOODS = [0xfbbf24, 0xef4444, 0x22c55e, 0x60a5fa, 0xf472b6, 0xa78bfa, 0xfb923c];

type Style = (g: Graphics, x0: number, y0: number, x1: number, y1: number, lift: number) => void;

const box = (g: Graphics, x: number, y: number, w: number, h: number, fill: number, line = 1.5) => g.rect(x, y, w, h).fill(fill).stroke({ width: line, color: O });

const STYLES: Record<string, Style> = {
  // Supermarket gondola shelving: three shelves of colourful stock.
  shelf: (g, x0, y0, x1, y1, lift) => {
    const w = x1 - x0;
    box(g, x0, y0 - lift, w, y1 - y0, 0xd1d5db);
    box(g, x0, y1 - lift, w, lift, 0xe5e7eb);
    for (let row = 0; row < 3; row++) {
      const ry = y1 - lift + 4 + (row * (lift - 8)) / 3;
      const n = Math.max(2, Math.floor(w / 7));
      for (let i = 0; i < n; i++) g.rect(x0 + 3 + ((w - 6) * i) / n, ry, (w - 6) / n - 1.5, (lift - 8) / 3 - 4).fill(GOODS[(i + row * 3) % GOODS.length]!);
      g.rect(x0, ry + (lift - 8) / 3 - 3, w, 2).fill(0x9ca3af);
    }
    g.rect(x0, y0 - lift, w, 3).fill(0x16a34a);
  },
  // Office desk: wood top, drawers, a monitor.
  desk: (g, x0, y0, x1, y1, lift) => {
    const w = x1 - x0;
    const h = lift * 0.6;
    box(g, x0, y1 - h, w, h, 0x475569);
    box(g, x0, y0 - h, w, y1 - y0, 0xc08a52);
    for (let i = 0; i < Math.max(1, Math.floor(w / 40)); i++) box(g, x0 + 4 + i * 40, y1 - h + 4, Math.min(34, w - 8), h - 8, 0x64748b, 1);
    const mw = Math.min(w * 0.35, lift * 0.9);
    for (const mx of w > lift * 2 ? [0.25, 0.75] : [0.5]) {
      const cx = x0 + w * mx;
      box(g, cx - mw / 2, y0 - h - lift * 0.55, mw, lift * 0.45, 0x111827);
      g.rect(cx - mw / 2 + 2, y0 - h - lift * 0.55 + 2, mw - 4, lift * 0.45 - 4).fill(0x38bdf8);
      g.rect(cx - 2, y0 - h - lift * 0.1, 4, lift * 0.1).fill(0x111827);
    }
  },
  // Train station: stone pillars (square footprint) and slatted benches (long).
  station: (g, x0, y0, x1, y1, lift) => {
    const w = x1 - x0;
    if (w < (y1 - y0) * 3 * 1.6) {
      const tall = lift * 2.2;
      box(g, x0, y1 - lift * 0.5, w, lift * 0.5, 0xc8b89a);
      box(g, x0 + w * 0.12, y1 - tall, w * 0.76, tall - lift * 0.5, 0x2f6b5a);
      g.rect(x0 + w * 0.2, y1 - tall, w * 0.08, tall - lift * 0.5).fill({ color: 0xffffff, alpha: 0.15 });
      box(g, x0, y0 - lift * 0.5, w, y1 - y0, 0xd6c7a8);
      g.circle(x0 + w / 2, y1 - tall * 0.7, w * 0.16).fill(0xfde68a).stroke({ width: 1.5, color: O });
      return;
    }
    const h = lift * 0.45;
    for (const [dx, dy] of [
      [0.08, 0],
      [0.92, 0],
    ])
      g.rect(x0 + w * dx - 2, y1 - h - dy, 4, h).fill(0x374151);
    for (let i = 0; i < 3; i++) box(g, x0, y1 - h - (y1 - y0) * (i / 3), w, (y1 - y0) / 3 - 1, 0xb45309, 1);
    box(g, x0, y0 - h - lift * 0.5, w, lift * 0.5, 0xb45309);
    g.rect(x0, y0 - h - lift * 0.5, w, 3).fill(0x78350f);
  },
  // Diner booth table: red bench backs either side of a steel table.
  booth: (g, x0, y0, x1, y1, lift) => {
    const w = x1 - x0;
    const d = y1 - y0;
    box(g, x0, y0 - lift * 0.9, w, d * 0.3, 0xdc2626);
    g.rect(x0 + w * 0.3, y0 - lift * 0.9, w * 0.12, d * 0.3).rect(x0 + w * 0.58, y0 - lift * 0.9, w * 0.12, d * 0.3).fill(0xfef2f2);
    box(g, x0, y0 - lift * 0.9 + d * 0.3, w, lift * 0.55, 0xb91c1c);
    box(g, x0 + w * 0.06, y0 + d * 0.3 - lift * 0.45, w * 0.88, d * 0.4, 0xd1d5db);
    g.rect(x0 + w * 0.47, y0 + d * 0.7 - lift * 0.45, w * 0.06, lift * 0.35).fill(0x6b7280);
    box(g, x0, y1 - lift * 0.5, w, lift * 0.5, 0xdc2626);
    g.circle(x0 + w * 0.2, y0 + d * 0.45 - lift * 0.45, lift * 0.08).fill(0xef4444).circle(x0 + w * 0.26, y0 + d * 0.45 - lift * 0.45, lift * 0.08).fill(0xfacc15);
  },
  // Construction: pallet of bricks.
  bricks: (g, x0, y0, x1, y1, lift) => {
    const w = x1 - x0;
    const h = lift * 0.75;
    box(g, x0, y1 - lift * 0.15, w, lift * 0.15, 0xa16207);
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const ry = y1 - lift * 0.15 - ((r + 1) * (h - lift * 0.15)) / rows;
      const bw = Math.max(8, w / 6);
      for (let bx = x0 - (r % 2) * bw * 0.5; bx < x1; bx += bw) {
        const l = Math.max(x0, bx);
        const r2 = Math.min(x1, bx + bw);
        if (r2 - l > 2) box(g, l, ry, r2 - l, (h - lift * 0.15) / rows, 0xc2410c, 1);
      }
    }
    box(g, x0, y0 - h, w, y1 - y0, 0xea580c);
    g.moveTo(x0, y0 - h + (y1 - y0) / 2).lineTo(x1, y0 - h + (y1 - y0) / 2).stroke({ width: 1, color: 0x9a3412 });
  },
  // Warehouse: pallet stacked with cardboard boxes and a strip of tape.
  pallet: (g, x0, y0, x1, y1, lift) => {
    const w = x1 - x0;
    const h = lift * 1.1;
    box(g, x0, y1 - lift * 0.15, w, lift * 0.15, 0x92400e);
    const cols = Math.max(2, Math.round(w / (lift * 0.9)));
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = x0 + (c * w) / cols;
        const by = y1 - lift * 0.15 - ((r + 1) * (h - lift * 0.15)) / 2;
        box(g, bx, by, w / cols, (h - lift * 0.15) / 2, r % 2 ? 0xc49a6c : 0xb88b5a, 1);
        g.rect(bx + w / cols / 2 - 1.5, by, 3, (h - lift * 0.15) / 2).fill(0xe5d3b3);
      }
    }
    box(g, x0, y0 - h, w, y1 - y0, 0xd4a877);
    g.rect(x0, y0 - h + (y1 - y0) / 2 - 1.5, w, 3).fill(0xe5d3b3);
  },
};

const BY_ARENA: Record<string, string> = {
  'arena.supermarket': 'shelf',
  'arena.office': 'desk',
  'arena.station': 'station',
  'arena.diner': 'booth',
  'arena.construction': 'bricks',
  'arena.warehouse': 'pallet',
};

/** Draw one obstacle for this arena; returns false when the arena has no furniture style. */
export function drawWall(g: Graphics, arenaId: string, x0: number, y0: number, x1: number, y1: number, lift: number): boolean {
  const style = STYLES[BY_ARENA[arenaId] ?? ''];
  if (!style) return false;
  style(g, x0, y0, x1, y1, lift);
  return true;
}
