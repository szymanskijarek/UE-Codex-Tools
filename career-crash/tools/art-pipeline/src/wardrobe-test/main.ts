/**
 * Wardrobe pixel tests (doc 13, phase 0): draws the test art and the contact
 * sheets in art/style-tile/tests/. Nothing here is game art; it tests the
 * plan's claims with code-drawn stand-ins.
 *
 *   pnpm --filter @cc/art-pipeline wardrobe-test
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ALL_COLOURS, ROOT, TESTS, autoPalette, blank, half, normalise, outline, over, ramp, recolour, sheet, stack, type Img, type Label, type Placed } from './core';
import { CELL_H, CELL_W, FACES, FRAMES, faceSprite, ownHeadwear, type Face, type Frame } from './faces';
import { BODY_H, BODY_W, HATS, HEAD_AT, OUTFITS, bodySprite, hatSprite, type Hat, type Outfit } from './wear';

const cache = new Map<string, Promise<Img | undefined>>();
const once = (k: string, make: () => Promise<Img | undefined>): Promise<Img | undefined> => cache.get(k) ?? (cache.set(k, make()), cache.get(k)!);
const face = async (f: Face, fr: Frame): Promise<Img> => (await once(`${f.id}:${fr}`, () => faceSprite(f, fr)))!;
/** How much bigger a helmet must be to go over a face's own headwear. */
const fitOf = (f: Face): number => (f.style === 'turban' ? 1.2 : f.style === 'hijab' ? 1.07 : 1);
const hatLayer = (h: Hat, l: 'back' | 'front', fit: number): Promise<Img | undefined> => once(`${h.id}:${l}:${fit}`, () => hatSprite(h, l, fit));
const hat = (id: string): Hat => HATS.find((h) => h.id === id)!;
const faceOf = (id: string): Face => FACES.find((f) => f.id === id)!;
const outfit = (id: string): Outfit => OUTFITS.find((o) => o.id === id)!;

/**
 * The layer rules of 13 §2.1: caps and helmets switch the face to hat-hair; a
 * face with its own headwear keeps it, is never offered caps (null) and takes
 * helmets over it; face accessories go on anything. Returns the layers back to front.
 */
async function headLayers(f: Face, h?: Hat, acc?: Hat, frame: Frame = 'neutral'): Promise<(Img | undefined)[] | null> {
  const own = ownHeadwear(f);
  if (h && own && h.type === 'cap') return null;
  const fit = h && own ? fitOf(f) : 1;
  return [h && (await hatLayer(h, 'back', fit)), await face(f, h && !own ? 'hatHair' : frame), acc && (await hatLayer(acc, 'front', 1)), h && (await hatLayer(h, 'front', fit))];
}
const head = async (f: Face, h?: Hat, acc?: Hat, frame: Frame = 'neutral'): Promise<Img | null> => {
  const l = await headLayers(f, h, acc, frame);
  return l && outline(stack(CELL_W, CELL_H, ...l));
};

async function fighter(f: Face, o: Outfit, opts: { hat?: Hat; acc?: Hat; senior?: boolean; frame?: Frame; perLayerOutline?: boolean } = {}): Promise<Img> {
  let body = await bodySprite(o, ramp(`skin.${f.skin}`));
  if (opts.senior && o.senior) body = recolour(body, o.senior);
  const layers = (await headLayers(f, opts.hat, opts.acc, opts.frame))!;
  const img = blank(BODY_W, BODY_H);
  if (opts.perLayerOutline) {
    // What a renderer that outlines every sprite on its own would show.
    over(img, outline(body));
    for (const l of layers) if (l) over(img, outline(l), ...HEAD_AT);
    return img;
  }
  over(img, body);
  for (const l of layers) if (l) over(img, l, ...HEAD_AT);
  return outline(img);
}

const OUT = TESTS;

