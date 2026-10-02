/**
 * Item slicer: prop sheets (art/items/<sheet>.png — 2 rows × 4 items on a
 * transparent background) → one packed atlas for the client:
 * apps/client/src/replay/items/items.webp + items.json ({ name: rect }).
 *
 *   pnpm --filter @cc/art-pipeline items
 *
 * Item names per sheet, in reading order, live in art/items/manifest.json —
 * either a list, or { cols, px, names } for sheets with a different number of
 * items per row or a different size in the atlas (heavy weapons: 3 per row, 160 px).
 * Each item is everything opaque in its cell (cells found from the gaps
 * between blobs), so multi-part items (a rope post, the mime's box) stay whole.
 *
 * Debris sheets (destroyed or damaged obstacles with bits scattered between
 * them) add `anchors: true`: the largest blobs are the items, laid out in rows
 * and columns, and every smaller blob (a shard, a puff of smoke) joins the
 * nearest one, so stray bits can't be mistaken for a cell of their own.
 *
 * Animation frames (impact effects, art/FX_BRIEF.md) use { grid: [cols, rows],
 * px, names } instead: the sheet is cut into equal cells and every cell is kept
 * whole (transparent margins included) at the same scale, so frames stay
 * aligned and an effect can grow from frame to frame.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { writeSheet } from './encode';

const ROOT = new URL('../../../', import.meta.url).pathname;
/**
 * Two atlases: small hand-held/throwable items (4 per row on their sheets) and
 * large obstacles/machines (3 per row), which need more pixels.
 *   pnpm --filter @cc/art-pipeline items [obstacles]
 */
const KIND = process.argv[2] === 'obstacles' ? 'obstacles' : 'items';
const SHEETS = join(ROOT, `art/${KIND}`);
const OUT = join(ROOT, `apps/client/src/replay/${KIND}`);
/** Longest side of an item in the atlas (px). */
const ITEM_PX = KIND === 'obstacles' ? 170 : 96;
const COLS = KIND === 'obstacles' ? 3 : 4;
const ATLAS_W = KIND === 'obstacles' ? 2048 : 1024;
const PAD = 2;

interface Blob {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  area: number;
  /** Label in the sheet's label map (pixels of this blob). */
  id: number;
}

function blobs(data: Buffer, W: number, H: number, labels = new Int32Array(W * H)): Blob[] {
  const seen = new Uint8Array(W * H);
  let next = 0;
  const stack = new Int32Array(W * H);
  const out: Blob[] = [];
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || data[s * 4 + 3]! < 128) continue;
    let sp = 0;
    stack[sp++] = s;
    seen[s] = 1;
    const b: Blob = { x0: W, y0: H, x1: 0, y1: 0, cx: 0, cy: 0, area: 0, id: ++next };
    while (sp) {
      const p = stack[--sp]!;
      labels[p] = b.id;
      const x = p % W;
      const y = (p / W) | 0;
      b.area++;
      b.cx += x;
      b.cy += y;
      b.x0 = Math.min(b.x0, x);
      b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y);
      b.y1 = Math.max(b.y1, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (!seen[q] && data[q * 4 + 3]! >= 128) {
            seen[q] = 1;
            stack[sp++] = q;
          }
        }
    }
    b.cx /= b.area;
    b.cy /= b.area;
    if (b.area >= 150) out.push(b);
  }
  return out;
}

/** Split sorted values into `n` groups at the n−1 largest gaps. */
function groups<T>(items: T[], key: (t: T) => number, n: number): T[][] {
  const s = [...items].sort((a, b) => key(a) - key(b));
  const gaps = s.slice(1).map((t, i) => ({ i: i + 1, g: key(t) - key(s[i]!) }));
  const cuts = gaps
    .sort((a, b) => b.g - a.g)
    .slice(0, n - 1)
    .map((g) => g.i)
    .sort((a, b) => a - b);
  const out: T[][] = [];
  let prev = 0;
  for (const c of [...cuts, s.length]) {
    out.push(s.slice(prev, c));
    prev = c;
  }
  return out;
}

