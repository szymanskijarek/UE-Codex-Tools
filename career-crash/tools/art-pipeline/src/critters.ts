/**
 * Critter slicer: summoned-animal sheets (art/critters/<sheet>.png, 2 rows × 4
 * cells of 256 px on a transparent background, pose A then pose B per animal)
 * → apps/client/src/replay/critters/critters.webp + critters.json.
 *
 *   pnpm --filter @cc/art-pipeline critters
 *
 * Unlike the item slicer, every cell is scaled by the same factor so animals
 * keep their relative size (a crab stays smaller than a capybara), and each
 * sprite records `lift`: how far above the cell floor it was drawn (a seagull
 * in flight), so the renderer can stand it on the ground or keep it airborne.
 * Names per sheet, in reading order, live in art/critters/manifest.json (null skips a cell).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { writeSheet } from './encode';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SHEETS = join(ROOT, 'art/critters');
const OUT = join(ROOT, 'apps/client/src/replay/critters');
const CELL = 256;
/** Atlas pixels per sheet pixel (a 256 px cell becomes 112 px). */
const SCALE = 112 / 256;
const ATLAS_W = 1024;
const PAD = 2;

interface Cut {
  name: string;
  buf: Buffer;
  w: number;
  h: number;
  lift: number;
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(join(SHEETS, 'manifest.json'), 'utf8')) as Record<string, (string | null)[]>;
  const cuts: Cut[] = [];
  for (const [sheet, names] of Object.entries(manifest)) {
    const file = join(SHEETS, `${sheet}.png`);
    if (!existsSync(file)) throw new Error(`missing ${file}`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cols = Math.floor(info.width / CELL);
    for (const [i, name] of names.entries()) {
      if (!name) continue;
      const cx = (i % cols) * CELL;
      const cy = Math.floor(i / cols) * CELL;
      // Opaque bounds inside the cell.
      let x0 = CELL, y0 = CELL, x1 = -1, y1 = -1;
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          if (data[((cy + y) * info.width + cx + x) * 4 + 3]! < 40) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      if (x1 < 0) throw new Error(`${sheet}: cell ${i} (${name}) is empty`);
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const tw = Math.max(1, Math.round(w * SCALE));
      const th = Math.max(1, Math.round(h * SCALE));
      const buf = await sharp(file).extract({ left: cx + x0, top: cy + y0, width: w, height: h }).resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
      // The lowest opaque row of pose A is the floor line for every pose on that row of the sheet.
      cuts.push({ name, buf, w: tw, h: th, lift: CELL - 1 - y1 });
    }
  }
  // Floor per animal: its standing pose's feet. Pose B's lift is measured from the same floor.
  const floor = new Map<string, number>();
  for (const c of cuts) if (!c.name.endsWith('-b')) floor.set(c.name, c.lift);
  for (const c of cuts) c.lift = Math.max(0, Math.round((c.lift - (floor.get(c.name.replace(/-b$/, '')) ?? c.lift)) * SCALE));
  for (const c of cuts) if (!c.name.endsWith('-b')) c.lift = 0;

  // Shelf-pack.
  cuts.sort((a, b) => b.h - a.h);
  const rects: Record<string, { x: number; y: number; w: number; h: number; lift: number }> = {};
  let x = PAD, y = PAD, shelf = 0;
  const layers: OverlayOptions[] = [];
  for (const c of cuts) {
    if (x + c.w + PAD > ATLAS_W) {
      x = PAD;
      y += shelf + PAD;
      shelf = 0;
    }
    rects[c.name] = { x, y, w: c.w, h: c.h, lift: c.lift };
    layers.push({ input: c.buf, left: x, top: y });
    x += c.w + PAD;
    shelf = Math.max(shelf, c.h);
  }
  const H = y + shelf + PAD;
  mkdirSync(OUT, { recursive: true });
  await writeSheet(sharp({ create: { width: ATLAS_W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers), join(OUT, 'critters.webp'));
  writeFileSync(join(OUT, 'critters.json'), JSON.stringify({ w: ATLAS_W, h: H, items: rects }));
  console.log(`critters: ${cuts.length} sprites → ${ATLAS_W}×${H}`);
}

void main();