async function facesSheet(): Promise<void> {
  const S = 3;
  const [cw, ch] = [CELL_W * S, CELL_H * S];
  const items: Placed[] = [];
  const labels: Label[] = [{ text: '1. Faces from parts: 8 faces × the game\'s 8 frames (shown ×3)', x: 10, y: 22, bold: true, size: 16 }];
  FRAMES.forEach((fr, c) => labels.push({ text: fr, x: 170 + c * cw + 60, y: 48, bold: true }));
  for (const [r, f] of FACES.entries()) {
    labels.push({ text: f.id, x: 10, y: 60 + r * ch + 100, bold: true, size: 16 }, { text: f.who, x: 10, y: 60 + r * ch + 118, size: 10 }, { text: `feature: ${f.signature}`, x: 10, y: 60 + r * ch + 132, size: 10, colour: '#ffd27a' });
    for (const [c, fr] of FRAMES.entries()) items.push({ img: outline(await face(f, fr)), x: 170 + c * cw, y: 54 + r * ch, scale: S });
  }
  await sheet(join(OUT, '01-faces.png'), 170 + 8 * cw, 60 + FACES.length * ch, items, labels);
}

/** A 48 × 48 crop of the face cell (the head without the hat headroom), and its 24 px icon. */
const crop48 = (img: Img): Img => over(blank(48, 48), img, -6, -24);

async function sizesSheet(): Promise<void> {
  const items: Placed[] = [];
  const labels: Label[] = [{ text: '2. Do they read at game size? Light and dark arena floors', x: 10, y: 22, bold: true, size: 16 }];
  const W = 1180;
  const rows: [string, number][] = [['48 px, real size (×1)', 1], ['48 px ×2 (menus)', 2], ['24 px chip, automatic (×1)', 0.5], ['24 px chip ×2', -2]];
  let y = 40;
  for (const [text, s] of rows) {
    labels.push({ text, x: 10, y: y + 24 });
    const size = s === 0.5 ? 24 : s === -2 ? 48 : 48 * s;
    for (const [i, f] of FACES.entries()) {
      const full = crop48(await face(f, 'neutral'));
      const img = outline(s === 0.5 || s === -2 ? half(full) : full);
      items.push({ img, x: 200 + i * 118, y, scale: s === 0.5 ? 1 : Math.abs(s) });
    }
    y += size + 22;
  }
  labels.push({ text: 'f01, all 8 frames at ×1', x: 10, y: y + 30 }, { text: 'f02, all 8 frames at ×1', x: 10, y: y + 92 }, { text: 'f05 on a dark floor, ×1', x: 10, y: y + 154 }, { text: 'f04 on a pale floor, ×1', x: 10, y: y + 216 });
  const strips: [string, number][] = [['f01', 0], ['f02', 62], ['f05', 124], ['f04', 186]];
  for (const [id, dy] of strips) for (const [i, fr] of FRAMES.entries()) items.push({ img: outline(crop48(await face(faceOf(id), fr))), x: 200 + i * 62, y: y + dy, scale: 1 });
  const h = y + 260;
  // Floor swatches behind the two last strips.
  const dark: Img = { w: 1, h: 1, px: Buffer.from([28, 30, 40, 255]) };
  const pale: Img = { w: 1, h: 1, px: Buffer.from([226, 220, 204, 255]) };
  items.unshift({ img: dark, x: 196, y: y + 120, scale: 1 }, { img: pale, x: 196, y: y + 182, scale: 1 });
  const bg = (i: Img, yy: number): Placed => ({ img: { w: 500, h: 56, px: Buffer.alloc(500 * 56 * 4, Buffer.from(i.px)) }, x: 196, y: yy, scale: 1 });
  items.splice(0, 2, bg(dark, y + 120), bg(pale, y + 182));
  await sheet(join(OUT, '02-sizes.png'), W, h, items, labels);
}

