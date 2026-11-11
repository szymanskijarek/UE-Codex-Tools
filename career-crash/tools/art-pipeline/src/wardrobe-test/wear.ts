/**
 * Wardrobe pixel tests: headwear, face accessories and outfits as separate
 * sprites (13 §2). Hats share the face cell and sit on fixed points of the
 * head (hat line y = 21.5, crown y = 9), so any hat goes on any face. Outfits
 * are headless bodies on one 96 × 160 template; the face cell goes at (16, 0).
 */
import { INK, ell, line, path, ramp, raster, rect, type Img } from './core';
import { CELL_H, CELL_TOP, CELL_W } from './faces';

const c = (name: string): [string, string, string] => ramp(`cloth.${name}`) as [string, string, string];

export interface Hat {
  id: string;
  name: string;
  /** cap and helmet switch the face to its hat-hair frame; face goes in the accessory slot (13 §2.1). */
  type: 'cap' | 'helmet' | 'face';
  back?: string;
  front: string;
  texture?: string[];
}

const dome = (top: number, l = 11.5, r = 48.5): string => `M${l},21.5 C${l},${top + 5.5} 21,${top} 31,${top} C41,${top} ${r},${top + 6.5} ${r},21.5 Z`;
const domeShade = (top: number, r = 48.5): string => `M41,${top + 3} C${r - 2.5},${top + 6.5} ${r},${top + 11.5} ${r},21.5 L${r - 4},21.5 C${r - 4},${top + 11.5} 43,${top + 6.5} 41,${top + 3} Z`;

