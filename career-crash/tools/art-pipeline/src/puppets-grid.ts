/**
 * Grid puppet slicer: one sheet with many careers in a grid (art/sheets-grid/
 * <sheet>.jpg + manifest.json), each cell holding a posed figure on the left
 * and an "exploded" figure on the right — the same character with every body
 * part drawn separately in its natural place (head on top, arms beside the
 * torso, legs below). The flat background is keyed out by flood fill, the
 * exploded figure is split into parts by position, and the parts are packed
 * into a per-career atlas like tools/art-pipeline puppets.
 *
 *   pnpm --filter @cc/art-pipeline puppets-grid
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SHEETS = join(ROOT, 'art/sheets-grid');
const OUT = join(ROOT, 'apps/client/src/replay/puppets');
const PREVIEW = join(ROOT, 'tools/art-pipeline/out/puppets-grid');
/** Upscale factor (the grid sheets are small). */
const SCALE = 1.5;
const PAD = 2;
/** Background tolerance (sum of RGB differences): tight, as clothes can be nearly the background grey. */
const TOL = Number(process.env.TOL ?? 16);
/** Erosion passes used to split parts that touch through thin bridges. */
/** Pixels at least this light (and near-neutral) only count as gaps when splitting parts. */
const SETTINGS: [number, number, number][] = [];
for (const b of [0, 70, 110]) for (const e of [1, 2, 0, 3, 4]) for (const l of [170, 180, 160, 196, 150, 210, 140]) SETTINGS.push([l, e, b]);

type Part = 'head' | 'torso' | 'pelvis' | 'upperArmL' | 'upperArmR' | 'foreArmL' | 'foreArmR' | 'thighL' | 'thighR' | 'shinL' | 'shinR' | 'footL' | 'footR';

interface Grid {
  file: string;
  cols: number;
  rows: number;
  careers: string[];
  /** Fraction of the cell width where the exploded figure starts. */
  split?: number;
  /** Careers whose sheet doesn't slice cleanly (they keep the paper doll + painted face). */
  skip?: string[];
}

interface Comp {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
  cx: number;
  cy: number;
}

interface Img {
  data: Buffer;
  W: number;
  H: number;
}

const slugOf = (c: string) => c.replace('career.', '');
const idx = (im: Img, x: number, y: number) => (y * im.W + x) * 4;

/** Make the flat background transparent: flood fill from the cell's edges through background-coloured pixels. */
function keyCell(im: Img, x0: number, y0: number, x1: number, y1: number): void {
  const w = x1 - x0;
  const h = y1 - y0;
  const bgAt = idx(im, x0 + 2, y0 + 2);
  const bg = [im.data[bgAt]!, im.data[bgAt + 1]!, im.data[bgAt + 2]!];
  const near = (x: number, y: number) => {
    const i = idx(im, x, y);
    const d = Math.abs(im.data[i]! - bg[0]!) + Math.abs(im.data[i + 1]! - bg[1]!) + Math.abs(im.data[i + 2]! - bg[2]!);
    return d < TOL;
  };
  const seen = new Uint8Array(w * h);
  const st: number[] = [];
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) {
    const p = st.pop()!;
    if (seen[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    if (!near(x0 + x, y0 + y)) continue;
    seen[p] = 1;
    im.data[idx(im, x0 + x, y0 + y) + 3] = 0;
    if (x > 0) st.push(p - 1);
    if (x < w - 1) st.push(p + 1);
    if (y > 0) st.push(p - w);
    if (y < h - 1) st.push(p + w);
  }
  // JPEG fringe: light-grey pixels hugging the keyed area go too (a couple of passes).
  for (let pass = 0; pass < 6; pass++) {
    const kill: number[] = [];
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = idx(im, x0 + x, y0 + y);
        if (im.data[i + 3] === 0) continue;
        const d = Math.abs(im.data[i]! - bg[0]!) + Math.abs(im.data[i + 1]! - bg[1]!) + Math.abs(im.data[i + 2]! - bg[2]!);
        const sat = Math.max(im.data[i]!, im.data[i + 1]!, im.data[i + 2]!) - Math.min(im.data[i]!, im.data[i + 1]!, im.data[i + 2]!);
        if (d >= 54 || sat > 22) continue;
        const t = [idx(im, x0 + x - 1, y0 + y), idx(im, x0 + x + 1, y0 + y), idx(im, x0 + x, y0 + y - 1), idx(im, x0 + x, y0 + y + 1)].some((j) => im.data[j + 3] === 0);
        if (t) kill.push(i);
      }
    for (const i of kill) im.data[i + 3] = 0;
  }
}

