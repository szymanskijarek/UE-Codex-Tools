/**
 * Face slicer: four emotion sheets (art/faces/{neutral,angry,surprised,hurt}.png,
 * plus optional hurt-2…4 / surprised-2…3 variants (as sheets, or as single heads
 * in art/faces-pain/<frame>/<career>.webp),
 * each a 6 × 6 grid of heads on a transparent background, careers in
 * alphabetical order) → one atlas for the client:
 * apps/client/src/replay/faces/faces.webp + faces.json ({ "career.x:emotion": rect }).
 *
 * Two animation frames are derived from the neutral face, where the art allows:
 * `blink` (eye whites found and painted over with skin + a lid line) and `talk`
 * (the surprised face's open mouth pasted into the neutral face).
 *
 *   pnpm --filter @cc/art-pipeline faces
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { writeSheet } from './encode';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SHEETS = join(ROOT, 'art/faces');
const OUT = join(ROOT, 'apps/client/src/replay/faces');
const EMOTIONS = ['neutral', 'angry', 'surprised', 'hurt'] as const;
/**
 * Optional extra pain and shock heads for variety (same grid as the emotion
 * sheets): art/faces/hurt-2.png → frame `hurt2`, and so on. Missing sheets are skipped.
 */
const VARIANTS = ['hurt-2', 'hurt-3', 'hurt-4', 'surprised-2', 'surprised-3'] as const;
/** The same variants as single heads: art/faces-pain/<frame>/<career>.webp (frame names without the dash). */
const PER_HEAD = join(ROOT, 'art/faces-pain');
const FRAMES = new Set<string>(VARIANTS.map((v) => v.replace('-', '')));
/** Grid order on every sheet. */
const CAREERS = [
  'accountant',
  'astronaut',
  'barista',
  'builder',
  'chef',
  'conspiracy-podcaster',
  'delivery-driver',
  'dentist',
  'dj',
  'electrician',
  'engineer',
  'farmer',
  'firefighter',
  'food-critic',
  'gardener',
  'hairdresser',
  'influencer',
  'janitor',
  'journalist',
  'lawyer',
  'librarian',
  'life-coach',
  'lifeguard',
  'mechanic',
  'mime',
  'paramedic',
  'personal-trainer',
  'plumber',
  'police-officer',
  'politician',
  'programmer',
  'psychologist',
  'security-guard',
  'taxi-driver',
  'teacher',
  'tv-host',
];
const GRID = 6;
/** Second batch: labelled JPG sheets on a flat grey background, 6 × 5. */
const CAREERS_B = [
  'archaeologist',
  'baker',
  'beekeeper',
  'bus-driver',
  'carpenter',
  'chimney-sweep',
  'clown',
  'dog-groomer',
  'fashion-designer',
  'flight-attendant',
  'florist',
  'fortune-teller',
  'hotel-concierge',
  'ice-cream-vendor',
  'magician',
  'marine-biologist',
  'museum-curator',
  'nurse',
  'painter',
  'photographer',
  'postal-worker',
  'sailor',
  'scientist',
  'tailor',
  'tattoo-artist',
  'train-conductor',
  'veterinarian',
  'welder',
  'window-cleaner',
  'zookeeper',
];
interface FaceSet {
  dir: string;
  ext: 'png' | 'jpg';
  cols: number;
  rows: number;
  careers: string[];
  /** Flat background to key out (JPG sheets), keeping only the biggest shape per cell (drops the labels). */
  key: boolean;
}
const SETS: FaceSet[] = [
  { dir: SHEETS, ext: 'png', cols: GRID, rows: GRID, careers: CAREERS, key: false },
  { dir: join(ROOT, 'art/faces-b'), ext: 'jpg', cols: 6, rows: 5, careers: CAREERS_B, key: true },
];