async function headwearSheet(): Promise<void> {
  const S = 2;
  const [cw, ch] = [CELL_W * S + 4, CELL_H * S];
  const cols: (Hat | undefined)[] = [undefined, ...HATS];
  const items: Placed[] = [];
  const labels: Label[] = [{ text: '3. Any hat on any face: every sprite is drawn once and placed on the same anchor (shown ×2)', x: 10, y: 22, bold: true, size: 16 }];
  cols.forEach((h, c) => labels.push({ text: h ? h.name : 'no headwear', x: 70 + c * cw + 8, y: 46, size: 11, bold: true }, { text: h ? h.type : '', x: 70 + c * cw + 8, y: 60, size: 10, colour: h?.type === 'helmet' ? '#ffd27a' : h?.type === 'face' ? '#9fe0c0' : '#b9c2d6' }));
  for (const [r, f] of FACES.entries()) {
    labels.push({ text: f.id, x: 10, y: 66 + r * ch + 90, bold: true, size: 16 });
    if (ownHeadwear(f)) labels.push({ text: 'own', x: 10, y: 66 + r * ch + 106, size: 10, colour: '#ffd27a' }, { text: 'headwear', x: 10, y: 66 + r * ch + 118, size: 10, colour: '#ffd27a' });
    for (const [c, h] of cols.entries()) {
      const img = h?.type === 'face' ? await head(f, undefined, h) : await head(f, h);
      if (img) items.push({ img, x: 70 + c * cw, y: 62 + r * ch, scale: S });
      else labels.push({ text: 'not offered', x: 70 + c * cw + 30, y: 66 + r * ch + 96, size: 10, colour: '#8791a8' });
    }
  }
  await sheet(join(OUT, '03-headwear.png'), 70 + cols.length * cw, 70 + FACES.length * ch, items, labels);
}

async function outfitsSheet(): Promise<void> {
  const S = 2;
  const cw = BODY_W * S + 6;
  const items: Placed[] = [];
  const labels: Label[] = [{ text: '4. Face + outfit + headwear as three layers; "senior" colours are a palette swap of the same sprite (shown ×2)', x: 10, y: 22, bold: true, size: 16 }];
  type Cell = [string, string, Parameters<typeof fighter>[2], string];
  const rowA: Cell[] = [
    ['f04', 'mannequin', {}, 'body template'],
    ['f01', 'builder', { hat: hat('hard-hat') }, 'builder + hard hat'],
    ['f01', 'builder', { hat: hat('hard-hat'), senior: true }, 'senior builder (swap)'],
    ['f05', 'chef', { hat: hat('toque') }, 'chef + toque'],
    ['f05', 'chef', { hat: hat('toque'), senior: true }, 'senior chef (swap)'],
    ['f02', 'teacher', {}, 'teacher, redesigned'],
    ['f02', 'teacher', { senior: true }, 'senior teacher (swap)'],
  ];
  const rowB: Cell[] = [
    ['f03', 'builder', { hat: hat('hard-hat') }, 'hijab under a hard hat'],
    ['f07', 'chef', {}, 'turban, no toque offered'],
    ['f08', 'dress', {}, 'dress: its own outfit…'],
    ['f04', 'dress', { hat: hat('crown') }, '…that anyone can wear'],
    ['f06', 'teacher', { hat: hat('beanie'), acc: hat('sunglasses') }, 'hat + face accessory'],
    ['f05', 'builder', { frame: 'angry' }, 'angry, no hat'],
    ['f01', 'chef', { hat: hat('astronaut'), frame: 'surprised2' }, 'helmet with a back layer'],
  ];
  for (const [r, row] of [rowA, rowB].entries())
    for (const [c, [fid, oid, opts, text]] of row.entries()) {
      items.push({ img: await fighter(faceOf(fid), outfit(oid), opts), x: 10 + c * cw, y: 40 + r * (BODY_H * S + 34), scale: S });
      labels.push({ text, x: 14 + c * cw, y: 40 + r * (BODY_H * S + 34) + BODY_H * S + 16, size: 12 });
    }
  // Game size, and the outline question.
  const y3 = 40 + 2 * (BODY_H * S + 34);
  labels.push({ text: 'Real size (×1), on light and dark floors:', x: 10, y: y3 + 18, bold: true });
  const all = [...rowA, ...rowB];
  for (const [i, bgc] of ([[226, 220, 204], [28, 30, 40]] as const).entries()) {
    const stripe: Img = { w: 14 * 60 + 10, h: BODY_H + 12, px: Buffer.alloc((14 * 60 + 10) * (BODY_H + 12) * 4, Buffer.from([...bgc, 255])) };
    items.push({ img: stripe, x: 10, y: y3 + 28 + i * (BODY_H + 20), scale: 1 });
    for (const [c, [fid, oid, opts]] of all.entries()) items.push({ img: await fighter(faceOf(fid), outfit(oid), opts), x: 4 + c * 60, y: y3 + 34 + i * (BODY_H + 20), scale: 1 });
  }
  const x4 = 14 * 60 + 60;
  labels.push({ text: 'Outline: one silhouette line (left) vs. every sprite outlined on its own (right), ×2', x: x4, y: y3 + 18, bold: true });
  items.push({ img: await fighter(faceOf('f01'), outfit('builder'), { hat: hat('hard-hat') }), x: x4, y: y3 + 30, scale: 2 }, { img: await fighter(faceOf('f01'), outfit('builder'), { hat: hat('hard-hat'), perLayerOutline: true }), x: x4 + 200, y: y3 + 30, scale: 2 });
  await sheet(join(OUT, '04-outfits.png'), 10 + 7 * cw, y3 + 2 * (BODY_H + 20) + 40, items, labels);
}

