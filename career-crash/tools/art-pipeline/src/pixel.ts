/**
 * Pixel forge: sprites drawn as code, no image generator (13 §8).
 *
 *   pnpm --filter @cc/art-pipeline pixel            # every art/pixel/*.json
 *   pnpm --filter @cc/art-pipeline pixel rate-hawk  # one sprite
 *
 * A sprite is a small grid (usually 64×64) built from shape ops in palette
 * keys: rect, ellipse, poly, line and literal pixel rows. The forge then adds
 * the house look (STYLE_GUIDE.md): one shade tone on the side away from the
 * top-left light, an optional highlight, and the thick #1b1f2a outline. Each
 * frame is scaled up with nearest-neighbour into a 256 px cell, so a sheet
 * drops straight into the critter or item slicers (2 rows × 4 cells).
 *
 * Output: art/pixel/<name>.png, the sheet, committed next to its spec so the
 * slicers can read it like painted art; tools/art-pipeline/out/pixel/<name>.png,
 * the same on a checkerboard, for review.
 */
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SRC = join(ROOT, 'art/pixel');
const PREVIEW = join(ROOT, 'tools/art-pipeline/out/pixel');
const CELL = 256;
const OUTLINE = '#1b1f2a';

type Pt = [number, number];
type Op =
  | { rect: [number, number, number, number]; c: string }
  | { ellipse: [number, number, number, number]; c: string }
  | { poly: Pt[]; c: string }
  | { line: [number, number, number, number]; c: string; w?: number }
  | { rows: string[]; at: Pt };

interface Spec {
  /** Grid size in sprite pixels. */
  size: [number, number];
  /** Key → [base, shade?, light?] colours. "." is always transparent; "k" is the outline colour. */
  palette: Record<string, string[]>;
  /** Shapes every frame starts from. */
  base?: Op[];
  /** One entry per pose, drawn over `base`. */
  frames: Op[][];
  /** Mirror each frame left-to-right after drawing (draw facing left, ship facing right). */
  flip?: boolean;
  /** How many pixels deep the shade tone runs from the lower-right edge (default 2). */
  shade?: number;
}

type Grid = (string | null)[][];

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array<string | null>(w).fill(null));
}

function set(g: Grid, x: number, y: number, c: string | null): void {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0]!.length) g[y]![x] = c === '.' ? null : c;
}

function inPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function draw(g: Grid, op: Op): void {
  const h = g.length;
  const w = g[0]!.length;
  if ('rect' in op) {
    const [x, y, rw, rh] = op.rect;
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(g, i, j, op.c);
  } else if ('ellipse' in op) {
    const [cx, cy, rx, ry] = op.ellipse;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const dx = (i + 0.5 - cx) / rx;
        const dy = (j + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(g, i, j, op.c);
      }
  } else if ('poly' in op) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inPoly(i + 0.5, j + 0.5, op.poly)) set(g, i, j, op.c);
  } else if ('line' in op) {
    const [x0, y0, x1, y1] = op.line;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    const r = (op.w ?? 1) - 1;
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / n);
      const y = Math.round(y0 + ((y1 - y0) * s) / n);
      for (let dy = 0; dy <= r; dy++) for (let dx = 0; dx <= r; dx++) set(g, x + dx, y + dy, op.c);
    }
  } else {
    const [ax, ay] = op.at;
    op.rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== ' ' && set(g, ax + i, ay + j, ch)));
  }
}