/** Flood-fill the flat background out of every cell and keep each cell's biggest shape. */
function keySheet(im: Img, H: number, cols: number, rows: number): void {
  const W = im.W;
  const cw = W / cols;
  const ch = H / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x0 = Math.round(c * cw);
      const y0 = Math.round(r * ch);
      const w = Math.round((c + 1) * cw) - x0;
      const h = Math.round((r + 1) * ch) - y0;
      const b0 = px(im, x0 + 1, y0 + 1);
      const bg = [im.data[b0]!, im.data[b0 + 1]!, im.data[b0 + 2]!];
      const isBg = (i: number) => Math.abs(im.data[i]! - bg[0]!) + Math.abs(im.data[i + 1]! - bg[1]!) + Math.abs(im.data[i + 2]! - bg[2]!) < 40;
      const seen = new Uint8Array(w * h);
      const st: number[] = [];
      for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
      while (st.length) {
        const p = st.pop()!;
        if (seen[p]) continue;
        const x = p % w;
        const y = (p / w) | 0;
        const i = px(im, x0 + x, y0 + y);
        if (!isBg(i)) continue;
        seen[p] = 1;
        im.data[i + 3] = 0;
        if (x > 0) st.push(p - 1);
        if (x < w - 1) st.push(p + 1);
        if (y > 0) st.push(p - w);
        if (y < h - 1) st.push(p + w);
      }
      // Keep the biggest shape (the head); labels and specks go.
      const mask = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = im.data[px(im, x0 + x, y0 + y) + 3]! > 0 ? 1 : 0;
      const comps = components(mask, w, h).sort((a, b) => b.area - a.area);
      const keep = comps[0];
      if (!keep) continue;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!mask[y * w + x]) continue;
          if (x >= keep.x0 && x <= keep.x1 && y >= keep.y0 && y <= keep.y1) continue;
          im.data[px(im, x0 + x, y0 + y) + 3] = 0;
        }
    }
}
/** Longest side of a face in the atlas (px). */
const FACE_PX = 64;
const ATLAS_W = 2048;
const PAD = 2;

interface Img {
  data: Buffer;
  W: number;
}
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const px = (im: Img, x: number, y: number) => (y * im.W + x) * 4;

/** Opaque bounding box inside a cell. */
function bbox(im: Img, c: Box): Box | null {
  let x0 = c.x1;
  let y0 = c.y1;
  let x1 = c.x0;
  let y1 = c.y0;
  for (let y = c.y0; y < c.y1; y++)
    for (let x = c.x0; x < c.x1; x++)
      if (im.data[px(im, x, y) + 3]! > 100) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < x0 ? null : { x0, y0, x1, y1 };
}

/** Connected components of a mask (4-neighbour); returns boxes + areas. */
function components(mask: Uint8Array, w: number, h: number): (Box & { area: number })[] {
  const seen = new Uint8Array(w * h);
  const out: (Box & { area: number })[] = [];
  const st: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    const b = { x0: w, y0: h, x1: 0, y1: 0, area: 0 };
    st.push(i);
    seen[i] = 1;
    while (st.length) {
      const p = st.pop()!;
      const x = p % w;
      const y = (p / w) | 0;
      b.area++;
      b.x0 = Math.min(b.x0, x);
      b.y0 = Math.min(b.y0, y);
      b.x1 = Math.max(b.x1, x);
      b.y1 = Math.max(b.y1, y);
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || seen[q] || !mask[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === w - 1)) continue;
        seen[q] = 1;
        st.push(q);
      }
    }
    out.push(b);
  }
  return out;
}

function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
        }
    }
  return out;
}

/** Copy a box out of an image into its own RGBA buffer. */
function crop(im: Img, b: Box): Img {
  const w = b.x1 - b.x0 + 1;
  const h = b.y1 - b.y0 + 1;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) im.data.copy(data, y * w * 4, px(im, b.x0, b.y0 + y), px(im, b.x0, b.y0 + y) + w * 4);
  return { data, W: w };
}