export const HATS: Hat[] = ((): Hat[] => {
  const [Y, R, N, W, T, G, D, M, B] = [c('yellow'), c('red'), c('navy'), c('white'), c('teal'), c('gold'), c('dkgrey'), c('metal'), c('glass')];
  return [
    {
      id: 'hard-hat',
      name: 'hard hat',
      type: 'helmet',
      front: path(dome(2.5), Y[1]) + path(domeShade(2.5), Y[0]) + line('M16,13 C18,8 23,5 28,4.5', Y[2], 2, 'round') + line('M31,2.5 L31,21', Y[2], 2) + line('M33,3 L33.5,21', Y[0], 1) + path('M9.5,20 L52,20 Q56,21 56,23 L9.5,23.5 Z', Y[1]) + line('M10,23.2 L56,22.8', Y[0], 1.2),
    },
    {
      id: 'fire-helmet',
      name: 'fire helmet',
      type: 'helmet',
      front: path('M6,27 C8,22 12,20 16,20 L50,20 Q54.5,21 54.5,23.2 L16,23.5 C12,24 9,26 6,27 Z', R[0]) + path(dome(1.5), R[1]) + path(domeShade(1.5), R[0]) + path('M21,4 C27,-1.5 37,-1.5 43,5 L41,7 C36,2.5 28,2.5 23,6.5 Z', R[2]) + line('M16,14 C17,10 19,8 21,6.5', R[2], 1.6, 'round') + path('M37,9 L45,11 L45.5,19.5 L37.5,19.5 Z', G[1]) + rect(39, 11, 2, 2, G[2]) + line('M45,11.5 L45.5,19.5', G[0], 1),
    },
    {
      id: 'astronaut',
      name: 'space helmet',
      type: 'helmet',
      back: ell(31, 28, 27, 29, W[1]) + ell(31, 28, 22, 24, B[0]),
      front: `<path fill-rule="evenodd" fill="${W[2]}" d="M4,28 a27,29 0 1,0 54,0 a27,29 0 1,0 -54,0 Z M12,30 a20.5,21.5 0 1,0 41,0 a20.5,21.5 0 1,0 -41,0 Z"/>` + line('M52,16 C57,24 57,36 51,46', W[1], 2.4) + line('M12,14 C17,6 26,1.5 34,2', '#ffffff', 2, 'round') + rect(13, 53, 37, 7, M[1], 2) + rect(13, 53, 37, 2, M[2], 1) + line('M19,16 C23,11 29,9.5 35,10', B[2], 1.6, 'round') + line('M50.5,32 C50,39 47,44 43,47.5', B[1], 1.4, 'round'),
    },
    {
      id: 'cap',
      name: 'cap',
      type: 'cap',
      front: path(dome(5, 12.5, 47.5), R[1]) + path(domeShade(5, 47.5), R[0]) + line('M17,13 C19,9.5 23,7.5 27,7', R[2], 1.8, 'round') + line('M31,5 C36,9 38,15 38,21', R[0], 0.9) + rect(30, 4, 2.4, 1.4, R[2]) + path('M42,18 L56,20.5 Q58.5,22 56.5,23.6 L42,22.6 Z', R[1]) + line('M42,22.6 L56.5,23.4', R[0], 1.2),
    },
    {
      id: 'police-cap',
      name: 'peaked cap',
      type: 'cap',
      front: rect(12.5, 15, 35, 6.5, N[1]) + path('M9.5,15.5 C8.5,9 18,5 31,5 C44,5 52.5,9 50.5,15.5 Z', N[1]) + path('M44,7 C50,9 51.5,12 50.5,15.5 L47.5,21.5 L44,21.5 L46,15 Z', N[0]) + line('M14,11 C19,7.5 26,6.5 33,6.5', N[2], 1.6, 'round') + line('M12.5,18.5 L47.5,18.5', M[2], 1.2) + path('M41,20.5 L55,22 Q56.8,24 54,24.6 L41,23.6 Z', D[0]) + line('M43,21.6 L52,22.6', D[2], 0.8) + ell(40.5, 11.5, 2.4, 3, G[1]) + rect(39.5, 9.5, 1.2, 1.2, G[2]),
    },
    {
      id: 'toque',
      name: "chef's toque",
      type: 'cap',
      front: ([[18, 5, 7], [27, -1, 8.5], [37, 0, 8], [44, 6, 6.5], [31, 6, 9]] as const).map(([x, y, r]) => ell(x, y, r, r, W[2])).join('') + ell(42, 8.5, 4.5, 3, W[1]) + ell(24, 9, 3.5, 1.6, W[1]) + line('M33,-4 C35,-1 35,3 33,6', W[1], 1) + rect(13.5, 11.5, 33, 10, W[2]) + rect(42, 11.5, 4.5, 10, W[1]) + line('M19,12.5 L19,21 M25,12.5 L25,21 M31,12.5 L31,21 M37,12.5 L37,21', W[1], 0.9) + line('M13.5,21 L46.5,21', W[0], 1),
    },
    {
      id: 'beanie',
      name: 'beanie',
      type: 'cap',
      texture: ['cloth.teal'],
      front: ell(31, 1.5, 4, 3.6, W[2]) + ell(32.5, 2.8, 2, 1.6, W[1]) + path(dome(3.5, 12, 48), T[1]) + path(domeShade(3.5, 48), T[0]) + rect(11.5, 16.5, 37, 6, T[2], 1.5) + line('M17,17 L17,22 M23,17 L23,22 M29,17 L29,22 M35,17 L35,22 M41,17 L41,22', T[1], 1) + rect(44, 16.5, 4.5, 6, T[1], 1.5),
    },
    {
      id: 'crown',
      name: 'trophy crown',
      type: 'cap',
      front: path('M14,21.5 L12,7 L20,13 L25,3 L31,12 L37,3 L42,13 L50,7 L48,21.5 Z', G[1]) + path('M42,13 L50,7 L48,21.5 L43,21.5 Z', G[0]) + rect(14, 17, 34, 4.5, G[0]) + line('M15,10.5 L20,14.5 L24.5,6', G[2], 1.4, 'round') + ell(22, 19.2, 1.6, 1.6, R[1]) + ell(31, 19.2, 1.6, 1.6, B[1]) + ell(40, 19.2, 1.6, 1.6, R[1]),
    },
    {
      id: 'sunglasses',
      name: 'sunglasses',
      type: 'face',
      front: rect(27.5, 28, 9.6, 7, INK, 2) + rect(39.2, 28, 7.4, 7, INK, 2) + line('M37,30 L39.4,30 M27.5,30.5 L18,31.6', INK, 1.2) + line('M29.5,33 L32,30', B[1], 1) + line('M41,33 L43,30.5', B[1], 0.9),
    },
    {
      id: 'mask',
      name: 'surgical mask',
      type: 'face',
      front: line('M31,39.5 L18,33.5 M31,48 L18,37', W[2], 0.9) + path('M30,38 L41,36 Q49,36.5 49.5,40 L48.5,50 Q43,56 36,55 Q31,53.5 30,47 Z', B[1]) + path('M46,37 Q49,37.5 49.5,40 L48.5,50 Q46.5,52.5 44.5,54 L46,45 Z', B[0]) + line('M30.5,38.2 L41,36.3 Q46,36.4 48.5,38', B[2], 1.1) + line('M31,42.5 L46,41.4 M31,46.8 L45.5,46', B[0], 0.9),
    },
    {
      id: 'clown-nose',
      name: 'clown nose',
      type: 'face',
      front: ell(46.5, 38.5, 3.4, 3.4, R[1]) + path('M46.5,41.9 a3.4,3.4 0 0,0 3.4,-3.4 l-1.6,0 a2,2 0 0,1 -1.8,2 Z', R[0]) + rect(44.6, 36.4, 1.6, 1.6, R[2]),
    },
  ];
})();

