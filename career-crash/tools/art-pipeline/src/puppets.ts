/**
 * Puppet slicer: turns character sheets (art/sheets/<career>.png — a posed
 * figure plus the same character cut into body parts on a transparent
 * background) into ragdoll-ready sprite atlases for the client.
 *
 *   pnpm --filter @cc/art-pipeline puppets            # slice every sheet
 *   pnpm --filter @cc/art-pipeline puppets mime chef  # only these
 *
 * Output: apps/client/src/replay/puppets/<career>.webp + puppets.json (part
 * rectangles and joint anchors), and labelled previews in out/puppets/ so a
 * human can check which blob became which part. Sheets whose layout the
 * automatic classifier gets wrong are fixed in art/sheets/manifest.json by
 * mapping part names to the component numbers shown in the preview.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { writeSheet } from './encode';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SHEETS = join(ROOT, 'art/sheets');
const OUT = join(ROOT, 'apps/client/src/replay/puppets');
const PREVIEW = join(ROOT, 'tools/art-pipeline/out/puppets');
/** Height of the whole figure in the atlas (px). Big enough for the zoom lens on retina. */
const FIGURE_PX = 230;
const MIN_AREA = 1200;
const PAD = 2;

export const PARTS = ['head', 'torso', 'pelvis', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR', 'handL', 'handR'] as const;
/** Hands are optional: most sheets draw them on the forearm. */
const OPTIONAL: Part[] = ['handL', 'handR'];
type Part = (typeof PARTS)[number];

interface Comp {
  n: number;
  label: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
  cx: number;
  cy: number;
}

interface SheetOverride {
  career?: string;
  /** part → component number (as printed in the preview). */
  parts?: Partial<Record<Part, number>>;
  /** Lower legs include the shoes (no separate foot parts). */
  noFeet?: boolean;
  /** Parts drawn upside down relative to the body (e.g. hands with the wrist at the bottom). */
  flip?: Part[];
  /** Sheet has no separate pelvis: cut component [n] at this fraction of its height; the lower piece becomes the pelvis. */
  splitPelvis?: [number, number];
  /** Cut component [n] horizontally at this fraction of its height (e.g. a thigh touching its shin); the lower piece becomes component 101, 102, … in order. */
  split?: [number, number][];
}

interface PartOut {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Joint anchors in part-local px: a = parent joint (top), b = child joint / end (bottom). */
  a: [number, number];
  b: [number, number];
}

async function load(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

function components(data: Buffer, W: number, H: number): { labels: Int32Array; comps: Comp[] } {
  const labels = new Int32Array(W * H).fill(-1);
  const comps: Comp[] = [];
  const stack = new Int32Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (labels[start] !== -1 || data[start * 4 + 3]! < 128) continue;
    const label = comps.length;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = label;
    const c: Comp = { n: 0, label, x0: W, y0: H, x1: 0, y1: 0, area: 0, cx: 0, cy: 0 };
    while (sp > 0) {
      const p = stack[--sp]!;
      const x = p % W;
      const y = (p / W) | 0;
      c.area++;
      c.cx += x;
      c.cy += y;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (labels[q] === -1 && data[q * 4 + 3]! >= 128) {
            labels[q] = label;
            stack[sp++] = q;
          }
        }
      }
    }
    c.cx /= c.area;
    c.cy /= c.area;
    comps.push(c);
  }
  return { labels, comps };
}

