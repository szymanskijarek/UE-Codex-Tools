/**
 * Wardrobe pixel tests: faces built from parts (13 §2, §3.2).
 *
 * A face is a list of choices (skin ramp, hair, one exaggerated feature…) and
 * a frame is a list of expression settings, so 16 faces × 8 frames is data,
 * not 128 drawings. Cell: 64 × 80 sprite pixels, head about 46 px tall, 3/4
 * view facing right, chin on y = 54 (85 % down a 64 px cell, as the style
 * tile brief asks), 16 px of headroom above for tall hats.
 */
import { PAL, ell, line, mix, path, ramp, raster, rect, type Img } from './core';

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
  lines?: boolean;
  /** Cloth ramp of the face's own headwear (hijab, turban). */
  cloth?: string;
}

/** Faces whose headwear is part of the face: caps hidden, only helmets go over it (13 §2.1). */
export const ownHeadwear = (f: Face): boolean => f.style === 'hijab' || f.style === 'turban';

export const FACES: Face[] = [
  { id: 'f01', who: 'mid-30s man, curly mop, stubble', signature: 'big hooked nose', skin: 's2', hair: 'dkbrown', style: 'curly', beard: 'stubble', iris: 'irisBrown', nose: 1.35 },
  { id: 'f02', who: 'late-50s woman, short grey hair, glasses', signature: 'arched eyebrows', skin: 's5', hair: 'grey', style: 'short', glasses: true, iris: 'irisBrown', brow: 1.15, browArch: 3, lines: true },
  { id: 'f03', who: 'early-20s woman, teal hijab', signature: 'big eyes, round cheeks', skin: 's3', hair: 'black', style: 'hijab', cloth: 'teal', iris: 'irisHazel', eye: 1.3, jaw: 1.25 },
  { id: 'f04', who: '40s man, bald, ginger beard', signature: 'wide jaw', skin: 's1', hair: 'ginger', style: 'bald', beard: 'full', iris: 'irisBlue', jaw: 1.5 },
  { id: 'f05', who: '30s woman, afro', signature: 'the hair', skin: 's6', hair: 'black', style: 'afro', iris: 'irisBrown' },
  { id: 'f06', who: '20s man, shaggy blond hair', signature: 'big ears', skin: 's1', hair: 'blond', style: 'shaggy', iris: 'irisGreen', ears: 1.6 },
  { id: 'f07', who: '60s man, purple turban, grey beard', signature: 'heavy brows', skin: 's4', hair: 'grey', style: 'turban', cloth: 'purple', beard: 'full', iris: 'irisBrown', brow: 1.6 },
  { id: 'f08', who: '40s woman, long brown hair', signature: 'long nose', skin: 's3', hair: 'brown', style: 'long', iris: 'irisGreen', nose: 1.25 },
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

/** One face in one frame, as SVG in cell coordinates. `hairOff` leaves the hair out (for the hairline test). */
export function faceSvg(f: Face, frame: Frame): string {
  const x = EXPR[frame];
  const has = (e: NonNullable<Expr['extras']>[number]): boolean => !!x.extras?.includes(e);
  const sk = ramp(`skin.${f.skin}`);
  const hr = ramp(`hair.${f.hair}`);
  const cl = f.cloth ? ramp(`cloth.${f.cloth}`) : [];
  const [deep, shade, mid, light, hi] = sk as [string, string, string, string, string];
  const [hd, hm, hl] = hr as [string, string, string];
  const d = x.drop ?? 0;
  const j = ((f.jaw ?? 1) - 1) * 4;
  const head = `M13,30 C13,15 22,9 31,9 C40,9 46,15 46.5,25 L46.5,34 C46.5,${42 + d} 45,${47 + d} 42,${51 + d} C40,${54 + d} 35,${54.5 + d} 31,${53 + d} C${25 - j},${51 + d + j * 0.5} ${19 - j},${47 + j * 0.5} 16,41 C14,37 13,34 13,30 Z`;
  const out: string[] = [];
  const own = ownHeadwear(f);

  // ── hair behind the head ──
  const back: string[] = [];
  if (f.style === 'afro') back.push(ell(29, 21, 22, 21, hm));
  if (f.style === 'bun') back.push(ell(11, 13, 6.5, 6.5, hm), ell(9.5, 11, 2.2, 2.2, hl));
  if (f.style === 'long') back.push(path('M9,28 C8,12 20,5 31,5 C40,5 47,10 48,20 L30,30 L27,62 L9,62 C6,50 8,38 9,28 Z', hm), line('M12,40 C11,48 12,56 14,61 M18,44 C17,52 18,58 20,62', hd, 1.2));

  // ── hair in front ──
  const front: string[] = [];
  const cap = 'M12.5,32 C11,14 21,6.5 31,6.5 C41,6.5 48,12 47.5,22 L45.5,23 C44,18.5 39,16.5 33,17 C27,17.5 22,20 21,26 L20,33 L17.5,30 C16,30 14,31 12.5,32 Z';
  const sides = 'M12.5,33 C12,27 13.5,22 17,19 L20.5,21 C19.5,25 19.5,29 20,33 L17.5,30 C15.5,30.5 14,32 13.5,37 Z';
  switch (f.style) {
    case 'short':
      front.push(path(cap, hm), line('M45.5,23 C44,18.5 39,16.5 33,17 C27,17.5 22,20 21,26', hd, 1), line('M19,13 C24,9 30,8 37,9.5', hl, 1.6, 'round'));
      break;
    case 'bun':
      front.push(path(cap, hm), line('M45.5,23 C44,18.5 39,16.5 33,17 C27,17.5 22,20 21,26', hd, 1), line('M33,7 C30,11 25,14 18,16', hl, 1.4, 'round'));
      break;
    case 'curly': {
      const blobs: [number, number, number][] = [[15, 25, 5.5], [17, 17, 6.5], [23, 11, 6.5], [31, 8, 6.5], [39, 10, 6.5], [45, 15, 5.5], [47, 21, 3.5], [25, 18, 4.5], [33, 16.5, 4.5], [40, 18, 4], [14.5, 31, 3.5]];
      front.push(...blobs.map(([cx, cy, r]) => ell(cx, cy, r, r, hm)));
      front.push(...([[21, 9, 2.5], [30, 5.5, 2.5], [38, 7.5, 2], [15, 16, 2]] as const).map(([cx, cy, r]) => ell(cx, cy, r, r, hl)));
      front.push(...([[27, 20.5, 1.6], [35, 19, 1.6], [42, 20.5, 1.4], [17, 27.5, 1.6], [22, 15, 1.4], [34, 12, 1.4]] as const).map(([cx, cy, r]) => ell(cx, cy, r, r, hd)));
      break;
    }
    case 'shaggy':
      front.push(path('M11,40 L12,24 C12,12 21,5.5 31,5.5 C42,5.5 49,12 48,23 L46.5,25 L45,20 L43,25 L40,19 L37,24.5 L33,18.5 L29,25 L25,19.5 L22,27 L20.5,36 L18,31 L16.5,42 L14,37 Z', hm));
      front.push(line('M18,14 C23,9 30,7.5 38,9 M15,22 L14,33 M27,12 L25,18 M36,12 L37,18', hl, 1.3, 'round'), line('M22,27 L25,19.5 L29,25 L33,18.5 L37,24.5 L40,19 L43,25', hd, 0.9));
      break;
    case 'afro':
      front.push(path('M11,30 C9,10 22,2 31,2 C43,2 51,10 49,24 L46,23.5 C44,19 39,17 33,17.5 C27,18 22,20.5 21,26 L20,32 L17,29.5 Z', hm));
      front.push(...([[18, 8, 3], [28, 3.5, 3], [12, 18, 2.5], [38, 5, 2.2], [22, 14, 2]] as const).map(([cx, cy, r]) => ell(cx, cy, r, r, hl)));
      break;
    case 'long':
      front.push(path('M12,34 C10,14 21,6 31,6 C41,6 48,12 47.5,22 L46,23 C42,17 36,15.5 30,18 C25,20 22,25 21.5,31 L20,38 L17,31 C15,31 13,32 12,34 Z', hm));
      front.push(line('M18,14 C23,9 30,7.5 38,9.5 M16,20 C15,25 15,29 16,32', hl, 1.5, 'round'), line('M46,23 C42,17 36,15.5 30,18 C25,20 22,25 21.5,31', hd, 1));
      break;
    case 'sides':
    case 'turban':
      front.push(path(sides, hm));
      break;
    default:
  }

  const clip = frame === 'hatHair' && !own ? ' clip-path="url(#hat)"' : '';
  const jump = has('jump') && !own ? ' transform="translate(0,-2.5)"' : '';
  out.push(`<clipPath id="hat"><rect x="10.5" y="21.5" width="39" height="70"/><ellipse cx="30" cy="27.5" rx="18.2" ry="19.7"/></clipPath>`);
  out.push(`<clipPath id="hd"><path d="${head}"/></clipPath><clipPath id="rr"><rect x="43.5" y="14" width="10" height="${34 + d}"/></clipPath>`);
  out.push(`<g${clip}${jump}>${back.join('')}</g>`);

  // ── neck, ear, head with light and shade ──
  out.push(rect(24, 47, 12, 13, shade), rect(24, 50 + d, 12, 5, deep));
  const e = f.ears ?? 1;
  out.push(ell(16.5 - (e - 1) * 2, 33.5, 3 * e, 4.5 * e, mid), ell(16.8 - (e - 1) * 2, 33.8, 1.4 * e, 2.6 * e, shade));
  out.push(path(head, shade));
  out.push(`<g clip-path="url(#hd)">`);
  out.push(path(head, mid, 'transform="translate(-1.2,-2.2)"'));
  out.push(ell(26, 19, 9, 5.5, light), ell(36, 39.5, 4.5, 3, light), ell(23.5, 16.5, 3.5, 1.8, hi));
  if (f.lines) out.push(ell(33, 34.2, 3.6, 1.2, shade), ell(43, 34.2, 2.4, 1.1, shade));
  if (has('flush')) out.push(ell(35.5, 40, 4.5, 2.8, mix(mid, M.flush!, 0.5)));
  if (has('puff')) out.push(ell(35, 42, 5.5, 4.5, light), ell(34, 40.5, 2, 1.4, hi));
  out.push(`<g clip-path="url(#rr)">${line(head, mix(light, M.rim!, 0.55), 2.2)}</g>`);
  out.push(`</g>`);
  if (has('puff')) out.push(ell(45.5, 43, 2.6, 3.4, mid));

  // ── beard ──
  const beard = `M16,35 C16,44 20,${52 + d} 30,${56 + d} C36,${57.5 + d} 42,${55 + d} 44.5,${48 + d} L46,40 L44,40 C42,42 40,42.5 38,42.5 C34,42.5 31,43 29,45 C25,44 21,40 20,34 Z`;
  if (f.beard === 'full') out.push(path(beard, hm), line(`M20,${50 + d} C25,${55 + d} 34,${57 + d} 42,${53 + d}`, hd, 1.4), line('M21,37 C22,41 25,44 28,45.5', hl, 1.2));
  if (f.beard === 'stubble') out.push(`<g clip-path="url(#hd)">${path(beard, mix(shade, hd, 0.4))}</g>`);
  if (f.beard === 'tache') out.push(path('M33,43 C36,41 41,41 45,42.5 C46,44 45,45.5 43,45 C40,44.5 37,45 34,46 C32.5,45.5 32.5,44 33,43 Z', hm));

  // ── eyes ──
  const es = f.eye ?? 1;
  const eye = (cx: number, cy: number, rx: number, mode: Expr['near'], near: boolean): string => {
    const base = 2.7 * es;
    if (mode === 'shut') {
      const s = near ? 1 : -1;
      return line(`M${cx - 2.6 * s},${cy - 2} L${cx + 2.4 * s},${cy} L${cx - 2.6 * s},${cy + 2}`, deep, 1.2);
    }
    if (mode === 'spiral') return ell(cx, cy, rx, base + 0.4, M.eyeWhite!) + `<circle cx="${cx}" cy="${cy}" r="${Math.min(rx, base) - 0.9}" fill="none" stroke="${PAL.ink}" stroke-width="0.9"/>` + rect(cx - 0.5, cy - 0.5, 1, 1, PAL.ink);
    const ry = base * (mode === 'narrow' ? 0.62 : mode === 'wide' ? 1.3 : mode === 'pop' ? 1.6 : 1);
    const wx = rx * (mode === 'pop' ? 1.2 : mode === 'wide' ? 1.08 : 1);
    const ir = mode === 'pop' ? 1.1 : Math.min(1.7 * Math.max(1, es * 0.9), ry + 0.2);
    const look = has('cross') ? (near ? 1.6 : -1) : 0.7;
    const ix = Math.round(cx + look) + 0.5;
    const iy = Math.round(cy) + 0.5;
    const parts = [ell(cx, cy, wx, ry, M.eyeWhite!), ell(ix, iy, ir, ir, M[f.iris]!), rect(ix - 0.5, iy - 0.5, 1, mode === 'pop' ? 1 : 1.2, PAL.ink)];
    if (mode !== 'pop') parts.push(rect(ix - 1.5, iy - 1.5, 1, 1, M.eyeWhite!));
    parts.push(line(`M${cx - wx - 0.3},${cy - ry * 0.35} Q${cx},${cy - ry - 1.1} ${cx + wx + 0.3},${cy - ry * 0.35}`, deep, mode === 'narrow' ? 1.6 : 1));
    return parts.join('');
  };
  out.push(eye(32.5, 31.5, 3.7 * Math.min(es, 1.15), x.near, true), eye(43, 31.5, 2.6 * Math.min(es, 1.15), x.far, false));

  // ── nose ──
  const n = f.nose ?? 1;
  const nx = 45 + (n - 1) * 6;
  const ny = 37.5 + (n - 1) * 3;
  const hook = (n - 1) * 5;
  out.push(path(`M41.5,29.5 Q${43.5 + hook},${31 + hook * 0.3} ${nx + 1},${ny - 1} Q${nx + 2.6},${ny + 1.5} ${nx},${ny + 2.6} L41,${ny + 3} Z`, has('flush') ? mix(light, M.flush!, 0.4) : light));
  out.push(path(`M41,${ny + 3} L${nx},${ny + 2.6} Q${nx + 2.2},${ny + 1.8} ${nx + 2},${ny + 0.4} L${nx - 1.5},${ny + 1.2} Z`, shade), rect(Math.round(nx - 2), Math.round(ny + 1.5), 1.6, 1, deep));
  out.push(rect(42, 32, 1, Math.max(2, ny - 34), hi));

  // ── mouth ──
  const my = d * 0.4;
  const mouthParts: Record<Expr['mouth'], string> = {
    smile: line('M34,45.8 Q38.5,48.8 43.5,45', deep, 1.2, 'round') + rect(44, 44, 1, 1, shade),
    snarl: path('M33.5,44.3 L44.6,43.3 L44,48.8 L34.5,49.8 Z', M.mouth!) + path('M34.3,44.6 L44.2,43.7 L44,45.6 L34.6,46.5 Z', M.teeth!) + path('M35,48.1 L43.6,47.3 L43.6,48.5 L35.1,49.4 Z', M.teeth!) + line('M37,44.5 L37,46.2 M39.5,44.2 L39.5,46 M42,44 L42,45.8', shade, 0.6),
    o: ell(39.5, 47, 2.5, 3.2, M.mouth!) + ell(39.5, 49, 1.4, 1, M.tongue!),
    clench: `<rect x="34" y="44.3" width="10" height="3.8" rx="1" fill="${M.teeth}" stroke="${deep}" stroke-width="0.9"/>` + line('M36.5,44.5 L36.5,48 M39,44.5 L39,48 M41.5,44.5 L41.5,48', deep, 0.7),
    tongue: path('M34,44.5 Q39,43.2 44,44.5 Q43,49.6 39,49.6 Q35,49.6 34,44.5 Z', M.mouth!) + path('M38,46 L43.2,46 L45.5,52 Q43.5,55 41,53 Z', M.tongue!) + line('M41,47 L42.6,51.5', M.mouth!, 0.6),
    wobble: line('M33.5,46.5 L35.5,45 L37.5,47.6 L39.5,45 L41.5,47.6 L43.5,45.5', deep, 1.2),
    drop: ell(39.5, 49.8, 3.7, 5.9, M.mouth!) + rect(37, 44.4, 5, 1.5, M.teeth!) + ell(39.5, 53.6, 2.4, 1.8, M.tongue!),
  };
  out.push(`<g transform="translate(0,${my})">${mouthParts[x.mouth]}</g>`);
  if (f.lines) out.push(line('M36,40.5 Q34.3,44 35.2,47.5', shade, 0.9), line('M24,22 Q30,20.6 37,22.2', shade, 0.8));

  // ── hair, own headwear, brows ──
  out.push(`<g${clip}${jump}>${front.join('')}</g>`);
  if (f.style === 'hijab') {
    const open = `M24,22 C27,17 35,15.5 41,17 C45,18 47.5,22 47.5,27 L47.5,35 C47.5,${43 + d} 45.5,${48 + d} 42.5,${51.5 + d} C40,${54.5 + d} 34,${55 + d} 30,${53 + d} C25,${50 + d} 22,44 22,36 C22,30 22.5,25 24,22 Z`;
    out.push(`<path fill-rule="evenodd" fill="${cl[1]}" d="M9,36 C6,12 20,3.5 31,3.5 C44,3.5 50.5,12 49.5,26 C49.5,36 48,44 45,52 C43,58 38,62 31,62 L12,62 C8,54 8,44 9,36 Z ${open}"/>`);
    out.push(line(open, cl[0]!, 1.1), line('M12,40 C14,50 20,57 29,60.5 M18,44 C20,51 25,56 33,59', cl[0]!, 1.2), line('M15,15 C20,8.5 28,6 36,7', cl[2]!, 2, 'round'), line('M12,24 C12,29 12.5,33 13.5,36', cl[2]!, 1.4, 'round'));
  }
  if (f.style === 'turban') {
    out.push(path('M11,24 C9,8 20,-1 31,-1 C43,-1 51,7 49,21 L47,23 C40,18 28,17 19,23 L16,27 Z', cl[1]!));
    out.push(line('M14,20 C22,10 34,6 47,12 M12,14 C20,4 34,1 46,6 M19,23 C26,13 36,10.5 48,17', cl[0]!, 1), line('M16,9 C21,3 28,1 34,1.6', cl[2]!, 1.6, 'round'), ell(33, 6, 2, 2.4, M.rim!));
  }
  const th = 2 * (f.brow ?? 1);
  const by = 26.3 + x.browY - (es - 1) * 2;
  const arch = (f.browArch ?? 0.8) + (x.browY < -2 ? 1.2 : 0);
  const [yo, yi] = [by - x.browTilt, by + x.browTilt];
  const browCol = f.hair === 'grey' ? hm : hd;
  out.push(line(`M28.3,${yo} Q32.5,${(yo + yi) / 2 - arch} 36.7,${yi}`, browCol, th), line(`M40,${yi} Q42.8,${(yo + yi) / 2 - arch * 0.8} 45.6,${yo}`, browCol, th * 0.9));

  // ── glasses ──
  if (f.glasses) {
    const g = x.crooked ?? 0;
    const hang = g > 20 ? ' translate(-1,5)' : '';
    out.push(`<g transform="rotate(${g} 22 31)${hang}">` + `<rect x="28" y="28" width="8.6" height="7" rx="2" fill="none" stroke="${PAL.ink}" stroke-width="1"/><rect x="39.6" y="28" width="6.6" height="7" rx="2" fill="none" stroke="${PAL.ink}" stroke-width="1"/>` + line('M36.6,30.5 L39.6,30.5 M28,30.5 L18,31.6', PAL.ink, 1) + line('M29.6,33.4 L31,31.6', ramp('cloth.glass')[2]!, 0.8) + `</g>`);
  }

  // ── extras ──
  if (has('vein')) out.push(line('M21.5,21 L23,22.6 L21.5,24.2 M25.2,20.6 L23.8,22.6 L25.4,24.4', M.flush!, 1));
  if (has('bump')) out.push(ell(36.5, 10.5, 4, 4.6, mix(mid, M.flush!, 0.6)), ell(35.4, 9, 1.3, 1.3, hi));
  const body = x.tilt ? `<g transform="rotate(${x.tilt} 34 54)">${out.join('')}</g>` : out.join('');
  const after: string[] = [];
  if (has('stars')) {
    const y = ramp('cloth.yellow');
    const star = (cx: number, cy: number, r: number): string => path(`M${cx},${cy - r} L${cx + r * 0.3},${cy - r * 0.3} L${cx + r},${cy} L${cx + r * 0.3},${cy + r * 0.3} L${cx},${cy + r} L${cx - r * 0.3},${cy + r * 0.3} L${cx - r},${cy} L${cx - r * 0.3},${cy - r * 0.3} Z`, y[1]!) + rect(cx - 0.5, cy - 0.5, 1, 1, y[2]!);
    after.push(star(12, -3, 4.5), star(31, -10, 5), star(51, -2, 4.5));
  }
  if (has('sweat')) after.push(path('M54,14 Q57.4,19.5 54,22 Q50.6,19.5 54,14 Z', ramp('cloth.glass')[1]!), rect(53, 18, 1, 1, ramp('cloth.glass')[2]!));
  return body + after.join('');
}

export const faceSprite = (f: Face, frame: Frame): Promise<Img> =>
  raster(faceSvg(f, frame), CELL_W, CELL_H, 0, CELL_TOP, { texture: [`hair.${f.hair}`], seed: Number(f.id.slice(1)) });