/** Today's shipped heads through `normalise`: hand-built palette vs. an automatic one (13 §3.2 "First test"). */
async function normaliseSheet(): Promise<void> {
  const atlasDir = join(ROOT, 'apps/client/src/replay/faces');
  const rects = (JSON.parse(readFileSync(join(atlasDir, 'faces.json'), 'utf8')) as { faces: Record<string, { x: number; y: number; w: number; h: number }> }).faces;
  const atlas = await sharp(join(atlasDir, 'faces.webp')).png().toBuffer();
  const careers = ['builder', 'teacher', 'mechanic', 'fortune-teller', 'chef', 'nurse', 'clown', 'police-officer', 'florist', 'dj'].filter((k) => rects[`career.${k}:neutral`]);
  const crop = (k: string): { left: number; top: number; width: number; height: number } => {
    const r = rects[`career.${k}:neutral`]!;
    return { left: r.x, top: r.y, width: r.w, height: r.h };
  };
  const raw = async (k: string, size: number): Promise<Img> => {
    const { data, info } = await sharp(atlas).extract(crop(k)).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { w: info.width, h: info.height, px: data };
  };
  const originals = await Promise.all(careers.map((k) => raw(k, 64)));
  const auto = autoPalette(await Promise.all(careers.map((k) => raw(k, 48))), 40);
  const items: Placed[] = [];
  const labels: Label[] = [
    { text: "5. normalise on today's heads: 48 px, snapped to a palette, 1 px silhouette line (shown ×2)", x: 10, y: 22, bold: true, size: 16 },
    { text: 'today (64 px)', x: 10, y: 110 },
    { text: `automatic palette`, x: 10, y: 240 },
    { text: `(40 commonest colours)`, x: 10, y: 256, size: 10 },
    { text: 'draft hand palette', x: 10, y: 370 },
    { text: `(${ALL_COLOURS.length} colours, named ramps)`, x: 10, y: 386, size: 10 },
  ];
  for (const [i, k] of careers.entries()) {
    const x = 170 + i * 136;
    labels.push({ text: k, x, y: 46, size: 11, bold: true });
    items.push({ img: originals[i]!, x, y: 54, scale: 2 });
    items.push({ img: outline(await normalise(atlas, 48, auto, crop(k))), x: x + 16, y: 190, scale: 2 });
    items.push({ img: outline(await normalise(atlas, 48, ALL_COLOURS, crop(k))), x: x + 16, y: 320, scale: 2 });
  }
  await sheet(join(OUT, '05-normalise.png'), 170 + careers.length * 136, 440, items, labels);
}

mkdirSync(OUT, { recursive: true });
await facesSheet();
await sizesSheet();
await headwearSheet();
await outfitsSheet();
await normaliseSheet();
console.log(`wardrobe tests → ${OUT}`);