/**
 * Components of the foreground after eroding it (so parts touching through
 * thin bridges or halos come apart), then every foreground pixel is given to
 * the nearest eroded core — the parts keep their full outlines.
 */
function splitComponents(im: Img, x0: number, y0: number, x1: number, y1: number, labels: Int32Array, LIGHT: number, ERODE: number, BGCUT = 0, bg: number[] = [221, 221, 221]): Comp[] {
  const w = x1 - x0;
  const h = y1 - y0;
  let fg = new Uint8Array(w * h);
  const full = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = idx(im, x0 + x, y0 + y);
      const d = im.data;
      full[y * w + x] = d[i + 3]! >= 128 ? 1 : 0;
      // Cores exclude light, near-neutral pixels: the halos and gaps between parts (and white cloth, re-assigned below).
      const lo = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
      const hi = Math.max(d[i]!, d[i + 1]!, d[i + 2]!);
      const dbg = Math.abs(d[i]! - bg[0]!) + Math.abs(d[i + 1]! - bg[1]!) + Math.abs(d[i + 2]! - bg[2]!);
      fg[y * w + x] = full[y * w + x] && !(lo >= LIGHT && hi - lo <= 34) && !(dbg < BGCUT) ? 1 : 0;
    }
  for (let k = 0; k < ERODE; k++) {
    const e = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        e[p] = fg[p] && fg[p - 1] && fg[p + 1] && fg[p - w] && fg[p + w] ? 1 : 0;
      }
    fg = e;
  }
  // Components of the eroded cores (4-connected).
  const core = new Int32Array(w * h);
  const comps: Comp[] = [];
  const st: number[] = [];
  for (let p = 0; p < w * h; p++) {
    if (!fg[p] || core[p]) continue;
    const id = comps.length + 1;
    let n = 0;
    core[p] = id;
    st.push(p);
    const members: number[] = [];
    while (st.length) {
      const q = st.pop()!;
      members.push(q);
      n++;
      const qx = q % w;
      for (const nq of [q - 1, q + 1, q - w, q + w]) {
        if (nq < 0 || nq >= w * h || core[nq] || !fg[nq]) continue;
        if ((nq === q - 1 && qx === 0) || (nq === q + 1 && qx === w - 1)) continue;
        core[nq] = id;
        st.push(nq);
      }
    }
    comps.push({ id, x0: 0, y0: 0, x1: 0, y1: 0, area: n, cx: 0, cy: 0 });
  }
  // Grow the cores back over the full foreground (multi-source BFS).
  const own = new Int32Array(w * h);
  let frontier: number[] = [];
  for (let p = 0; p < w * h; p++)
    if (core[p] && comps[core[p]! - 1]!.area >= 12) {
      own[p] = core[p]!;
      frontier.push(p);
    }
  while (frontier.length) {
    const next: number[] = [];
    for (const q of frontier) {
      const qx = q % w;
      for (const nq of [q - 1, q + 1, q - w, q + w]) {
        if (nq < 0 || nq >= w * h || own[nq] || !full[nq]) continue;
        if ((nq === q - 1 && qx === 0) || (nq === q + 1 && qx === w - 1)) continue;
        own[nq] = own[q]!;
        next.push(nq);
      }
    }
    frontier = next;
  }
  const out = new Map<number, Comp>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const id = own[y * w + x]!;
      if (!id) continue;
      const gx = x0 + x;
      const gy = y0 + y;
      labels[gy * im.W + gx] = id + 100000 * (y0 + 1);
      let c = out.get(id);
      if (!c) out.set(id, (c = { id: id + 100000 * (y0 + 1), x0: gx, y0: gy, x1: gx, y1: gy, area: 0, cx: 0, cy: 0 }));
      c.area++;
      c.cx += gx;
      c.cy += gy;
      c.x0 = Math.min(c.x0, gx);
      c.y0 = Math.min(c.y0, gy);
      c.x1 = Math.max(c.x1, gx);
      c.y1 = Math.max(c.y1, gy);
    }
  for (const c of out.values()) {
    c.cx /= c.area;
    c.cy /= c.area;
  }
  return [...out.values()];
}

