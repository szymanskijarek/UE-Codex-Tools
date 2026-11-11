/**
 * Wardrobe pixel tests: faces built from parts (13 §2, §3.2).
 *
 * A face is a list of choices (skin ramp, hair, one exaggerated feature…) and
 * a frame is a list of expression settings, so 16 faces × 8 frames is data,
 * not 128 drawings. Cell: 64 × 80 sprite pixels, head about 46 px tall, 3/4
 * view facing right, chin on y = 54 (85 % down a 64 px cell, as the style
 * tile brief asks), 16 px of headroom above for tall hats.
 */
import { BLURS, PAL, ell, lin, line, mix, over, paint, path, ramp, raster, rect, type Img } from './core';

export const CELL_W = 64;
export const CELL_H = 80;
export const CELL_TOP = -16;

export const FRAMES = ['neutral', 'angry', 'surprised', 'hurt', 'hurt2', 'hurt3', 'surprised2', 'hatHair'] as const;
export type Frame = (typeof FRAMES)[number];

export interface Face {
  id: string;
  who: string;
  /** The one feature this face exaggerates (13 §3.2). */
  signature: string;
  skin: string;
  hair: string;
  style: 'short' | 'curly' | 'shaggy' | 'bald' | 'sides' | 'afro' | 'bun' | 'long' | 'hijab' | 'turban';
  beard?: 'stubble' | 'full' | 'tache';
  glasses?: boolean;
  iris: string;
  /** 1 = ordinary; the signature feature goes to about 1.3. */
  nose?: number;
  brow?: number;
  browArch?: number;
  jaw?: number;
  ears?: number;
  eye?: number;
  /** Head shape below the hat line (the skull above it is shared so hats fit): longer face, fuller cheek, pointier (+) or squarer (−) chin. */
  long?: number;
  cheek?: number;
  chin?: number;
  lines?: boolean;
  /** Cloth ramp of the face's own headwear (hijab, turban). */
  cloth?: string;
}

/** Faces whose headwear is part of the face: caps hidden, only helmets go over it (13 §2.1). */
export const ownHeadwear = (f: Face): boolean => f.style === 'hijab' || f.style === 'turban';

export const FACES: Face[] = [
  { id: 'f01', who: 'mid-30s man, curly mop, stubble', signature: 'big hooked nose', skin: 's2', hair: 'dkbrown', style: 'curly', beard: 'stubble', iris: 'irisBrown', nose: 1.35, long: 1 },
  { id: 'f02', who: 'late-50s woman, short grey hair, glasses', signature: 'arched eyebrows', skin: 's5', hair: 'grey', style: 'short', glasses: true, iris: 'irisBrown', brow: 1.15, browArch: 3, lines: true, cheek: 1.5, long: -1 },
  { id: 'f03', who: 'early-20s woman, teal hijab', signature: 'big eyes, round cheeks', skin: 's3', hair: 'black', style: 'hijab', cloth: 'teal', iris: 'irisHazel', eye: 1.3, jaw: 1.25 },
  { id: 'f04', who: '40s man, bald, ginger beard', signature: 'wide jaw', skin: 's1', hair: 'ginger', style: 'bald', beard: 'full', iris: 'irisBlue', jaw: 1.5, chin: -1, long: 1 },
  { id: 'f05', who: '30s woman, afro', signature: 'the hair', skin: 's6', hair: 'black', style: 'afro', iris: 'irisBrown', chin: 1.2 },
  { id: 'f06', who: '20s man, shaggy blond hair', signature: 'big ears', skin: 's1', hair: 'blond', style: 'shaggy', iris: 'irisGreen', ears: 1.6, long: 2.5, chin: 1 },
  { id: 'f07', who: '60s man, purple turban, grey beard', signature: 'heavy brows', skin: 's4', hair: 'grey', style: 'turban', cloth: 'purple', beard: 'full', iris: 'irisBrown', brow: 1.6, cheek: 1 },
  { id: 'f08', who: '40s woman, long brown hair', signature: 'long nose', skin: 's3', hair: 'brown', style: 'long', iris: 'irisGreen', nose: 1.25, long: 1.5, chin: 1.5 },
];