/** Cells from the `n` largest blobs (rows × cols), with every other blob joining the nearest. */
function anchored(all: Blob[], rows: number, cols: number): Blob[][] {
  const big = [...all].sort((a, b) => b.area - a.area).slice(0, rows * cols);
  const order = groups(big, (b) => b.cy, rows).flatMap((row) => [...row].sort((a, b) => a.cx - b.cx));
  const cells = order.map((b) => [b]);
  for (const b of all) {
    if (big.includes(b)) continue;
    let best = 0;
    let bestD = Infinity;
    order.forEach((a, i) => {
      const d = (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
      if (d < bestD) [best, bestD] = [i, d];
    });
    cells[best]!.push(b);
  }
  return cells;
}

/** Equal cells in reading order, each kept whole and scaled so its longest side is `px`. */
async function gridCells(file: string, [cols, rows]: [number, number], px: number, names: (string | null)[]): Promise<{ name: string; png: Buffer; w: number; h: number }[]> {
  const meta = await sharp(file).metadata();
  const cw = Math.floor(meta.width! / cols);
  const ch = Math.floor(meta.height! / rows);
  const k = px / Math.max(cw, ch);
  const tw = Math.max(1, Math.round(cw * k));
  const th = Math.max(1, Math.round(ch * k));
  const out: { name: string; png: Buffer; w: number; h: number }[] = [];
  for (let i = 0; i < Math.min(names.length, cols * rows); i++) {
    const name = names[i];
    if (!name) continue;
    const png = await sharp(file)
      .ensureAlpha()
      .extract({ left: (i % cols) * cw, top: Math.floor(i / cols) * ch, width: cw, height: ch })
      .resize(tw, th, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    out.push({ name, png, w: tw, h: th });
  }
  return out;
}

async function main(): Promise<void> {
  // A null name skips that cell (art the atlas already has), so it costs no bytes.
  const manifest = JSON.parse(readFileSync(join(SHEETS, 'manifest.json'), 'utf8')) as Record<string, (string | null)[] | { cols?: number; grid?: [number, number]; px?: number; anchors?: boolean; names: (string | null)[] }>;
  const pieces: { name: string; png: Buffer; w: number; h: number }[] = [];
  for (const [sheet, entry] of Object.entries(manifest)) {
    const names = Array.isArray(entry) ? entry : entry.names;
    const cols = Array.isArray(entry) ? COLS : (entry.cols ?? COLS);
    const px = Array.isArray(entry) ? ITEM_PX : (entry.px ?? ITEM_PX);
    const file = join(SHEETS, `${sheet}.png`);
    if (!existsSync(file)) {
      console.warn(`✗ ${sheet}: missing ${file}`);
      continue;
    }
    if (!Array.isArray(entry) && entry.grid) {
      pieces.push(...(await gridCells(file, entry.grid, px, names)));
      console.log(`✓ ${sheet} (grid): ${names.map((n) => n ?? '(skipped)').join(', ')}`);
      continue;
    }
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const labels = new Int32Array(info.width * info.height);
    const all = blobs(data, info.width, info.height, labels);
    const cells = !Array.isArray(entry) && entry.anchors ? anchored(all, Math.ceil(names.length / cols), cols) : groups(all, (b) => b.cy, 2).flatMap((row) => groups(row, (b) => b.cx, cols));
    if (cells.length !== names.length) {
      console.warn(`✗ ${sheet}: found ${cells.length} cells for ${names.length} names`);
      continue;
    }
    for (let i = 0; i < cells.length; i++) {
      if (!names[i]) continue;
      const c = cells[i]!;
      const x0 = Math.min(...c.map((b) => b.x0));
      const y0 = Math.min(...c.map((b) => b.y0));
      const x1 = Math.max(...c.map((b) => b.x1));
      const y1 = Math.max(...c.map((b) => b.y1));
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const k = px / Math.max(w, h);
      const tw = Math.max(1, Math.round(w * k));
      const th = Math.max(1, Math.round(h * k));
      // Items can overlap each other's boxes (diagonal art): drop pixels that belong to another item.
      const mine = new Set(c.map((b) => b.id));
      const others = new Set(cells.flatMap((o, j) => (j === i ? [] : o.map((b) => b.id))));
      const crop = Buffer.alloc(w * h * 4);
      for (let yy = 0; yy < h; yy++)
        for (let xx = 0; xx < w; xx++) {
          const src = (y0 + yy) * info.width + x0 + xx;
          const lab = labels[src]!;
          if (lab && others.has(lab) && !mine.has(lab)) continue;
          data.copy(crop, (yy * w + xx) * 4, src * 4, src * 4 + 4);
        }
      const png = await sharp(crop, { raw: { width: w, height: h, channels: 4 } })
        .resize(tw, th, { kernel: 'lanczos3' })
        .png()
        .toBuffer();
      pieces.push({ name: names[i]!, png, w: tw, h: th });
    }
    console.log(`✓ ${sheet}: ${names.map((n) => n ?? '(skipped)').join(', ')}`);
  }
  let x = PAD;
  let y = PAD;
  let rowH = 0;
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {};
  const comp: OverlayOptions[] = [];
  for (const p of [...pieces].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name))) {
    if (x + p.w + PAD > ATLAS_W) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    rects[p.name] = { x, y, w: p.w, h: p.h };
    comp.push({ input: p.png, left: x, top: y });
    x += p.w + PAD;
    rowH = Math.max(rowH, p.h);
  }
  const H = y + rowH + PAD;
  mkdirSync(OUT, { recursive: true });
  await writeSheet(sharp({ create: { width: ATLAS_W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp), join(OUT, `${KIND}.webp`));
  const sorted = Object.fromEntries(Object.entries(rects).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(OUT, `${KIND}.json`), JSON.stringify({ w: ATLAS_W, h: H, items: sorted }, null, 1) + '\n');
  console.log(`${pieces.length} items → ${ATLAS_W}×${H}`);
}

await main();