/** Specks → merged into the nearest big part (by bounding-box distance). */
function mergeSmall(comps: Comp[], labels: Int32Array, minArea: number): Comp[] {
  const big = comps.filter((c) => c.area >= minArea);
  const remap = new Map<number, number>();
  for (const c of comps) {
    if (c.area >= minArea) continue;
    let best: Comp | null = null;
    let bestD = 6;
    for (const b of big) {
      const d = Math.max(Math.max(0, b.x0 - c.x1, c.x0 - b.x1), Math.max(0, b.y0 - c.y1, c.y0 - b.y1));
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best) continue;
    remap.set(c.id, best.id);
    best.x0 = Math.min(best.x0, c.x0);
    best.y0 = Math.min(best.y0, c.y0);
    best.x1 = Math.max(best.x1, c.x1);
    best.y1 = Math.max(best.y1, c.y1);
  }
  for (let i = 0; i < labels.length; i++) {
    const m = remap.get(labels[i]!);
    if (m !== undefined) labels[i] = m;
  }
  return big;
}

/** Where each part sits in an exploded figure, as fractions of its bounding box. */
const TEMPLATE: Record<Part, [number, number]> = {
  head: [0.5, 0.1],
  torso: [0.5, 0.34],
  upperArmL: [0.1, 0.31],
  foreArmL: [0.1, 0.5],
  upperArmR: [0.9, 0.31],
  foreArmR: [0.9, 0.5],
  pelvis: [0.5, 0.53],
  thighL: [0.37, 0.64],
  thighR: [0.63, 0.64],
  shinL: [0.37, 0.8],
  shinR: [0.63, 0.8],
  footL: [0.35, 0.95],
  footR: [0.65, 0.95],
};

/** Minimum-cost assignment (Hungarian algorithm) on a square cost matrix; returns row → column. */
function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1]![j - 1]! - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}

/**
 * Exploded figure → parts: the 13 anatomical slots are matched to the biggest
 * pieces by position (optimal assignment), then leftover fragments (stripes
 * split off by white cloth, held tools) join whichever part they touch or sit
 * closest to. Returns part → the ids of the pieces that make it up.
 */
function classify(comps: Comp[]): Partial<Record<Part, Comp[]>> | string {
  const parts = Object.keys(TEMPLATE) as Part[];
  if (comps.length < parts.length) return `only ${comps.length} parts`;
  const X0 = Math.min(...comps.map((c) => c.x0));
  const X1 = Math.max(...comps.map((c) => c.x1));
  const Y0 = Math.min(...comps.map((c) => c.y0));
  const Y1 = Math.max(...comps.map((c) => c.y1));
  const nx = (c: Comp) => (c.cx - X0) / Math.max(1, X1 - X0);
  const ny = (c: Comp) => (c.cy - Y0) / Math.max(1, Y1 - Y0);
  const maxA = Math.max(...comps.map((c) => c.area));
  const n = comps.length;
  const cost: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i >= parts.length) {
        row.push(0);
        continue;
      }
      const [tx, ty] = TEMPLATE[parts[i]!];
      const c = comps[j]!;
      const d = (nx(c) - tx) ** 2 * 1.5 + (ny(c) - ty) ** 2;
      // Small fragments make poor anchors.
      row.push(d + 0.15 * (1 - Math.min(1, c.area / (maxA * 0.25))));
    }
    cost.push(row);
  }
  const pick = hungarian(cost);
  const out: Partial<Record<Part, Comp[]>> = {};
  const owner = new Map<Comp, Part>();
  parts.forEach((part, i) => {
    const c = comps[pick[i]!]!;
    out[part] = [c];
    owner.set(c, part);
  });
  // Leftovers: nearest part by bounding-box gap (ties → centroid distance).
  const gap = (a: Comp, b: Comp) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1) + Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  for (const c of comps) {
    if (owner.has(c)) continue;
    let best: Part = 'torso';
    let bestD = Infinity;
    for (const part of parts)
      for (const o of out[part]!) {
        const d = gap(c, o) * 100 + Math.hypot(c.cx - o.cx, c.cy - o.cy);
        if (d < bestD) {
          bestD = d;
          best = part;
        }
      }
    out[best]!.push(c);
  }
  // Sanity: arms outside the legs, left/right the right way round, head on top.
  const cx = (p: Part) => out[p]!.reduce((s, c) => s + c.cx * c.area, 0) / out[p]!.reduce((s, c) => s + c.area, 0);
  const cy = (p: Part) => out[p]!.reduce((s, c) => s + c.cy * c.area, 0) / out[p]!.reduce((s, c) => s + c.area, 0);
  if (cx('upperArmL') > cx('torso') || cx('upperArmR') < cx('torso')) return 'arms on the wrong side';
  if (cy('head') > cy('torso') || cy('torso') > cy('pelvis') || cy('pelvis') > cy('thighL') || cy('thighL') > cy('shinL') || cy('shinL') > cy('footL')) return 'parts out of order';
  if (cy('upperArmL') > cy('foreArmL') || cy('upperArmR') > cy('foreArmR')) return 'arm segments out of order';
  return out;
}