/** Key grid → RGBA pixels with shade, highlight and outline. */
function render(spec: Spec, g: Grid): Buffer {
  const h = g.length;
  const w = g[0]!.length;
  const depth = spec.shade ?? 2;
  const colour = (x: number, y: number): string | null => {
    const k = g[y]![x];
    if (k == null) {
      // Outline: any transparent pixel touching the sprite (8 neighbours).
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const n = g[y + dy]?.[x + dx];
          if (n != null) return OUTLINE;
        }
      return null;
    }
    if (k === 'k') return OUTLINE;
    const [base, shade, light] = spec.palette[k] ?? ['#ff00ff'];
    const same = (dx: number, dy: number): boolean => g[y + dy]?.[x + dx] === k;
    // Light from the top left: pixels near the region's lower-right edge take the shade tone.
    if (shade) for (let s = 1; s <= depth; s++) if (!same(s, s) || !same(0, s)) return shade;
    if (light && (!same(-1, -1) || !same(0, -1)) && same(1, 1)) return light;
    return base!;
  };
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = colour(x, y);
      if (!c) continue;
      const v = parseInt(c.slice(1), 16);
      buf.set([v >> 16, (v >> 8) & 255, v & 255, 255], (y * w + x) * 4);
    }
  return buf;
}

async function forge(name: string): Promise<void> {
  const spec = JSON.parse(readFileSync(join(SRC, `${name}.json`), 'utf8')) as Spec;
  // One pixel of margin all round so the outline always fits.
  const [w, h] = [spec.size[0] + 2, spec.size[1] + 2];
  const scale = Math.floor(CELL / Math.max(w, h));
  const cells = await Promise.all(
    spec.frames.map(async (frame) => {
      const g = blank(w, h);
      for (const op of [...(spec.base ?? []), ...frame]) draw(g, shift(op));
      if (spec.flip) g.forEach((row) => row.reverse());
      const px = render(spec, g);
      return sharp(px, { raw: { width: w, height: h, channels: 4 } })
        .resize(w * scale, h * scale, { kernel: 'nearest' })
        .png()
        .toBuffer();
    }),
  );
  const cols = Math.min(4, cells.length);
  const rows = Math.ceil(cells.length / 4);
  const sheet = sharp({ create: { width: cols * CELL, height: rows * CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const place = cells.map((input, i) => ({ input, left: (i % 4) * CELL + (CELL - w * scale) / 2, top: Math.floor(i / 4) * CELL + (CELL - h * scale) }));
  const png = await sheet.composite(place.map((p) => ({ ...p, left: Math.floor(p.left) }))).png().toBuffer();
  await sharp(png).toFile(join(SRC, `${name}.png`));
  // Review copy on a checkerboard so the outline and transparency are easy to judge.
  const tile = 16;
  const cw = cols * CELL;
  const ch = rows * CELL;
  const checker = Buffer.alloc(cw * ch * 3);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) checker.fill(((x / tile) ^ (y / tile)) & 1 ? 0xe9 : 0xf6, (y * cw + x) * 3, (y * cw + x) * 3 + 3);
  await sharp(checker, { raw: { width: cw, height: ch, channels: 3 } }).composite([{ input: png }]).png().toFile(join(PREVIEW, `${name}.png`));
  console.log(`${name}: ${cells.length} frame(s), ${spec.size.join('×')} px ×${scale} → art/pixel/${name}.png`);
}

/** Ops are written in sprite coordinates; the grid has a 1 px margin. */
function shift(op: Op): Op {
  if ('rect' in op) return { ...op, rect: [op.rect[0] + 1, op.rect[1] + 1, op.rect[2], op.rect[3]] };
  if ('ellipse' in op) return { ...op, ellipse: [op.ellipse[0] + 1, op.ellipse[1] + 1, op.ellipse[2], op.ellipse[3]] };
  if ('poly' in op) return { ...op, poly: op.poly.map(([x, y]) => [x + 1, y + 1] as Pt) };
  if ('line' in op) return { ...op, line: [op.line[0] + 1, op.line[1] + 1, op.line[2] + 1, op.line[3] + 1] };
  return { ...op, at: [op.at[0] + 1, op.at[1] + 1] };
}

async function main(): Promise<void> {
  mkdirSync(PREVIEW, { recursive: true });
  const only = process.argv[2];
  const names = readdirSync(SRC)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .filter((n) => !only || n === only);
  if (!names.length) throw new Error(only ? `no art/pixel/${only}.json` : 'no sprites in art/pixel/');
  for (const n of names) await forge(n);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