/** Fold specks (loose laces, hair strands) into the big blob they belong to. */
function mergeSmall(comps: Comp[], labels: Int32Array): Comp[] {
  const big = comps.filter((c) => c.area >= MIN_AREA);
  const remap = new Map<number, number>();
  for (const c of comps) {
    if (c.area >= MIN_AREA) continue;
    let best: Comp | null = null;
    let bestD = 14;
    for (const b of big) {
      const dx = Math.max(0, b.x0 - c.x1, c.x0 - b.x1);
      const dy = Math.max(0, b.y0 - c.y1, c.y0 - b.y1);
      const d = Math.max(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best) continue;
    remap.set(c.label, best.label);
    best.x0 = Math.min(best.x0, c.x0);
    best.y0 = Math.min(best.y0, c.y0);
    best.x1 = Math.max(best.x1, c.x1);
    best.y1 = Math.max(best.y1, c.y1);
  }
  for (let i = 0; i < labels.length; i++) {
    const m = remap.get(labels[i]!);
    if (m !== undefined) labels[i] = m;
  }
  // Stable numbering for humans: top-to-bottom rows, then left-to-right.
  big.sort((a, b) => (Math.abs(a.y0 - b.y0) < 40 ? a.x0 - b.x0 : a.y0 - b.y0));
  big.forEach((c, i) => (c.n = i));
  return big;
}

/**
 * Standard layout (most sheets): posed figure on the left; parts on the right
 * with head / torso / pelvis / thighs / shins / feet down the middle and the
 * arm pieces in outer columns.
 */
function classify(comps: Comp[]): Partial<Record<Part, Comp>> {
  const figure = comps.reduce((a, b) => (b.area > a.area ? b : a));
  const rest = comps.filter((c) => c !== figure && c.cx > figure.x1 - 20);
  const out: Partial<Record<Part, Comp>> = {};
  if (rest.length !== 13 && rest.length !== 11) return out;
  const byX = [...rest].sort((a, b) => a.cx - b.cx);
  const left = byX.slice(0, 2).sort((a, b) => a.cy - b.cy);
  const right = byX.slice(-2).sort((a, b) => a.cy - b.cy);
  out.upperArmL = left[0];
  out.foreArmL = left[1];
  out.upperArmR = right[0];
  out.foreArmR = right[1];
  const mid = byX.slice(2, -2).sort((a, b) => a.cy - b.cy);
  [out.head, out.torso, out.pelvis] = mid;
  const pairs = mid.slice(3);
  const names: [Part, Part][] = [
    ['thighL', 'thighR'],
    ['shinL', 'shinR'],
    ['footL', 'footR'],
  ];
  names.forEach(([l, r], i) => {
    const pair = pairs.slice(i * 2, i * 2 + 2).sort((a, b) => a.cx - b.cx);
    out[l] = pair[0];
    out[r] = pair[1];
  });
  return out;
}

/** Alpha-weighted centroid x of a horizontal band of a part (fractions of its height). */
function bandX(data: Buffer, labels: Int32Array, W: number, c: Comp, from: number, to: number): number {
  const h = c.y1 - c.y0 + 1;
  let sx = 0;
  let n = 0;
  for (let y = c.y0 + Math.floor(h * from); y <= c.y0 + Math.ceil(h * to) && y <= c.y1; y++) {
    for (let x = c.x0; x <= c.x1; x++) {
      const p = y * W + x;
      if (labels[p] === c.label && data[p * 4 + 3]! >= 128) {
        sx += x;
        n++;
      }
    }
  }
  return n ? sx / n : (c.x0 + c.x1) / 2;
}

function anchors(part: Part, data: Buffer, labels: Int32Array, W: number, c: Comp): { a: [number, number]; b: [number, number] } {
  const h = c.y1 - c.y0 + 1;
  const at = (from: number, to: number, yf: number): [number, number] => [bandX(data, labels, W, c, from, to) - c.x0, h * yf];
  switch (part) {
    case 'head':
      // a = neck (bottom of the head), b = crown.
      return { a: at(0.85, 1, 0.93), b: at(0, 0.15, 0.05) };
    case 'torso':
      return { a: at(0, 0.12, 0.06), b: at(0.88, 1, 0.95) };
    case 'pelvis':
      return { a: at(0, 0.12, 0.08), b: at(0.6, 0.9, 0.8) };
    case 'footL':
    case 'footR':
      return { a: at(0, 0.15, 0.12), b: at(0.85, 1, 0.95) };
    default:
      // Limb segments: joint near each rounded end.
      return { a: at(0, 0.1, 0.07), b: at(0.9, 1, 0.93) };
  }
}

/** Copy one component (only its own pixels) out of the sheet. */
function extract(data: Buffer, labels: Int32Array, W: number, c: Comp): { buf: Buffer; w: number; h: number } {
  const w = c.x1 - c.x0 + 1;
  const h = c.y1 - c.y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (c.y0 + y) * W + c.x0 + x;
      if (labels[p] !== c.label) continue;
      data.copy(buf, (y * w + x) * 4, p * 4, p * 4 + 4);
    }
  }
  return { buf, w, h };
}

async function preview(name: string, file: string, comps: Comp[], parts: Partial<Record<Part, Comp>>): Promise<void> {
  const { W, H } = await load(file);
  const nameOf = new Map<Comp, string>();
  for (const [k, c] of Object.entries(parts)) if (c) nameOf.set(c, k);
  const boxes = comps
    .map(
      (c) =>
        `<rect x="${c.x0}" y="${c.y0}" width="${c.x1 - c.x0}" height="${c.y1 - c.y0}" fill="none" stroke="${nameOf.has(c) ? '#22c55e' : '#ef4444'}" stroke-width="3"/>` +
        `<text x="${c.x0 + 4}" y="${c.y0 + 26}" font-size="26" font-family="sans-serif" font-weight="bold" fill="#fff" stroke="#000" stroke-width="1">${c.n} ${nameOf.get(c) ?? ''}</text>`,
    )
    .join('');
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#445"/></svg>`);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${boxes}</svg>`);
  mkdirSync(PREVIEW, { recursive: true });
  await sharp(bg)
    .composite([{ input: file }, { input: svg }])
    .png()
    .toFile(join(PREVIEW, `${name}.png`));
}