function bandX(im: Img, labels: Int32Array, c: Comp, from: number, to: number): number {
  const h = c.y1 - c.y0 + 1;
  let sx = 0;
  let n = 0;
  for (let y = c.y0 + Math.floor(h * from); y <= c.y0 + Math.ceil(h * to) && y <= c.y1; y++)
    for (let x = c.x0; x <= c.x1; x++)
      if (labels[y * im.W + x] === c.id) {
        sx += x;
        n++;
      }
  return n ? sx / n : (c.x0 + c.x1) / 2;
}

function anchors(part: Part, im: Img, labels: Int32Array, c: Comp): { a: [number, number]; b: [number, number] } {
  const h = c.y1 - c.y0 + 1;
  const at = (from: number, to: number, yf: number): [number, number] => [bandX(im, labels, c, from, to) - c.x0, h * yf];
  switch (part) {
    case 'head':
      return { a: at(0.85, 1, 0.93), b: at(0, 0.15, 0.05) };
    case 'torso':
      return { a: at(0, 0.12, 0.06), b: at(0.88, 1, 0.95) };
    case 'pelvis':
      return { a: at(0, 0.12, 0.08), b: at(0.6, 0.9, 0.8) };
    case 'footL':
    case 'footR':
      return { a: at(0, 0.15, 0.12), b: at(0.85, 1, 0.95) };
    default:
      return { a: at(0, 0.1, 0.07), b: at(0.9, 1, 0.93) };
  }
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(join(SHEETS, 'manifest.json'), 'utf8')) as Record<string, Grid>;
  const indexFile = join(OUT, 'puppets.json');
  const index: Record<string, unknown> = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : {};
  mkdirSync(PREVIEW, { recursive: true });
  for (const [sheet, g] of Object.entries(manifest)) {
    const { data, info } = await sharp(join(SHEETS, g.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const im: Img = { data, W: info.width, H: info.height };
    const cw = im.W / g.cols;
    const ch = im.H / g.rows;
    const labels = new Int32Array(im.W * im.H);
    let ok = 0;
    for (let i = 0; i < g.careers.length; i++) {
      const career = g.careers[i]!;
      if (g.skip?.includes(career)) {
        delete index[career];
        continue;
      }
      const cx0 = Math.round((i % g.cols) * cw);
      const cy0 = Math.round(Math.floor(i / g.cols) * ch);
      const cx1 = Math.round(cx0 + cw);
      const cy1 = Math.round(cy0 + ch);
      keyCell(im, cx0, cy0, cx1, cy1);
      // Exploded figure: right part of the cell, above the label.
      const sx = Math.round(cx0 + cw * (g.split ?? 0.5));
      const ey1 = Math.round(cy0 + ch * 0.8);
      // Try split settings until the figure classifies cleanly.
      let comps: Comp[] = [];
      let parts: ReturnType<typeof classify> = 'no settings';
      let used = '';
      for (const [light, erode, bgcut] of SETTINGS) {
        for (let yy = cy0; yy < ey1; yy++) labels.fill(0, yy * im.W + sx, yy * im.W + cx1);
        comps = mergeSmall(splitComponents(im, sx, cy0, cx1, ey1, labels, light, erode, bgcut), labels, 40);
        parts = classify(comps);
        used = `light ${light}, erode ${erode}, bgcut ${bgcut}`;
        if (typeof parts !== 'string') break;
      }
      if (process.env.DBG === slugOf(career)) console.log(comps.map((c) => `${c.x0 - cx0},${c.y0 - cy0} ${c.x1 - c.x0 + 1}x${c.y1 - c.y0 + 1} a${c.area}`).join('\n'));
      const slug = career.replace('career.', '');
      // Preview: the cell with part boxes, to check the split by eye.
      const svg = comps
        .map(
          (c) =>
            `<rect x="${c.x0 - cx0}" y="${c.y0 - cy0}" width="${c.x1 - c.x0 + 1}" height="${c.y1 - c.y0 + 1}" fill="none" stroke="${typeof parts === 'string' ? '#ef4444' : '#22c55e'}" stroke-width="1"/>`,
        )
        .join('');
      const cell = Buffer.alloc((cx1 - cx0) * (cy1 - cy0) * 4);
      for (let y = 0; y < cy1 - cy0; y++) im.data.copy(cell, y * (cx1 - cx0) * 4, idx(im, cx0, cy0 + y), idx(im, cx0, cy0 + y) + (cx1 - cx0) * 4);
      await sharp(cell, { raw: { width: cx1 - cx0, height: cy1 - cy0, channels: 4 } })
        .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cx1 - cx0}" height="${cy1 - cy0}">${svg}</svg>`) }])
        .resize((cx1 - cx0) * 3, (cy1 - cy0) * 3, { kernel: 'nearest' })
        .png()
        .toFile(join(PREVIEW, `${slug}.png`));
      if (typeof parts === 'string') {
        console.warn(`✗ ${slug}: ${parts}`);
        continue;
      }
      const pieces: { part: Part; png: Buffer; w: number; h: number; a: [number, number]; b: [number, number] }[] = [];
      for (const [part, group] of Object.entries(parts) as [Part, Comp[]][]) {
        // Several pieces make one part: relabel them as the first.
        const c: Comp = {
          ...group[0]!,
          x0: Math.min(...group.map((g) => g.x0)),
          y0: Math.min(...group.map((g) => g.y0)),
          x1: Math.max(...group.map((g) => g.x1)),
          y1: Math.max(...group.map((g) => g.y1)),
        };
        const ids = new Set(group.map((g) => g.id));
        for (let yy = c.y0; yy <= c.y1; yy++)
          for (let xx = c.x0; xx <= c.x1; xx++) {
            const q = yy * im.W + xx;
            if (ids.has(labels[q]!)) labels[q] = c.id;
          }
        const w = c.x1 - c.x0 + 1;
        const h = c.y1 - c.y0 + 1;
        const buf = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const p = (c.y0 + y) * im.W + c.x0 + x;
            if (labels[p] === c.id) im.data.copy(buf, (y * w + x) * 4, p * 4, p * 4 + 4);
          }
        const tw = Math.round(w * SCALE);
        const th = Math.round(h * SCALE);
        const png = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
          .resize(tw, th, { kernel: 'lanczos3' })
          .png()
          .toBuffer();
        const an = anchors(part, im, labels, c);
        const sc = (p: [number, number]): [number, number] => [Math.round(p[0] * SCALE * 10) / 10, Math.round(p[1] * SCALE * 10) / 10];
        pieces.push({ part, png, w: tw, h: th, a: sc(an.a), b: sc(an.b) });
      }
      const atlasW = 256;
      let x = PAD;
      let y = PAD;
      let rowH = 0;
      const placed: Record<string, unknown> = {};
      const comp: OverlayOptions[] = [];
      for (const p of [...pieces].sort((a, b) => b.h - a.h)) {
        if (x + p.w + PAD > atlasW) {
          x = PAD;
          y += rowH + PAD;
          rowH = 0;
        }
        placed[p.part] = { x, y, w: p.w, h: p.h, a: p.a, b: p.b };
        comp.push({ input: p.png, left: x, top: y });
        x += p.w + PAD;
        rowH = Math.max(rowH, p.h);
      }
      const atlasH = y + rowH + PAD;
      await sharp({ create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(comp)
        .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10, dither: 0.5 })
        .toFile(join(OUT, `${slug}.png`));
      index[career] = { file: `${slug}.png`, w: atlasW, h: atlasH, parts: placed };
      ok++;
      if (process.env.VERBOSE) console.log(`  ${slug}: ${used}`);
    }
    console.log(`✓ ${sheet}: ${ok}/${g.careers.length} careers`);
  }
  const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(indexFile, JSON.stringify(sorted, null, 1) + '\n');
}

await main();