interface Expr {
  browY: number;
  browTilt: number;
  near: 'open' | 'narrow' | 'wide' | 'pop' | 'shut' | 'spiral';
  far: 'open' | 'narrow' | 'wide' | 'pop' | 'shut' | 'spiral';
  mouth: 'smile' | 'snarl' | 'o' | 'clench' | 'tongue' | 'wobble' | 'drop';
  tilt?: number;
  crooked?: number;
  drop?: number;
  extras?: ('vein' | 'flush' | 'puff' | 'bump' | 'stars' | 'sweat' | 'jump' | 'cross')[];
}
const EXPR: Record<Frame, Expr> = {
  neutral: { browY: 0, browTilt: 0, near: 'open', far: 'open', mouth: 'smile' },
  angry: { browY: 1.5, browTilt: 2.2, near: 'narrow', far: 'narrow', mouth: 'snarl', extras: ['vein', 'flush'] },
  surprised: { browY: -3, browTilt: 0, near: 'wide', far: 'wide', mouth: 'o' },
  hurt: { browY: 0.5, browTilt: -1.6, near: 'shut', far: 'shut', mouth: 'clench', tilt: -7, crooked: 12 },
  hurt2: { browY: -1, browTilt: -1, near: 'pop', far: 'shut', mouth: 'tongue', extras: ['puff', 'cross'] },
  hurt3: { browY: -1, browTilt: -1.6, near: 'spiral', far: 'spiral', mouth: 'wobble', crooked: 26, extras: ['bump', 'stars'] },
  surprised2: { browY: -5, browTilt: -0.6, near: 'pop', far: 'pop', mouth: 'drop', drop: 3, extras: ['jump', 'sweat'] },
  hatHair: { browY: 0, browTilt: 0, near: 'open', far: 'open', mouth: 'smile' },
};

const M = PAL.misc as Record<string, string>;
const blur = (svg: string, f: 'b05' | 'b1' | 'b2', opacity = 1): string => `<g filter="url(#${f})" opacity="${opacity}">${svg}</g>`;

/**
 * One face in one frame, in cell coordinates, as two layers: `paint` is the
 * soft painting (form light and shadow, hair, cloth) that gets averaged down
 * and snapped to the ramps; `detail` is the crisp layer on top (eyes, brows,
 * mouth, glasses), where single pixels must survive.
 */
