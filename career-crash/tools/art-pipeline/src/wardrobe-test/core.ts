/**
 * Wardrobe pixel tests (doc 13, phase 0): shared pieces.
 *
 * Everything is drawn as SVG in final-pixel units (1 unit = 1 sprite pixel),
 * rendered 8× too big, then reduced to the native grid by majority vote and
 * snapped to the draft palette: "paint big, pixelate in the pipeline" (13 §3.2).
 * Layers stay separate pixel sprites and are stacked the way the game would
 * (hat back → face → accessory → hat front), so the anchors are really tested.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

export const ROOT = new URL('../../../../', import.meta.url).pathname;
export const TESTS = join(ROOT, 'art/style-tile/tests');

interface PaletteFile {
  ink: string;
  skin: Record<string, string[]>;
  hair: Record<string, string[]>;
  cloth: Record<string, string[]>;
  misc: Record<string, string>;
}
export const PAL = JSON.parse(readFileSync(join(TESTS, 'palette-draft.json'), 'utf8')) as PaletteFile;
export const INK = PAL.ink;

export type RGB = [number, number, number];
export const hex = (c: string): RGB => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as RGB;
const toHex = (c: number[]): string => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number): string => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i]! - v) * t));
};

/** Every ramp by name ("skin.s2", "hair.brown", "cloth.denim"), dark → light. */
export const RAMPS = new Map<string, string[]>();
for (const group of ['skin', 'hair', 'cloth'] as const) for (const [k, v] of Object.entries(PAL[group])) RAMPS.set(`${group}.${k}`, v);
export const ramp = (name: string): string[] => {
  const r = RAMPS.get(name);
  if (!r) throw new Error(`no ramp ${name}`);
  return r;
};
/** The whole palette as a flat list (for snapping art that wasn't drawn in it). */
export const ALL_COLOURS = [...new Set([INK, ...[...RAMPS.values()].flat(), ...Object.values(PAL.misc)])];

/** sRGB → Oklab, so "nearest colour" means nearest to the eye. */
export function oklab([r, g, b]: number[]): RGB {
  const lin = (v: number): number => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r!), lin(g!), lin(b!)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** A sprite: RGBA pixels at native size. */
export interface Img {
  w: number;
  h: number;
  px: Buffer;
}
export const blank = (w: number, h: number): Img => ({ w, h, px: Buffer.alloc(w * h * 4) });
const key = (p: Buffer, i: number): number => (p[i + 3]! < 128 ? -1 : (p[i]! << 16) | (p[i + 1]! << 8) | p[i + 2]!);

export interface RasterOpts {
  /** Ramps that get pixel-noise texture (hair, beards, wool). */
  texture?: string[];
  seed?: number;
}

/**
 * SVG body (in sprite pixels, origin at `ox, oy`) → native-size sprite. Each
 * output pixel takes the colour most of its 8 × 8 block has, so there are no
 * blended in-between tones and every colour is one the drawing used.
 */