async function sliceSheet(name: string, override: SheetOverride): Promise<[string, unknown] | null> {
  const file = join(SHEETS, `${name}.png`);
  const { data, W, H } = await load(file);
  const { labels, comps: raw } = components(data, W, H);
  const comps = mergeSmall(raw, labels);
  // Cut a component in two at a fraction of its height; the lower piece gets a new number.
  const cutComp = (n: number, at: number, newN: number) => {
    const c = comps.find((k) => k.n === n)!;
    const cut = c.y0 + Math.round((c.y1 - c.y0) * at);
    const lower: Comp = { n: newN, label: Math.max(...comps.map((k) => k.label)) + 1, x0: W, y0: cut, x1: 0, y1: c.y1, area: 0, cx: 0, cy: 0 };
    for (let y = cut; y <= c.y1; y++) {
      for (let x = c.x0; x <= c.x1; x++) {
        if (labels[y * W + x] !== c.label) continue;
        labels[y * W + x] = lower.label;
        lower.x0 = Math.min(lower.x0, x);
        lower.x1 = Math.max(lower.x1, x);
        lower.area++;
        lower.cx += x;
        lower.cy += y;
      }
    }
    lower.cx /= lower.area;
    lower.cy /= lower.area;
    c.y1 = cut - 1;
    c.cy = (c.y0 + c.y1) / 2;
    c.area -= lower.area;
    comps.push(lower);
  };
  if (override.splitPelvis) cutComp(override.splitPelvis[0], override.splitPelvis[1], 100);
  (override.split ?? []).forEach(([n, at], i) => cutComp(n, at, 101 + i));
  const auto = classify(comps);
  const parts: Partial<Record<Part, Comp>> = { ...auto };
  for (const [k, n] of Object.entries(override.parts ?? {})) parts[k as Part] = comps.find((c) => c.n === n);
  await preview(name, file, comps, parts);
  const noFeet = override.noFeet || (!parts.footL && !parts.footR);
  if (noFeet) {
    delete parts.footL;
    delete parts.footR;
  }
  const wanted = PARTS.filter((p) => !(noFeet && p.startsWith('foot')) && (!OPTIONAL.includes(p) || parts[p]));
  const missing = wanted.filter((p) => !parts[p]);
  if (missing.length) {
    console.warn(`✗ ${name}: missing ${missing.join(', ')} — see out/puppets/${name}.png and add overrides to art/sheets/manifest.json`);
    return null;
  }
  const figure = comps.reduce((a, b) => (b.area > a.area ? b : a));
  const scale = FIGURE_PX / (figure.y1 - figure.y0 + 1);

  // Downscale each part, then shelf-pack into one atlas.
  const pieces: { part: Part; png: Buffer; w: number; h: number; a: [number, number]; b: [number, number] }[] = [];
  for (const part of wanted) {
    const c = parts[part]!;
    const { buf, w, h } = extract(data, labels, W, c);
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const png = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .resize(tw, th, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    const raw = anchors(part, data, labels, W, c);
    const an = override.flip?.includes(part) ? { a: raw.b, b: raw.a } : raw;
    const sc = (p: [number, number]): [number, number] => [Math.round(p[0] * scale * 10) / 10, Math.round(p[1] * scale * 10) / 10];
    pieces.push({ part, png, w: tw, h: th, a: sc(an.a), b: sc(an.b) });
  }
  const atlasW = 512;
  let x = PAD;
  let y = PAD;
  let rowH = 0;
  const placed: Record<string, PartOut> = {};
  const composite: OverlayOptions[] = [];
  for (const p of [...pieces].sort((a, b) => b.h - a.h)) {
    if (x + p.w + PAD > atlasW) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    placed[p.part] = { x, y, w: p.w, h: p.h, a: p.a, b: p.b };
    composite.push({ input: p.png, left: x, top: y });
    x += p.w + PAD;
    rowH = Math.max(rowH, p.h);
  }
  const atlasH = y + rowH + PAD;
  mkdirSync(OUT, { recursive: true });
  await writeSheet(sharp({ create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composite), join(OUT, `${name}.webp`), { dither: 0.5 });
  const career = override.career ?? `career.${name}`;
  console.log(`✓ ${name} → ${career} (${atlasW}×${atlasH})`);
  return [career, { file: `${name}.webp`, w: atlasW, h: atlasH, parts: placed }];
}

async function main(): Promise<void> {
  const manifestFile = join(SHEETS, 'manifest.json');
  const manifest: Record<string, SheetOverride> = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
  const only = process.argv.slice(2);
  const names = readdirSync(SHEETS)
    .filter((f) => f.endsWith('.png'))
    .map((f) => basename(f, '.png'))
    .filter((n) => !only.length || only.includes(n));
  const indexFile = join(OUT, 'puppets.json');
  const index: Record<string, unknown> = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
  for (const name of names) {
    const res = await sliceSheet(name, manifest[name] ?? {});
    if (res) index[res[0]] = res[1];
  }
  const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(indexFile, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`${Object.keys(sorted).length} puppets in ${indexFile}`);
}

await main();