export function faceSvg(f: Face, frame: Frame): { paint: string; detail: string } {
  const x = EXPR[frame];
  const has = (e: NonNullable<Expr['extras']>[number]): boolean => !!x.extras?.includes(e);
  const sk = ramp(`skin.${f.skin}`);
  const hr = ramp(`hair.${f.hair}`);
  const cl = f.cloth ? ramp(`cloth.${f.cloth}`) : [];
  const [deep, shade, mid, light, hi] = sk as [string, string, string, string, string];
  const [hd, hm, hl, hh] = hr as [string, string, string, string];
  const d = (x.drop ?? 0) + (f.long ?? 0);
  const ck = f.cheek ?? 0;
  const ch = f.chin ?? 0;
  const j = ((f.jaw ?? 1) - 1) * 4;
  const head = `M13,30 C13,15 22,9 31,9 C40,9 46,15 46.5,25 L46.5,34 C${46.5 + ck},${42 + d} ${45 + ck},${47 + d} 42,${51 + d} C40,${54 + d + ch * 0.5} ${35 + ch * 2},${54.5 + d + ch} 31,${53 + d} C${25 - j},${51 + d + j * 0.5} ${19 - j},${47 + j * 0.5} 16,41 C14,37 13,34 13,30 Z`;
  const own = ownHeadwear(f);
  const P: string[] = [];
  const D: string[] = [];
  const lash = mix(deep, PAL.ink, 0.55);
  const lip = mix(mid, M.flush!, 0.42);
  const blush = mix(mid, M.flush!, has('flush') ? 0.6 : 0.28);

  P.push(`<defs>${BLURS}`);
  P.push(`<clipPath id="hat"><rect x="10.5" y="21.5" width="39" height="70"/><ellipse cx="30" cy="27.5" rx="18.2" ry="19.7"/></clipPath>`);
  P.push(`<clipPath id="hd"><path d="${head}"/></clipPath><clipPath id="rr"><rect x="43.5" y="14" width="10" height="${34 + d}"/></clipPath><clipPath id="low"><rect x="0" y="43" width="64" height="30"/></clipPath>`);
  P.push(lin('gh', 14, 6, 44, 34, [[0, hh], [0.22, hl], [0.55, hm], [1, hd]]));
  P.push(lin('gn', 0, 48, 0, 60, [[0, deep], [0.45, deep], [1, shade]]));
  if (cl.length) P.push(lin('gc', 12, 4, 46, 58, [[0, cl[2]!], [0.3, cl[1]!], [0.7, cl[1]!], [1, cl[0]!]]));
  P.push(`</defs>`);

  // ── hair behind the head ──
  const back: string[] = [];
  const HG = 'url(#gh)';
  if (f.style === 'afro') back.push(ell(29, 21, 22, 21, HG), blur(ell(40, 30, 10, 12, hd), 'b2', 0.8));
  if (f.style === 'bun') back.push(ell(11, 13, 6.5, 6.5, hm), blur(ell(9.5, 11, 2.6, 2.4, hl), 'b05'), line('M7,15 C9,18 13,19 16,17', hd, 1));
  if (f.style === 'long') back.push(path('M9,28 C8,12 20,5 31,5 C40,5 47,10 48,20 L30,30 L27,62 L9,62 C6,50 8,38 9,28 Z', HG), blur(path('M20,34 L28,34 L26,62 L18,62 Z', hd), 'b1'), line('M11,36 C10,46 11,54 13,61 M15,40 C14,49 15,56 17,62 M22,42 C21,50 21,57 22,62', hd, 0.9), line('M10,30 C9,40 10,50 11,58', hl, 1));

  // ── hair in front ──
  const front: string[] = [];
  const cap = 'M12.5,32 C11,14 21,6.5 31,6.5 C41,6.5 48,12 47.5,22 L45.5,23 C44,18.5 39,16.5 33,17 C27,17.5 22,20 21,26 L20,33 L17.5,30 C16,30 14,31 12.5,32 Z';
  const sides = 'M12.5,33 C12,27 13.5,22 17,19 L20.5,21 C19.5,25 19.5,29 20,33 L17.5,30 C15.5,30.5 14,32 13.5,37 Z';
  const strands = (ds: string[], c: string, w = 0.9): string => ds.map((s) => line(s, c, w, 'round')).join('');
  switch (f.style) {
    case 'short':
      front.push(path(cap, HG), strands(['M21,26 C22,20 27,17.5 33,17', 'M33,17 C39,16.5 44,18.5 45.5,23', 'M24,20 C26,14 30,11 35,10', 'M17,24 C17,17 21,12 26,10', 'M38,16 C40,12 43,12 46,16'], hd), strands(['M18,14 C23,9.5 30,8 37,9.5', 'M14.5,24 C14.5,19 16.5,15.5 19,13'], hh, 1.2));
      break;
    case 'bun':
      front.push(path(cap, HG), strands(['M21,26 C22,20 27,17.5 33,17', 'M33,17 C39,16.5 44,18.5 45.5,23', 'M30,7 C26,12 21,15 15,17', 'M36,8 C32,13 26,17 20,19'], hd), strands(['M33,7 C29,11 24,14 17,16'], hh, 1.3));
      break;
    case 'curly': {
      const blobs: [number, number, number][] = [[15, 25, 5.5], [17, 17, 6.5], [23, 11, 6.5], [31, 8, 6.5], [39, 10, 6.5], [45, 15, 5.5], [47, 21, 3.5], [14.5, 31, 3.5], [25, 18, 4.5], [33, 16.5, 4.5], [40, 18, 4]];
      front.push(...blobs.map(([cx, cy, r]) => ell(cx, cy, r, r, hm)));
      // Each curl is a little ball: light on its top left, dark underneath.
      front.push(...blobs.map(([cx, cy, r]) => blur(ell(cx + r * 0.35, cy + r * 0.45, r * 0.6, r * 0.5, hd), 'b1', 0.9) + blur(ell(cx - r * 0.35, cy - r * 0.4, r * 0.45, r * 0.38, hl), 'b05')));
      front.push(...([[21, 8.5, 1.6], [29.5, 5, 1.6], [15, 15.5, 1.4]] as const).map(([cx, cy, r]) => ell(cx, cy, r, r * 0.8, hh)));
      front.push(strands(['M22,16 a3,3 0 1,0 5,2', 'M30,13 a3,3 0 1,0 5,2', 'M38,14 a2.6,2.6 0 1,0 4.4,2', 'M16,22 a2.6,2.6 0 1,0 4.4,2', 'M26,9 a2.4,2.4 0 1,0 4,1.6', 'M36,6.5 a2.4,2.4 0 1,0 4,1.6'], hd, 0.8));
      break;
    }
    case 'shaggy':
      front.push(path('M11,40 L12,24 C12,12 21,5.5 31,5.5 C42,5.5 49,12 48,23 L46.5,25 L45,20 L43,25 L40,19 L37,24.5 L33,18.5 L29,25 L25,19.5 L22,27 L20.5,36 L18,31 L16.5,42 L14,37 Z', HG));
      front.push(strands(['M22,27 L25,19.5 L29,25 L33,18.5 L37,24.5 L40,19 L43,25', 'M27,8 C25,12 24,16 25,19.5', 'M35,7 C34,11 33,15 33,18.5', 'M42,10 C41,13 40,16 40,19', 'M19,11 C16,16 15,24 16,32', 'M14,24 L13.5,36'], hd), strands(['M18,14 C23,9 30,7.5 38,9', 'M15,20 L14,31', 'M30,9 L28,16'], hh, 1.2));
      break;
    case 'afro':
      front.push(path('M11,30 C9,10 22,2 31,2 C43,2 51,10 49,24 L46,23.5 C44,19 39,17 33,17.5 C27,18 22,20.5 21,26 L20,32 L17,29.5 Z', HG));
      front.push(...([[18, 8, 3], [28, 4, 3], [12, 18, 2.5], [38, 5.5, 2.2], [22, 13, 2], [9, 26, 2]] as const).map(([cx, cy, r]) => blur(ell(cx, cy, r, r * 0.8, hh), 'b05', 0.9)));
      front.push(blur(line('M45,23 C43,19 38,17.5 33,18 C27,18.5 22.5,21 21.5,26', hd, 1.6), 'b05'));
      break;
    case 'long':
      front.push(path('M12,34 C10,14 21,6 31,6 C41,6 48,12 47.5,22 L46,23 C42,17 36,15.5 30,18 C25,20 22,25 21.5,31 L20,38 L17,31 C15,31 13,32 12,34 Z', HG));
      front.push(strands(['M46,23 C42,17 36,15.5 30,18 C25,20 22,25 21.5,31', 'M40,10 C34,10 27,14 23,22', 'M33,7.5 C27,9 21,14 18,24'], hd), strands(['M18,14 C23,9 30,7.5 38,9.5', 'M15,20 C14,25 14,29 15,32'], hh, 1.3));
      break;
    case 'sides':
    case 'turban':
      front.push(path(sides, HG));
      break;
    default:
  }
  const clip = frame === 'hatHair' && !own ? ' clip-path="url(#hat)"' : '';
  const jump = has('jump') && !own ? ' transform="translate(0,-2.5)"' : '';
  P.push(`<g${clip}${jump}>${back.join('')}</g>`);

  // ── neck and ear ──
  P.push(rect(24, 47, 12, 13, 'url(#gn)'), rect(24, 47, 3, 13, shade));
  const e = f.ears ?? 1;
  const ex = 16.5 - (e - 1) * 2;
  P.push(ell(ex, 33.5, 3 * e, 4.5 * e, mid), ell(ex - 0.8 * e, 32.5, 1.2 * e, 3 * e, light), ell(ex + 0.5, 34, 1.4 * e, 2.5 * e, shade), ell(ex + 0.8, 34.4, 0.7 * e, 1.3 * e, deep));

  // ── the head, painted: mid tone, soft shadow side, lights, sockets ──
  P.push(path(head, mid));
  P.push(`<g clip-path="url(#hd)">`);
  P.push(path(head, shade), blur(path(head, mid, 'transform="translate(-3.2,-3.6)"'), 'b2'));
  P.push(`<g clip-path="url(#low)">${blur(line(head, deep, 3), 'b1', 0.9)}</g>`);
  P.push(blur(ell(26, 18.5, 10, 6, light), 'b2'), blur(ell(23.5, 15.5, 4.5, 2.2, hi), 'b1'));
  P.push(blur(ell(33.5, 30.6, 5.6, 3.4, shade), 'b1', 0.85), blur(ell(43.4, 30.6, 3.4, 3.2, shade), 'b1', 0.85));
  P.push(blur(ell(33.5, 38.2, 5.2, 2.6, light), 'b1'), blur(ell(31, 36.8, 2.2, 1, hi), 'b05', 0.9));
  P.push(blur(ell(35, 41, has('flush') ? 5.5 : 3.6, has('flush') ? 3.4 : 2, blush), 'b1', 0.9));
  P.push(blur(ell(41.5, 43.4, 3.4, 1.3, shade), 'b05'), blur(ell(39, 50.2 + d, 3, 1.1, shade), 'b05'), blur(ell(37.5, 52 + d, 2.4, 1, light), 'b05', 0.8));
  if (['short', 'bun', 'curly', 'shaggy', 'afro', 'long'].includes(f.style)) P.push(blur(line('M20,29 C21,23 27,20 33,19.5 C39,19 44.5,21 46,26', shade, 2.8), 'b1', 0.9));
  if (frame === 'hatHair' && !own) P.push(blur(rect(12, 20, 36, 5.5, shade), 'b1'), blur(rect(12, 20, 36, 3, deep), 'b1', 0.7));
  if (f.lines) P.push(blur(ell(33.5, 35, 4, 1.2, shade), 'b05'), blur(ell(43.2, 35, 2.6, 1.1, shade), 'b05'), blur(line('M35.5,40 Q33.8,44 34.8,48', shade, 1.2), 'b05'));
  if (has('flush')) P.push(blur(ell(28, 19, 9, 4, blush), 'b2', 0.6));
  if (has('puff')) P.push(blur(ell(35, 42, 6, 5, light), 'b1'), ell(33.5, 40, 2, 1.4, hi));
  P.push(`<g clip-path="url(#rr)">${line(head, mix(light, M.rim!, 0.5), 2.2)}</g>`);
  P.push(`</g>`);
  if (has('puff')) P.push(ell(45.5, 43, 2.8, 3.6, mid), ell(46.6, 44, 1.4, 2.2, shade));

  // ── nose: lit bridge, shaded underside ──
  const n = f.nose ?? 1;
  const nx = 45 + (n - 1) * 6;
  const ny = 37.5 + (n - 1) * 3;
  const hook = (n - 1) * 5;
  P.push(path(`M41.5,29.5 Q${43.5 + hook},${31 + hook * 0.3} ${nx + 1},${ny - 1} Q${nx + 2.8},${ny + 1.6} ${nx},${ny + 2.8} L40.5,${ny + 3.2} Z`, has('flush') ? blush : mid));
  P.push(blur(line(`M41.8,30.5 Q${43.2 + hook},${32 + hook * 0.3} ${nx},${ny - 0.5}`, light, 1.6, 'round'), 'b05'), rect(Math.round(nx - 0.5), Math.round(ny - 1), 1.2, 1.2, hi));
  P.push(path(`M40.5,${ny + 3.2} L${nx},${ny + 2.8} Q${nx + 2.4},${ny + 1.9} ${nx + 2.1},${ny + 0.6} L${nx - 1.8},${ny + 1.3} Q${nx - 3.5},${ny + 1.2} ${nx - 4.4},${ny + 2.2} Z`, shade));
  D.push(rect(Math.round(nx - 2), Math.round(ny + 1.6), 1.8, 1, deep), line(`M${nx - 4.6},${ny + 0.2} q-1,1.6 0.4,2.8`, shade, 0.9, 'round'));

  // ── beard ──
  const beard = `M16,35 C16,44 20,${52 + d} 30,${56 + d} C36,${57.5 + d} 42,${55 + d} 44.5,${48 + d} L46,40 L44,40 C42,42 40,42.5 38,42.5 C34,42.5 31,43 29,45 C25,44 21,40 20,34 Z`;
  if (f.beard === 'full') {
    P.push(`<defs>${lin('gb', 18, 36, 40, 58, [[0, hl], [0.35, hm], [1, hd]])}</defs>`);
    P.push(blur(path(beard, hm), 'b05'), path(beard, 'url(#gb)'), blur(line(`M20,${50 + d} C25,${55.5 + d} 34,${57.5 + d} 42,${53.5 + d}`, hd, 1.8), 'b05'));
    P.push(strands(['M21,37 C22,41 25,44 28,45.5', 'M19,40 C20,46 24,51 29,54', 'M34,43.5 C37,43 41,43 44,42'], hh, 0.9), strands([`M26,47 C27,${51 + d} 30,${54 + d} 33,${55.5 + d}`, `M36,${50 + d} C37,${53 + d} 39,${54.5 + d} 41,${54 + d}`], hd, 0.9));
  }
  if (f.beard === 'stubble') P.push(`<g clip-path="url(#hd)">${blur(path(beard, mix(shade, hd, 0.45)), 'b1', 0.95)}</g>`);
  if (f.beard === 'tache') P.push(path('M33,43 C36,41 41,41 45,42.5 C46,44 45,45.5 43,45 C40,44.5 37,45 34,46 C32.5,45.5 32.5,44 33,43 Z', 'url(#gh)'));

  // ── eyes (crisp) ──
  const es = f.eye ?? 1;
  const eye = (cx: number, cy: number, rx: number, mode: Expr['near'], near: boolean): string => {
    const base = 3 * es;
    if (mode === 'shut') {
      const s = near ? 1 : -1;
      return line(`M${cx - 2.8 * s},${cy - 2.2} L${cx + 2.6 * s},${cy} L${cx - 2.8 * s},${cy + 2.2}`, lash, 1.3, 'round');
    }
    if (mode === 'spiral') return ell(cx, cy, rx + 0.3, base + 0.6, M.eyeWhite!) + `<circle cx="${cx}" cy="${cy}" r="${Math.min(rx, base) - 0.7}" fill="none" stroke="${PAL.ink}" stroke-width="0.9"/>` + rect(cx - 0.5, cy - 0.5, 1, 1, PAL.ink);
    const ry = base * (mode === 'narrow' ? 0.6 : mode === 'wide' ? 1.3 : mode === 'pop' ? 1.6 : 1);
    const wx = rx * (mode === 'pop' ? 1.2 : mode === 'wide' ? 1.08 : 1);
    const ir = mode === 'pop' ? 1.2 : Math.min(near ? 2.1 : 1.8, ry + 0.4);
    const look = has('cross') ? (near ? 1.8 : -1) : near ? 0.9 : 0.5;
    const ix = Math.round(cx + look) + 0.5;
    const iy = Math.round(cy + (mode === 'narrow' ? 0.3 : 0)) + 0.5;
    const white = `M${cx - wx},${cy + 0.3} Q${cx - wx * 0.3},${cy - ry * 1.25} ${cx + wx},${cy - 0.2} Q${cx + wx * 0.2},${cy + ry * 1.2} ${cx - wx},${cy + 0.3} Z`;
    const id = near ? 'en' : 'ef';
    const parts = [`<clipPath id="${id}"><path d="${white}"/></clipPath>`, path(white, M.eyeWhite!)];
    parts.push(`<g clip-path="url(#${id})">` + ell(ix, iy, ir, ir, M[f.iris]!) + ell(ix, iy, ir * 0.5, ir * 0.5, PAL.ink) + `</g>`);
    if (mode !== 'pop') parts.push(rect(ix - 1.5, iy - 1.5, 1, 1, M.eyeWhite!));
    // Upper lid: a dark lash line; lower lid: a soft one.
    parts.push(line(`M${cx - wx - 0.4},${cy + 0.2} Q${cx - wx * 0.3},${cy - ry * 1.3} ${cx + wx + 0.3},${cy - 0.4}`, lash, mode === 'narrow' ? 1.5 : 1.1, 'round'));
    if (mode === 'open' || mode === 'narrow') parts.push(line(`M${cx - wx + 0.6},${cy + ry * 0.75} Q${cx},${cy + ry * 1.25} ${cx + wx - 0.4},${cy + ry * 0.55}`, shade, 0.8));
    if (mode === 'open') parts.push(line(`M${cx - wx},${cy - ry - 1} Q${cx},${cy - ry - 2.3} ${cx + wx},${cy - ry - 1.3}`, shade, 0.8));
    return parts.join('');
  };
  D.push(eye(32.8, 31.3, 3.9 * Math.min(es, 1.15), x.near, true), eye(43.2, 31.3, 2.7 * Math.min(es, 1.15), x.far, false));

  // ── mouth (crisp) ──
  const my = d * 0.4;
  const mouthParts: Record<Expr['mouth'], string> = {
    smile: path('M35,46.6 Q39,48.8 43,46.2 Q41.5,49.4 38.6,49.2 Q36,49 35,46.6 Z', lip) + rect(38, 48, 1.4, 0.9, mix(lip, hi, 0.5)) + line('M33.6,45.6 Q38.8,48.6 44,44.9', lash, 1.1, 'round') + rect(44, 43.6, 1, 1.2, shade) + rect(33, 44.8, 1, 1, shade),
    snarl: path('M33,44 L45,43 L44.4,49.2 L34.2,50.2 Z', lash) + path('M33.8,44.5 L44.5,43.6 L44.2,49 L34.6,49.8 Z', M.mouth!) + path('M34.4,44.8 L44.2,43.9 L44,45.8 L34.7,46.7 Z', M.teeth!) + path('M35.1,48.2 L43.7,47.4 L43.7,48.7 L35.2,49.5 Z', M.teeth!) + line('M37,44.6 L37,46.4 M39.5,44.4 L39.5,46.2 M42,44.2 L42,46', shade, 0.6),
    o: ell(39.5, 47.2, 3, 3.7, lip) + ell(39.5, 47.2, 2.2, 2.9, M.mouth!) + ell(39.5, 49, 1.3, 0.9, M.tongue!),
    clench: `<rect x="33.8" y="44.2" width="10.4" height="4" rx="1.2" fill="${M.teeth}" stroke="${lash}" stroke-width="1"/>` + line('M36.5,44.5 L36.5,48 M39,44.5 L39,48 M41.5,44.5 L41.5,48', shade, 0.7) + line('M34,46.2 L44,46.2', shade, 0.6),
    tongue: path('M33.6,44.2 Q39,42.8 44.4,44.2 Q43.4,50 39,50 Q34.6,50 33.6,44.2 Z', lash) + path('M34.4,44.8 Q39,43.6 43.6,44.8 Q42.8,49.3 39,49.3 Q35.2,49.3 34.4,44.8 Z', M.mouth!) + rect(35.5, 44.6, 7, 1.2, M.teeth!) + path('M38,46.2 L43.2,46.2 L45.6,52 Q43.6,55.2 41,53.2 Z', M.tongue!) + line('M41,47.2 L42.8,51.8', M.mouth!, 0.6) + rect(43.4, 52.2, 1, 1, '#ffffff'),
    wobble: line('M33.5,46.5 L35.5,45 L37.5,47.6 L39.5,45 L41.5,47.6 L43.5,45.5', lash, 1.2, 'round'),
    drop: ell(39.5, 49.8, 4.3, 6.5, lip) + ell(39.5, 49.8, 3.6, 5.8, M.mouth!) + rect(37, 44.6, 5, 1.5, M.teeth!) + ell(39.5, 53.6, 2.4, 1.8, M.tongue!) + rect(38.6, 52.8, 1, 0.8, '#ffffff'),
  };
  D.push(`<g transform="translate(0,${my})">${mouthParts[x.mouth]}</g>`);
  if (f.lines) D.push(line('M36,40.5 Q34.3,44 35.2,47.5', shade, 0.9), line('M24,22 Q30,20.6 37,22.2 M25,24.6 Q30,23.6 36,24.8', shade, 0.8));

  // ── hair, own headwear ──
  P.push(`<g${clip}${jump}>${front.join('')}</g>`);
  if (f.style === 'hijab') {
    const open = `M24,22 C27,17 35,15.5 41,17 C45,18 47.5,22 47.5,27 L47.5,35 C47.5,${43 + d} 45.5,${48 + d} 42.5,${51.5 + d} C40,${54.5 + d} 34,${55 + d} 30,${53 + d} C25,${50 + d} 22,44 22,36 C22,30 22.5,25 24,22 Z`;
    P.push(`<path fill-rule="evenodd" fill="url(#gc)" d="M9,36 C6,12 20,3.5 31,3.5 C44,3.5 50.5,12 49.5,26 C49.5,36 48,44 45,52 C43,58 38,62 31,62 L12,62 C8,54 8,44 9,36 Z ${open}"/>`);
    P.push(blur(line(open, cl[0]!, 1.6), 'b05'), blur(line('M12,40 C14,50 20,57 29,60.5 M17,42 C19,50 24,55.5 33,59 M22,50 C25,54 29,56.5 35,57', cl[0]!, 1.3), 'b05'), blur(line('M15,15 C20,8.5 28,6 36,7', cl[2]!, 2.2, 'round'), 'b05'), blur(line('M11.5,24 C11.5,29 12,33 13,36 M15,44 C17,50 20,54 24,57', cl[2]!, 1.4, 'round'), 'b05'));
  }
  if (f.style === 'turban') {
    P.push(path('M11,24 C9,8 20,-1 31,-1 C43,-1 51,7 49,21 L47,23 C40,18 28,17 19,23 L16,27 Z', 'url(#gc)'));
    P.push(blur(line('M14,20 C22,10 34,6 47,12 M12,14 C20,4 34,1 46,6 M19,23 C26,13 36,10.5 48,17', cl[0]!, 1.2), 'b05'), blur(line('M16,9 C21,3 28,1 34,1.6 M15,17 C22,8.5 32,5 42,7.5 M21,20 C27,13 35,11 44,13.5', cl[2]!, 1.3, 'round'), 'b05'), ell(33, 6, 2, 2.4, M.rim!), rect(32.2, 4.4, 1, 1, '#ffffff'));
  }

  // ── brows (crisp, tapered: thick towards the nose) ──
  const th = 2.1 * (f.brow ?? 1);
  const by = 25.8 + x.browY - (es - 1) * 2;
  const arch = (f.browArch ?? 0.9) + (x.browY < -2 ? 1.2 : 0);
  const [yo, yi] = [by - x.browTilt, by + x.browTilt];
  const browCol = f.hair === 'grey' ? hd : f.hair === 'blond' ? hd : mix(hd, PAL.ink, 0.25);
  const ym = (yo + yi) / 2 - arch;
  D.push(path(`M28,${yo + 0.4} Q32.5,${ym - th * 0.5} 37,${yi - th * 0.5} L37,${yi + th * 0.55} Q32.5,${ym + th * 0.4} 28,${yo + 1} Z`, browCol));
  D.push(path(`M40,${yi - th * 0.45} Q43,${ym - th * 0.4} 46,${yo + 0.2} L46,${yo + 0.9} Q43,${ym + th * 0.35} 40,${yi + th * 0.5} Z`, browCol));

  // ── glasses ──
  if (f.glasses) {
    const g = x.crooked ?? 0;
    const hang = g > 20 ? ' translate(-1,5)' : '';
    D.push(`<g transform="rotate(${g} 22 31)${hang}">` + `<rect x="27.8" y="27.4" width="9.4" height="7.8" rx="2.4" fill="none" stroke="${PAL.ink}" stroke-width="1"/><rect x="39.6" y="27.4" width="7" height="7.8" rx="2.2" fill="none" stroke="${PAL.ink}" stroke-width="1"/>` + line('M37.2,30 L39.6,30 M27.8,30 L18,31.4', PAL.ink, 1) + line('M29.4,33.6 L31,31.8', ramp('cloth.glass')[2]!, 0.8) + `</g>`);
  }

  // ── extras ──
  if (has('vein')) D.push(line('M21.5,21 L23,22.6 L21.5,24.2 M25.2,20.6 L23.8,22.6 L25.4,24.4', M.flush!, 1));
  if (has('bump')) D.push(ell(36.5, 10.5, 4, 4.6, mix(mid, M.flush!, 0.6)), ell(37.6, 11.8, 2.4, 2.6, mix(shade, M.flush!, 0.6)), ell(35.4, 9, 1.3, 1.3, hi));
  if (has('stars')) {
    const y = ramp('cloth.yellow');
    const star = (cx: number, cy: number, r: number): string => path(`M${cx},${cy - r} L${cx + r * 0.3},${cy - r * 0.3} L${cx + r},${cy} L${cx + r * 0.3},${cy + r * 0.3} L${cx},${cy + r} L${cx - r * 0.3},${cy + r * 0.3} L${cx - r},${cy} L${cx - r * 0.3},${cy - r * 0.3} Z`, y[1]!) + rect(cx - 0.5, cy - 0.5, 1, 1, y[2]!);
    D.push(star(12, -3, 4.5), star(31, -10, 5), star(51, -2, 4.5));
  }
  if (has('sweat')) D.push(path('M54,14 Q57.4,19.5 54,22 Q50.6,19.5 54,14 Z', ramp('cloth.glass')[1]!), rect(53, 18, 1, 1, ramp('cloth.glass')[2]!));
  const wrap = (s: string): string => (x.tilt ? `<g transform="rotate(${x.tilt} 34 54)">${s}</g>` : s);
  // A tilted head keeps its neck upright, so the tilt never shows a cut edge.
  return { paint: wrap(P.join('')), detail: wrap(D.join('')) };
}

/** `rot` turns the whole head about the chin (degrees), for posed fighters. */
export async function faceSprite(f: Face, frame: Frame, rot = 0): Promise<Img> {
  const raw = faceSvg(f, frame);
  const turn = (t: string): string => (rot ? `<g transform="rotate(${rot} 30 54)">${t}</g>` : t);
  const svg = { paint: turn(raw.paint), detail: turn(raw.detail) };
  const seed = Number(f.id.slice(1));
  const base = await paint(svg.paint, CELL_W, CELL_H, 0, CELL_TOP, { texture: [`hair.${f.hair}`], seed, dither: 0.02 });
  return over(base, await raster(svg.detail, CELL_W, CELL_H, 0, CELL_TOP));
}