export async function raster(body: string, w: number, h: number, ox = 0, oy = 0, opts: RasterOpts = {}): Promise<Img> {
  const K = 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * K}" height="${h * K}" viewBox="${ox} ${oy} ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`;
  const big = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const out = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const votes = new Map<number, number>();
      for (let j = 0; j < K; j++)
        for (let i = 0; i < K; i++) {
          const k = key(big, ((y * K + j) * w * K + x * K + i) * 4);
          votes.set(k, (votes.get(k) ?? 0) + 1);
        }
      let best = -1;
      let n = 0;
      for (const [k, v] of votes) if (v > n) [best, n] = [k, v];
      if (best >= 0) out.px.set([best >> 16, (best >> 8) & 255, best & 255, 255], (y * w + x) * 4);
    }
  if (opts.texture?.length) texture(out, opts.texture, opts.seed ?? 1);
  return out;
}

const noise = (x: number, y: number, s: number): number => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Pixel noise on the named ramps: some pixels step one tone lighter or darker. */
export function texture(img: Img, names: string[], seed: number): void {
  const where = new Map<number, [string[], number]>();
  for (const n of names) ramp(n).forEach((c, i, r) => where.set(parseInt(c.slice(1), 16), [r, i]));
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      const hit = where.get(key(img.px, i));
      if (!hit) continue;
      const [r, at] = hit;
      const n = noise(x, y, seed);
      const to = n < 0.11 ? at + 1 : n > 0.88 ? at - 1 : at;
      if (to !== at && to >= 0 && to < r.length) img.px.set(hex(r[to]!), i);
    }
}


const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export interface PaintOpts extends RasterOpts {
  /** Strength of the ordered dither where two tones of a ramp meet (0 = hard bands). */
  dither?: number;
}

/**
 * The painted layer: smooth SVG (gradients, blurred light and shadow) rendered
 * 8× too big, averaged down to the native grid, then every pixel snapped to
 * the drawing's own colours. Within a ramp the tone is picked by lightness,
 * with a little ordered dither at the band edges (noise on textured ramps),
 * which is what turns a soft painting into VGA-style pixel shading.
 */
export async function paint(body: string, w: number, h: number, ox = 0, oy = 0, opts: PaintOpts = {}): Promise<Img> {
  const K = 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * K}" height="${h * K}" viewBox="${ox} ${oy} ${w} ${h}">${body}</svg>`;
  const big = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const used = [...new Set((body.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase()))];
  const labs = used.map((c) => oklab(hex(c)));
  const inRamp = new Map<string, { labs: RGB[]; cols: string[]; tex: boolean }>();
  for (const [name, r] of RAMPS) {
    const entry = { labs: r.map((c) => oklab(hex(c))), cols: r, tex: !!opts.texture?.includes(name) };
    for (const c of r) if (!inRamp.has(c)) inRamp.set(c, entry);
  }
  const out = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let [r, g, b, a] = [0, 0, 0, 0];
      for (let j = 0; j < K; j++)
        for (let i = 0; i < K; i++) {
          const o = ((y * K + j) * w * K + x * K + i) * 4;
          const al = big[o + 3]!;
          r += big[o]! * al;
          g += big[o + 1]! * al;
          b += big[o + 2]! * al;
          a += al;
        }
      if (a < 128 * K * K) continue;
      const l = oklab([r / a, g / a, b / a]);
      let best = 0;
      let bd = Infinity;
      labs.forEach((p, n) => {
        const d = (p[0] - l[0]) ** 2 + (p[1] - l[1]) ** 2 + (p[2] - l[2]) ** 2;
        if (d < bd) [bd, best] = [d, n];
      });
      let col = used[best]!;
      const rp = inRamp.get(col);
      if (rp) {
        const jit = rp.tex ? (noise(x, y, opts.seed ?? 1) - 0.5) * 0.11 : (BAYER[(x & 3) + (y & 3) * 4]! / 16 - 0.47) * (opts.dither ?? 0.035);
        let rd = Infinity;
        rp.labs.forEach((p, n) => {
          const d = Math.abs(p[0] - (l[0] + jit));
          if (d < rd) [rd, col] = [d, rp.cols[n]!];
        });
      }
      out.px.set([...hex(col), 255], (y * w + x) * 4);
    }
  return out;
}