/** A hat layer as a sprite. `fit` enlarges it about the hat line for faces whose own headwear it must go over. */
export async function hatSprite(h: Hat, layer: 'back' | 'front', fit = 1): Promise<Img | undefined> {
  const svg = h[layer];
  if (!svg) return undefined;
  const body = fit === 1 ? svg : `<g transform="translate(30 22) scale(${fit}) translate(-30 -22)">${svg}</g>`;
  return raster(body, CELL_W, CELL_H, 0, CELL_TOP, { texture: h.texture, seed: 7 });
}

// ── Outfits ─────────────────────────────────────────────────────────────────

export const BODY_W = 96;
export const BODY_H = 160;
/** Where the 64 × 80 face cell goes on the body canvas (chin lands on y = 70). */
export const HEAD_AT: [number, number] = [16, 0];

type Ramp3 = [string, string, string];
interface Parts {
  /** Sleeve cloth and how far it reaches: 0.55 = T-shirt, 2 = to the wrist. */
  sleeve: [string, number];
  torso: string;
  pelvis: string;
  /** Leg cloth and reach: 0 = bare, 1 = to the knee, 2 = full length. */
  legs: [string, number];
  shoes: string;
}
export interface Outfit {
  id: string;
  name: string;
  parts: Parts;
  /** Details drawn over the torso and legs, under the near arm. */
  extras?: () => string;
  texture?: string[];
  /** Ramp swaps for the Lead / Head "senior colours" (13 §2.3): no new art. */
  senior?: Record<string, string>;
}

const limb = (x0: number, y0: number, x1: number, y1: number, w: number, r: Ramp3): string =>
  line(`M${x0},${y0} L${x1},${y1}`, r[1], w, 'round') + line(`M${x0 + w * 0.3},${y0} L${x1 + w * 0.3},${y1}`, r[0], w * 0.4, 'round') + line(`M${x0 - w * 0.28},${y0 + 1} L${x1 - w * 0.28},${y1 - 1}`, r[2], 1);

function bodySvg(o: Outfit, skin: string[]): string {
  const sk: Ramp3 = [skin[1]!, skin[2]!, skin[3]!];
  const p = o.parts;
  const [sl, tor, pel, lg, sh] = [c(p.sleeve[0]), c(p.torso), c(p.pelvis), c(p.legs[0]), c(p.shoes)];
  const arm = (sx: number, sy: number, ex: number, ey: number, wx: number, wy: number, w: number): string => {
    const n = p.sleeve[1];
    const mid = (a: number, b: number, t: number): number => a + (b - a) * t;
    const parts = [limb(ex, ey, wx, wy, w - 1, n >= 2 ? sl : sk), limb(sx, sy, ex, ey, w, n >= 1 ? sl : sk)];
    if (n < 1) parts.push(limb(sx, sy, mid(sx, ex, n), mid(sy, ey, n), w + 0.6, sl));
    parts.push(ell(wx + 0.3, wy + 4.5, w * 0.5, w * 0.55, sk[1]), ell(wx + 1.6, wy + 5.2, w * 0.25, w * 0.4, sk[0]));
    return parts.join('');
  };
  const leg = (x: number, x2: number, w: number): string => {
    const n = p.legs[1];
    return limb(x2, 137, x2, 151, w - 2, n >= 2 ? lg : sk) + limb(x, 121, x2, 137, w, n >= 1 ? lg : sk);
  };
  const shoe = (x: number, len: number): string =>
    path(`M${x},149.5 L${x + len - 6},149.5 Q${x + len},151 ${x + len},155.5 L${x + len},158 L${x},158 Z`, sh[1]) + rect(x, 156.6, len, 1.8, sh[0]) + line(`M${x + 1.5},151 L${x + len - 7},151`, sh[2], 1);
  return [
    arm(61, 79, 65, 96, 66, 109, 8),
    leg(55, 56, 12),
    leg(37, 37, 13),
    shoe(50.5, 17),
    shoe(29.5, 18.5),
    path('M32,105 L61,105 L62,123 L47,123 L46,118 L45,123 L31,123 Z', pel[1]),
    path('M57,105 L61,105 L62,123 L57.5,123 Z', pel[0]),
    path('M31,73 Q46,70 61,73 Q65,76 64,84 L61,108 L32,108 L28,84 Q27,76 31,73 Z', tor[1]),
    path('M57,72.6 Q61,72.8 61,73 Q65,76 64,84 L61,108 L56.5,108 L58.5,84 Z', tor[0]),
    line('M30.5,78 L33,104', tor[2], 1),
    o.extras?.() ?? '',
    ell(46, 73.5, 8, 2.4, tor[0]),
    arm(31, 79, 27, 96, 27, 109, 9),
  ].join('');
}

