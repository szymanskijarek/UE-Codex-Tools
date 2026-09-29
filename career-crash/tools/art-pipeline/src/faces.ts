/**
 * Face slicer: four emotion sheets (art/faces/{neutral,angry,surprised,hurt}.png,
 * each a 6 × 6 grid of heads on a transparent background, careers in
 * alphabetical order) → one atlas for the client:
 * apps/client/src/replay/faces/faces.png + faces.json ({ "career.x:emotion": rect }).
 *
 *   pnpm --filter @cc/art-pipeline faces
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SHEETS = join(ROOT, 'art/faces');
const OUT = join(ROOT, 'apps/client/src/replay/faces');
const EMOTIONS = ['neutral', 'angry', 'surprised', 'hurt'] as const;
/** Grid order on every sheet. */
const CAREERS = [
  'accountant', 'astronaut', 'barista', 'builder', 'chef', 'conspiracy-podcaster',
  'delivery-driver', 'dentist', 'dj', 'electrician', 'engineer', 'farmer',
  'firefighter', 'food-critic', 'gardener', 'hairdresser', 'influencer', 'janitor',
  'journalist', 'lawyer', 'librarian', 'life-coach', 'lifeguard', 'mechanic',
  'mime', 'paramedic', 'personal-trainer', 'plumber', 'police-officer', 'politician',
  'programmer', 'psychologist', 'security-guard', 'taxi-driver', 'teacher', 'tv-host',
];
const GRID = 6;
/** Longest side of a face in the atlas (px). */
const FACE_PX = 96;
const ATLAS_W = 2048;
const PAD = 2;

async function main(): Promise<void> {
  const pieces: { name: string; png: Buffer; w: number; h: number }[] = [];
  for (const emo of EMOTIONS) {
    const file = join(SHEETS, `${emo}.png`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cw = info.width / GRID;
    const ch = info.height / GRID;
    for (let i = 0; i < CAREERS.length; i++) {
      const cx0 = Math.round((i % GRID) * cw);
      const cy0 = Math.round(Math.floor(i / GRID) * ch);
      const cx1 = Math.round(((i % GRID) + 1) * cw);
      const cy1 = Math.round((Math.floor(i / GRID) + 1) * ch);
      // Tight box around the opaque pixels in this cell.
      let x0 = cx1;
      let y0 = cy1;
      let x1 = cx0;
      let y1 = cy0;
      for (let y = cy0; y < cy1; y++)
        for (let x = cx0; x < cx1; x++)
          if (data[(y * info.width + x) * 4 + 3]! > 100) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
      if (x1 < x0) {
        console.warn(`✗ ${emo}: empty cell for ${CAREERS[i]}`);
        continue;
      }
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const k = FACE_PX / Math.max(w, h);
      const tw = Math.max(1, Math.round(w * k));
      const th = Math.max(1, Math.round(h * k));
      const png = await sharp(file).extract({ left: x0, top: y0, width: w, height: h }).resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
      pieces.push({ name: `career.${CAREERS[i]}:${emo}`, png, w: tw, h: th });
    }
    console.log(`✓ ${emo}: ${CAREERS.length} faces`);
  }
  let x = PAD;
  let y = PAD;
  let rowH = 0;
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {};
  const comp: OverlayOptions[] = [];
  for (const p of pieces) {
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
  await sharp({ create: { width: ATLAS_W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comp)
    .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
    .toFile(join(OUT, 'faces.png'));
  writeFileSync(join(OUT, 'faces.json'), JSON.stringify({ w: ATLAS_W, h: H, faces: rects }, null, 1) + '\n');
  console.log(`${pieces.length} faces → ${ATLAS_W}×${H}`);
}

await main();