/** A gradient along a ramp, in sprite pixels: `stops` are [offset, colour]. */
export const lin = (id: string, x1: number, y1: number, x2: number, y2: number, stops: [number, string][]): string =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
export const rad = (id: string, cx: number, cy: number, r: number, stops: [number, string][]): string =>
  `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
/** Soft-edge filters b05, b1, b2 (blur radius in sprite pixels). */
export const BLURS = [0.5, 1, 2].map((s) => `<filter id="b${String(s).replace('0.', '0')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${s}"/></filter>`).join('');

/** Draw `src` over `dst` at (dx, dy). */
export function over(dst: Img, src: Img, dx = 0, dy = 0): Img {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const [X, Y] = [x + dx, y + dy];
      if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
      const i = (y * src.w + x) * 4;
      if (src.px[i + 3]! >= 128) src.px.copy(dst.px, (Y * dst.w + X) * 4, i, i + 4);
    }
  return dst;
}
export const stack = (w: number, h: number, ...layers: (Img | undefined)[]): Img => layers.reduce<Img>((d, l) => (l ? over(d, l) : d), blank(w, h));

/** The 1 px dark line round the outer silhouette only (13 §3.2). */
export function outline(img: Img, colour = INK): Img {
  const out = { ...img, px: Buffer.from(img.px) };
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < img.w && y < img.h && img.px[(y * img.w + x) * 4 + 3]! >= 128;
  const c = hex(colour);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.px.set([...c, 255], (y * img.w + x) * 4);
    }
  return out;
}

/** Swap whole ramps (tone for tone): the "senior colours" recolour that needs no new art. */
export function recolour(img: Img, swaps: Record<string, string>): Img {
  const map = new Map<number, RGB>();
  for (const [from, to] of Object.entries(swaps)) {
    const [a, b] = [ramp(from), ramp(to)];
    a.forEach((c, i) => map.set(parseInt(c.slice(1), 16), hex(b[Math.min(b.length - 1, Math.round((i * (b.length - 1)) / Math.max(1, a.length - 1)))]!)));
  }
  const out = { ...img, px: Buffer.from(img.px) };
  for (let i = 0; i < out.px.length; i += 4) {
    const to = map.get(key(out.px, i));
    if (to) out.px.set(to, i);
  }
  return out;
}

/** Half size by majority vote (ties go to the darker colour, which keeps eyes and brows). */
export function half(img: Img): Img {
  const out = blank(img.w >> 1, img.h >> 1);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const ks = [0, 1, 2, 3].map((n) => key(img.px, ((y * 2 + (n >> 1)) * img.w + x * 2 + (n & 1)) * 4));
      const solid = ks.filter((k) => k >= 0);
      if (solid.length < 2) continue;
      const lum = (k: number): number => 0.3 * (k >> 16) + 0.59 * ((k >> 8) & 255) + 0.11 * (k & 255);
      const count = (k: number): number => solid.filter((s) => s === k).length;
      const best = [...solid].sort((a, b) => count(b) - count(a) || lum(a) - lum(b))[0]!;
      out.px.set([best >> 16, (best >> 8) & 255, best & 255, 255], (y * out.w + x) * 4);
    }
  return out;
}

/** Any RGBA picture → native size on the given colours (the `normalise` step for art that wasn't drawn in the palette). */
export async function normalise(file: Buffer | string, size: number, colours: string[], crop?: { left: number; top: number; width: number; height: number }): Promise<Img> {
  let s = sharp(file).ensureAlpha();
  if (crop) s = s.extract(crop);
  const { data, info } = await s.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const labs = colours.map((c) => oklab(hex(c)));
  const rgbs = colours.map(hex);
  const out = blank(info.width, info.height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const l = oklab([data[i]!, data[i + 1]!, data[i + 2]!]);
    let best = 0;
    let bd = Infinity;
    labs.forEach((p, n) => {
      const d = (p[0] - l[0]) ** 2 + (p[1] - l[1]) ** 2 + (p[2] - l[2]) ** 2;
      if (d < bd) [bd, best] = [d, n];
    });
    out.px.set([...rgbs[best]!, 255], i);
  }
  return out;
}

/** The most common colours of a set of sprites: the automatic palette doc 13 warns about. */
export function autoPalette(imgs: Img[], n: number): string[] {
  const boxes = new Map<number, { n: number; sum: number[] }>();
  for (const img of imgs)
    for (let i = 0; i < img.px.length; i += 4) {
      if (img.px[i + 3]! < 128) continue;
      const k = ((img.px[i]! >> 4) << 8) | ((img.px[i + 1]! >> 4) << 4) | (img.px[i + 2]! >> 4);
      const b = boxes.get(k) ?? { n: 0, sum: [0, 0, 0] };
      b.n++;
      for (let c = 0; c < 3; c++) b.sum[c]! += img.px[i + c]!;
      boxes.set(k, b);
    }
  return [...boxes.values()].sort((a, b) => b.n - a.n).slice(0, n).map((b) => toHex(b.sum.map((v) => v / b.n)));
}

// ── Contact sheets ──────────────────────────────────────────────────────────

export interface Placed {
  img: Img;
  x: number;
  y: number;
  scale: number;
}
export interface Label {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  colour?: string;
}

export async function sheet(file: string, w: number, h: number, items: Placed[], labels: Label[], bg = '#39414f'): Promise<void> {
  const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${labels
    .map((l) => `<text x="${l.x}" y="${l.y}" font-family="Inter, DejaVu Sans, sans-serif" font-size="${l.size ?? 13}" font-weight="${l.bold ? 700 : 400}" fill="${l.colour ?? '#e8ecf4'}">${esc(l.text)}</text>`)
    .join('')}</svg>`;
  const layers = await Promise.all(
    items.map(async (p) => ({
      input: await sharp(p.img.px, { raw: { width: p.img.w, height: p.img.h, channels: 4 } })
        .resize(p.img.w * p.scale, p.img.h * p.scale, { kernel: 'nearest' })
        .png()
        .toBuffer(),
      left: Math.round(p.x),
      top: Math.round(p.y),
    })),
  );
  await sharp({ create: { width: w, height: h, channels: 3, background: bg } })
    .composite([...layers, { input: Buffer.from(text), left: 0, top: 0 }])
    .png({ compressionLevel: 9, palette: true, colours: 256 })
    .toFile(file);
}

// ── SVG shorthand ───────────────────────────────────────────────────────────

export const path = (d: string, fill: string, extra = ''): string => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const ell = (cx: number, cy: number, rx: number, ry: number, fill: string): string => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
export const rect = (x: number, y: number, w: number, h: number, fill: string, r = 0): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
export const line = (d: string, stroke: string, w = 1, cap = 'butt'): string => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