export const OUTFITS: Outfit[] = ((): Outfit[] => {
  const [De, H, L, M, W, R, G, K, P] = [c('denim'), c('hivis'), c('leather'), c('metal'), c('white'), c('red'), c('grey'), c('khaki'), c('purple')];
  return [
    { id: 'mannequin', name: 'body template', parts: { sleeve: ['white', 0.55], torso: 'white', pelvis: 'grey', legs: ['grey', 1], shoes: 'grey' } },
    {
      id: 'builder',
      name: 'builder',
      parts: { sleeve: ['dkgrey', 0.6], torso: 'dkgrey', pelvis: 'denim', legs: ['denim', 2], shoes: 'khaki' },
      senior: { 'cloth.denim': 'cloth.navy', 'cloth.hivis': 'cloth.gold' },
      extras: () =>
        path('M38,81 L55,81 L56,108 L37,108 Z', De[1]) + line('M40,73 L40,82 M53,73 L53,82', De[1], 3) + rect(43, 86, 7, 6, De[0], 1) +
        path('M31,74 L38,72.6 L40,104 L31,104 L28.5,84 Z', H[1]) + path('M54,72.6 L61,74 L64,84 L61.5,104 L53,104 Z', H[1]) + path('M60,73.8 L61,74 L64,84 L61.5,104 L59,104 L60.5,84 Z', H[0]) +
        rect(29.5, 87, 10.5, 2.2, M[2]) + rect(30.5, 95, 9.5, 2.2, M[2]) + rect(53, 87, 10.6, 2.2, M[2]) + rect(53, 95, 9.6, 2.2, M[2]) +
        rect(31, 104, 31, 4.2, L[1]) + rect(31, 107, 31, 1.2, L[0]) + rect(44, 104, 5, 4.2, M[2]) + rect(45.5, 105.3, 2, 1.6, L[0]) +
        rect(31.5, 135, 11, 5, De[0], 2) + rect(51, 135, 10, 5, De[0], 2),
    },
    {
      id: 'chef',
      name: 'chef',
      parts: { sleeve: ['white', 2], torso: 'white', pelvis: 'white', legs: ['dkgrey', 2], shoes: 'dkgrey' },
      senior: { 'cloth.red': 'cloth.gold', 'cloth.dkgrey': 'cloth.navy' },
      extras: () =>
        line('M48,74 L44,104', W[1], 1) + [82, 89, 96].map((y) => rect(39, y, 2, 2, G[0]) + rect(50, y, 2, 2, G[0])).join('') +
        path('M39,72.5 L53,72.5 L48,81 L44,78 Z', R[1]) + path('M48,81 L53,72.5 L50,72.5 Z', R[0]) + path('M33,108 L60,108 L61,128 L32,128 Z', W[2]) + line('M33,112 L60,112', W[1], 1) + path('M57,108 L60,108 L61,128 L57,128 Z', W[1]),
    },
    {
      id: 'teacher',
      name: 'teacher (cardigan)',
      parts: { sleeve: ['green', 2], torso: 'green', pelvis: 'khaki', legs: ['khaki', 2], shoes: 'leather' },
      senior: { 'cloth.green': 'cloth.navy', 'cloth.red': 'cloth.gold' },
      extras: () =>
        path('M42,72.4 L51,72.4 L49.5,108 L43.5,108 Z', W[2]) + path('M45.4,75 L48.2,75 L48.8,93 L46.8,96 L45,93 Z', R[1]) + line('M48,76 L48.6,93', R[0], 0.8) +
        rect(41.4, 86, 1.6, 1.6, L[1]) + rect(41.6, 94, 1.6, 1.6, L[1]) + rect(41.8, 102, 1.6, 1.6, L[1]) + ell(65.5, 96, 2.6, 3.6, L[1]) + ell(26.5, 96, 3.2, 4.2, L[1]) + rect(32, 104.5, 29, 3, L[1]) + rect(45, 104.5, 3, 3, K[2]),
    },
    {
      id: 'dress',
      name: 'formalwear: dress',
      parts: { sleeve: ['purple', 0.5], torso: 'purple', pelvis: 'purple', legs: ['purple', 0], shoes: 'purple' },
      senior: { 'cloth.purple': 'cloth.navy' },
      extras: () => path('M32,103 L61,103 L67,139 Q47,144 26,139 Z', P[1]) + path('M57,103 L61,103 L67,139 Q63,140.5 59,141 Z', P[0]) + line('M38,108 L34,139 M47,108 L47,141 M54,108 L57,140', P[0], 0.9) + rect(31.5, 101, 30, 3, P[2]) + line('M40,73 Q46,80 52,73', P[2], 1.2),
    },
  ];
})();

export const bodySprite = (o: Outfit, skin: string[]): Promise<Img> => raster(bodySvg(o, skin), BODY_W, BODY_H, 0, 0, { texture: o.texture, seed: 3 });