/** Closed eyes: find the two eye whites and paint lids over them. Null if the face has no visible eyes. */
function blink(face: Img, h: number): Img | null {
  const w = face.W;
  const white = new Uint8Array(w * h);
  for (let y = Math.round(h * 0.28); y < Math.round(h * 0.82); y++)
    for (let x = Math.round(w * 0.1); x < Math.round(w * 0.9); x++) {
      const i = px(face, x, y);
      const d = face.data;
      if (d[i + 3]! > 200 && d[i]! > 215 && d[i + 1]! > 215 && d[i + 2]! > 215) white[y * w + x] = 1;
    }
  // Merge each eye's white around its pupil.
  const eyes = components(dilate(white, w, h, 3), w, h).filter((c) => c.area > w * h * 0.002 && c.area < w * h * 0.05);
  let best: [Box, Box] | null = null;
  let bestScore = 0;
  for (let i = 0; i < eyes.length; i++)
    for (let j = i + 1; j < eyes.length; j++) {
      const a = eyes[i]!;
      const b = eyes[j]!;
      const [L, R] = a.x0 < b.x0 ? [a, b] : [b, a];
      const cyA = (a.y0 + a.y1) / 2;
      const cyB = (b.y0 + b.y1) / 2;
      const mid = (L.x1 + R.x0) / 2;
      if (Math.abs(cyA - cyB) > h * 0.08) continue;
      if (Math.max(a.area, b.area) / Math.min(a.area, b.area) > 2.5) continue;
      if (Math.abs(mid - w / 2) > w * 0.18) continue;
      if (R.x0 - L.x1 < w * 0.04 || R.x1 - L.x0 > w * 0.8) continue;
      const score = a.area + b.area;
      if (score > bestScore) {
        bestScore = score;
        best = [L, R];
      }
    }
  if (!best) return null;
  const out: Img = { data: Buffer.from(face.data), W: w };
  for (const e of best) {
    const x0 = Math.max(0, e.x0 - 1);
    const x1 = Math.min(w - 1, e.x1 + 1);
    const y0 = Math.max(0, e.y0 - 1);
    const y1 = Math.min(h - 1, e.y1 + 1);
    // Skin: the median of the row just under the eye (skipping dark pixels like glasses frames).
    const samples: number[][] = [];
    for (const sy of [y1 + 3, y1 + 5, y0 - 4])
      for (let x = x0; x <= x1; x++) {
        if (sy < 0 || sy >= h) continue;
        const i = px(face, x, sy);
        const c = [face.data[i]!, face.data[i + 1]!, face.data[i + 2]!, face.data[i + 3]!];
        if (c[3]! > 200 && c[0]! + c[1]! + c[2]! > 300 && !(c[0]! > 215 && c[1]! > 215 && c[2]! > 215)) samples.push(c);
      }
    if (samples.length < 3) return null;
    samples.sort((p, q) => p[0]! + p[1]! + p[2]! - (q[0]! + q[1]! + q[2]!));
    const skin = samples[samples.length >> 1]!;
    const cx = (x0 + x1) / 2;
    const rx = (x1 - x0) / 2 + 0.5;
    const ry = (y1 - y0) / 2 + 0.5;
    const cy = (y0 + y1) / 2;
    const lid = cy + ry * 0.25;
    const thick = Math.max(2, Math.round((y1 - y0) * 0.16));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny > 1.05) continue;
        const i = px(out, x, y);
        // A gently curved lid line across the eye.
        const curve = lid + nx * nx * ry * 0.25;
        const dark = Math.abs(nx) < 0.92 && Math.abs(y - curve) <= thick / 2;
        const c = dark ? [40, 28, 28, 255] : skin;
        out.data[i] = c[0]!;
        out.data[i + 1] = c[1]!;
        out.data[i + 2] = c[2]!;
        out.data[i + 3] = 255;
      }
  }
  return out;
}

/**
 * Open mouth: find the surprised face's "o" (its red inside, lower middle of the
 * face), and paste that mouth — inside plus outline — onto the neutral face.
 */
function talk(neutral: Img, surprised: Img, w: number, h: number): Img | null {
  const red = new Uint8Array(w * h);
  for (let y = Math.round(h * 0.5); y < Math.round(h * 0.97); y++)
    for (let x = Math.round(w * 0.28); x < Math.round(w * 0.72); x++) {
      const i = px(surprised, x, y);
      const d = surprised.data;
      if (d[i + 3]! > 200 && d[i]! > 120 && d[i]! > d[i + 1]! * 1.7 && d[i]! > d[i + 2]! * 1.6) red[y * w + x] = 1;
    }
  const m = components(red, w, h).sort((p, q) => q.area - p.area)[0];
  if (!m || m.area < w * h * 0.0015 || m.x1 - m.x0 > w * 0.3 || m.y1 - m.y0 > h * 0.22) return null;
  // The mouth: its red inside grown to take in the dark outline around it.
  const grow = Math.max(2, Math.round((m.x1 - m.x0) * 0.35));
  const mask = dilate(red, w, h, grow);
  const out: Img = { data: Buffer.from(neutral.data), W: w };
  for (let y = Math.max(0, m.y0 - grow); y <= Math.min(h - 1, m.y1 + grow); y++)
    for (let x = Math.max(0, m.x0 - grow); x <= Math.min(w - 1, m.x1 + grow); x++) {
      if (!mask[y * w + x]) continue;
      const i = px(surprised, x, y);
      const d = surprised.data;
      const dark = d[i]! + d[i + 1]! + d[i + 2]! < 200;
      const inside = red[y * w + x] || (d[i]! > 120 && d[i]! > d[i + 1]! * 1.5);
      if (d[i + 3]! > 200 && (dark || inside)) d.copy(out.data, i, i, i + 4);
    }
  return out;
}

async function main(): Promise<void> {
  const pieces: { name: string; png: Buffer; w: number; h: number }[] = [];
  const add = async (name: string, im: Img, w: number, h: number) => {
    const k = FACE_PX / Math.max(w, h);
    const tw = Math.max(1, Math.round(w * k));
    const th = Math.max(1, Math.round(h * k));
    const png = await sharp(im.data, { raw: { width: w, height: h, channels: 4 } })
      .resize(tw, th, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    pieces.push({ name, png, w: tw, h: th });
  };
  let blinks = 0;
  let talks = 0;
  let variants = 0;
  let total = 0;
  for (const set of SETS) {
    const sheets = new Map<string, Img>();
    let cw = 0;
    let ch = 0;
    const extra = VARIANTS.filter((v) => existsSync(join(set.dir, `${v}.${set.ext}`)));
    for (const emo of [...EMOTIONS, ...extra]) {
      const { data, info } = await sharp(join(set.dir, `${emo}.${set.ext}`))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const im = { data, W: info.width };
      if (set.key) keySheet(im, info.height, set.cols, set.rows);
      sheets.set(emo, im);
      cw = info.width / set.cols;
      ch = info.height / set.rows;
    }
    total += set.careers.length;
    for (let i = 0; i < set.careers.length; i++) {
      const cell: Box = {
        x0: Math.round((i % set.cols) * cw),
        y0: Math.round(Math.floor(i / set.cols) * ch),
        x1: Math.round(((i % set.cols) + 1) * cw),
        y1: Math.round((Math.floor(i / set.cols) + 1) * ch),
      };
      const crops = new Map<string, { im: Img; w: number; h: number }>();
      for (const emo of EMOTIONS) {
        const im = sheets.get(emo)!;
        const b = bbox(im, cell);
        if (!b) {
          console.warn(`✗ ${emo}: empty cell for ${set.careers[i]}`);
          continue;
        }
        const c = crop(im, b);
        crops.set(emo, { im: c, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 });
        await add(`career.${set.careers[i]}:${emo}`, c, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
      }
      for (const v of extra) {
        const im = sheets.get(v)!;
        const b = bbox(im, cell);
        if (!b) {
          console.warn(`✗ ${v}: empty cell for ${set.careers[i]}`);
          continue;
        }
        variants++;
        await add(`career.${set.careers[i]}:${v.replace('-', '')}`, crop(im, b), b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
      }
      const n = crops.get('neutral');
      const sp = crops.get('surprised');
      if (!n) continue;
      // Visors and other faceless heads can't blink.
      const bl = set.careers[i] === 'astronaut' ? null : blink(n.im, n.h);
      if (bl) {
        blinks++;
        await add(`career.${set.careers[i]}:blink`, bl, n.w, n.h);
      }
      // Talking: scale the surprised head onto the neutral head's box (they're drawn at slightly different sizes).
      if (sp) {
        const data = await sharp(sp.im.data, { raw: { width: sp.w, height: sp.h, channels: 4 } })
          .resize(n.w, n.h, { fit: 'fill', kernel: 'lanczos3' })
          .raw()
          .toBuffer();
        const tk = talk(n.im, { data, W: n.w }, n.w, n.h);
        if (tk) {
          talks++;
          await add(`career.${set.careers[i]}:talk`, tk, n.w, n.h);
        }
      }
    }
  }
  // Single heads, one file per career: art/faces-pain/<frame>/<career>.{png,webp} (e.g. hurt2/chef.webp).
  if (existsSync(PER_HEAD)) {
    for (const frame of readdirSync(PER_HEAD).sort()) {
      if (!FRAMES.has(frame)) {
        console.warn(`✗ faces-pain/${frame}: not a face variant (${[...FRAMES].join(', ')})`);
        continue;
      }
      for (const file of readdirSync(join(PER_HEAD, frame)).sort()) {
        if (!/\.(png|webp)$/.test(file)) continue;
        const career = file.replace(/\.(png|webp)$/, '').replace(/_/g, '-');
        const { data, info } = await sharp(join(PER_HEAD, frame, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const im = { data, W: info.width };
        const b = bbox(im, { x0: 0, y0: 0, x1: info.width, y1: info.height });
        if (!b) {
          console.warn(`✗ faces-pain/${frame}/${file}: empty`);
          continue;
        }
        variants++;
        await add(`career.${career}:${frame}`, crop(im, b), b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
      }
    }
  }
  console.log(`✓ ${total} careers × ${EMOTIONS.length} emotions, ${variants} extra pain/shock heads, ${blinks} blink frames, ${talks} talk frames`);
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
  await writeSheet(sharp({ create: { width: ATLAS_W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp), join(OUT, 'faces.webp'));
  writeFileSync(join(OUT, 'faces.json'), JSON.stringify({ w: ATLAS_W, h: H, faces: rects }, null, 1) + '\n');
  console.log(`${pieces.length} faces → ${ATLAS_W}×${H}`);
}

await main();
