/**
 * Wardrobe pixel tests: headwear, face accessories and outfits as separate
 * sprites (13 §2). Hats share the face cell and sit on fixed points of the
 * head (hat line y = 21.5, crown y = 9), so any hat goes on any face. Outfits
 * are headless bodies on one 96 × 160 template; the face cell goes at (16, 0).
 */
import { BLURS, INK, ell, lin, line, paint, path, ramp, rect, type Img } from './core';
import { BIG_CELL, CELL_H, CELL_TOP, CELL_W, bigHead } from './faces';

const c = (name: string): [string, string, string] => ramp(`cloth.${name}`) as [string, string, string];
/** Fill for a hat's main shape: light at the top left, shade at the lower right, along the ramp. */
const g = (name: string): string => `url(#hg-${name})`;
const soft = (svg: string, f = 'b1'): string => `<g filter="url(#${f})">${svg}</g>`;

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
      front: path(dome(2.5), g('yellow')) + soft(path(domeShade(2.5), Y[0])) + line('M16,13 C18,8 23,5 28,4.5', Y[2], 2, 'round') + line('M31,2.5 L31,21', Y[2], 2) + line('M33,3 L33.5,21', Y[0], 1) + path('M9.5,20 L52,20 Q56,21 56,23 L9.5,23.5 Z', Y[1]) + line('M10,23.2 L56,22.8', Y[0], 1.2),
    },
    {
      id: 'fire-helmet',
      name: 'fire helmet',
      type: 'helmet',
      front: path('M6,27 C8,22 12,20 16,20 L50,20 Q54.5,21 54.5,23.2 L16,23.5 C12,24 9,26 6,27 Z', R[0]) + path(dome(1.5), g('red')) + soft(path(domeShade(1.5), R[0])) + path('M21,4 C27,-1.5 37,-1.5 43,5 L41,7 C36,2.5 28,2.5 23,6.5 Z', R[2]) + line('M16,14 C17,10 19,8 21,6.5', R[2], 1.6, 'round') + path('M37,9 L45,11 L45.5,19.5 L37.5,19.5 Z', G[1]) + rect(39, 11, 2, 2, G[2]) + line('M45,11.5 L45.5,19.5', G[0], 1),
    },
    {
      id: 'astronaut',
      name: 'space helmet',
      type: 'helmet',
      back: ell(31, 28, 27, 29, g('white')) + ell(31, 28, 22, 24, B[0]),
      front: `<path fill-rule="evenodd" fill="${W[2]}" d="M4,28 a27,29 0 1,0 54,0 a27,29 0 1,0 -54,0 Z M12,30 a20.5,21.5 0 1,0 41,0 a20.5,21.5 0 1,0 -41,0 Z"/>` + line('M52,16 C57,24 57,36 51,46', W[1], 2.4) + line('M12,14 C17,6 26,1.5 34,2', '#ffffff', 2, 'round') + rect(13, 53, 37, 7, M[1], 2) + rect(13, 53, 37, 2, M[2], 1) + line('M19,16 C23,11 29,9.5 35,10', B[2], 1.6, 'round') + line('M50.5,32 C50,39 47,44 43,47.5', B[1], 1.4, 'round'),
    },
    {
      id: 'cap',
      name: 'cap',
      type: 'cap',
      front: path(dome(5, 12.5, 47.5), g('red')) + soft(path(domeShade(5, 47.5), R[0])) + line('M17,13 C19,9.5 23,7.5 27,7', R[2], 1.8, 'round') + line('M31,5 C36,9 38,15 38,21', R[0], 0.9) + rect(30, 4, 2.4, 1.4, R[2]) + path('M42,18 L56,20.5 Q58.5,22 56.5,23.6 L42,22.6 Z', R[1]) + line('M42,22.6 L56.5,23.4', R[0], 1.2),
    },
    {
      id: 'police-cap',
      name: 'peaked cap',
      type: 'cap',
      front: rect(12.5, 15, 35, 6.5, N[1]) + path('M9.5,15.5 C8.5,9 18,5 31,5 C44,5 52.5,9 50.5,15.5 Z', g('navy')) + path('M44,7 C50,9 51.5,12 50.5,15.5 L47.5,21.5 L44,21.5 L46,15 Z', N[0]) + line('M14,11 C19,7.5 26,6.5 33,6.5', N[2], 1.6, 'round') + line('M12.5,18.5 L47.5,18.5', M[2], 1.2) + path('M41,20.5 L55,22 Q56.8,24 54,24.6 L41,23.6 Z', D[0]) + line('M43,21.6 L52,22.6', D[2], 0.8) + ell(40.5, 11.5, 2.4, 3, G[1]) + rect(39.5, 9.5, 1.2, 1.2, G[2]),
    },
    {
      id: 'toque',
      name: "chef's toque",
      type: 'cap',
      front: ([[18, 5, 7], [27, -1, 8.5], [37, 0, 8], [44, 6, 6.5], [31, 6, 9]] as const).map(([x, y, r]) => ell(x, y, r, r, W[2])).join('') + soft(ell(43, 7, 5.5, 5, W[1]) + ell(24, 9.5, 4, 2, W[1]) + ell(36, 9, 5, 2.2, W[1])) + soft(ell(46, 8, 2.5, 4, W[0]), 'b2') + line('M33,-4 C35,-1 35,3 33,6', W[1], 1) + rect(13.5, 11.5, 33, 10, W[2]) + rect(42, 11.5, 4.5, 10, W[1]) + line('M19,12.5 L19,21 M25,12.5 L25,21 M31,12.5 L31,21 M37,12.5 L37,21', W[1], 0.9) + line('M13.5,21 L46.5,21', W[0], 1),
    },
    {
      id: 'beanie',
      name: 'beanie',
      type: 'cap',
      texture: ['cloth.teal'],
      front: ell(31, 1.5, 4, 3.6, W[2]) + ell(32.5, 2.8, 2, 1.6, W[1]) + path(dome(3.5, 12, 48), g('teal')) + soft(path(domeShade(3.5, 48), T[0])) + rect(11.5, 16.5, 37, 6, T[2], 1.5) + line('M17,17 L17,22 M23,17 L23,22 M29,17 L29,22 M35,17 L35,22 M41,17 L41,22', T[1], 1) + rect(44, 16.5, 4.5, 6, T[1], 1.5),
    },
    {
      id: 'crown',
      name: 'trophy crown',
      type: 'cap',
      front: path('M14,21.5 L12,7 L20,13 L25,3 L31,12 L37,3 L42,13 L50,7 L48,21.5 Z', g('gold')) + path('M42,13 L50,7 L48,21.5 L43,21.5 Z', G[0]) + rect(14, 17, 34, 4.5, G[0]) + line('M15,10.5 L20,14.5 L24.5,6', G[2], 1.4, 'round') + ell(22, 19.2, 1.6, 1.6, R[1]) + ell(31, 19.2, 1.6, 1.6, B[1]) + ell(40, 19.2, 1.6, 1.6, R[1]),
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
      front: line('M31,39.5 L18,33.5 M31,48 L18,37', W[2], 0.9) + path('M30,38 L41,36 Q49,36.5 49.5,40 L48.5,50 Q43,56 36,55 Q31,53.5 30,47 Z', B[1]) + soft(ell(36, 44, 5, 5, B[2]), 'b2') + path('M46,37 Q49,37.5 49.5,40 L48.5,50 Q46.5,52.5 44.5,54 L46,45 Z', B[0]) + line('M30.5,38.2 L41,36.3 Q46,36.4 48.5,38', B[2], 1.1) + line('M31,42.5 L46,41.4 M31,46.8 L45.5,46', B[0], 0.9),
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
export async function hatSprite(h: Hat, layer: 'back' | 'front', fit = 1, rot = 0, big = false): Promise<Img | undefined> {
  const svg = h[layer];
  if (!svg) return undefined;
  const grads = [...new Set([...svg.matchAll(/url\(#hg-(\w+)\)/g)].map((m) => m[1]!))].map((n) => lin(`hg-${n}`, 14, 0, 46, 24, [[0, c(n)[2]], [0.28, c(n)[1]], [0.7, c(n)[1]], [1, c(n)[0]]])).join('');
  const body = `<defs>${BLURS}${grads}</defs><g transform="${bigHead(big)} rotate(${rot} 30 54) translate(30 22) scale(${fit}) translate(-30 -22)">${svg}</g>`;
  const [w, hh, ox, oy] = big ? BIG_CELL : [CELL_W, CELL_H, 0, CELL_TOP];
  return paint(body, w, hh, ox, oy, { texture: h.texture, seed: 7 });
}

// ── Outfits on a jointed body ───────────────────────────────────────────────

export const BODY_W = 152;
export const BODY_H = 176;
/** Rows added above the body for the bigger head and tall hats. */
const HEAD_ROOM = 16;
/** The body is drawn about x = 46; the canvas starts 16 px to its left so poses have room. */
const BODY_OX = -16;

type Ramp3 = [string, string, string];
type Pt = [number, number];
/** Looks up a cloth ramp; the senior recolour swaps ramps here, so the drawing itself never changes. */
type Cloth = (name: string) => Ramp3;

interface Parts {
  /** Sleeve cloth and how far it reaches: 0.55 = T-shirt, 2 = to the wrist. */
  sleeve: [string, number];
  torso: string;
  pelvis: string;
  /** Leg cloth and reach: 0 = bare, 1 = to the knee, 2 = full length. */
  legs: [string, number];
  shoes: string;
  cuffs?: string;
  gloves?: string;
  elbows?: string;
  knees?: string;
}
export interface Outfit {
  id: string;
  name: string;
  parts: Parts;
  /** Details on the chest, drawn in the torso's own space (they lean with it). */
  chest?: (c: Cloth) => string;
  /** Details on the hips and legs (aprons, skirts), which stay upright. */
  hips?: (c: Cloth) => string;
  texture?: string[];
  /** Ramp swaps for the Lead / Head "senior colours" (13 §2.3): no new art. */
  senior?: Record<string, string>;
}

/** Joint angles in degrees: 0 hangs straight down, + swings forward (the fighter faces right). */
export interface Pose {
  id: string;
  lean: number;
  /** Shoulder swing, elbow bend. */
  armN: [number, number];
  armF: [number, number];
  /** Hip swing, knee bend. */
  legN: [number, number];
  legF: [number, number];
  head: number;
  /** How far the hips drop (a crouch). */
  dy: number;
  fists?: boolean;
}
export const POSES: Pose[] = [
  { id: 'stand', lean: 0, armN: [-2, 6], armF: [3, 5], legN: [-2, 0], legF: [2, 0], head: 0, dy: 0 },
  { id: 'guard', lean: 7, armN: [38, 112], armF: [52, 96], legN: [-16, 14], legF: [20, 24], head: -2, dy: 3, fists: true },
  { id: 'punch', lean: 15, armN: [34, 118], armF: [84, 6], legN: [-26, 10], legF: [28, 32], head: -6, dy: 4, fists: true },
  { id: 'hit', lean: -17, armN: [58, 26], armF: [96, 14], legN: [-10, 0], legF: [24, 42], head: -12, dy: 1 },
  { id: 'walk', lean: 4, armN: [30, 22], armF: [-26, 14], legN: [-24, 14], legF: [26, 18], head: 0, dy: 1 },
  { id: 'cheer', lean: -4, armN: [-158, -18], armF: [162, 16], legN: [-6, 0], legF: [8, 0], head: -7, dy: 0 },
];
export const pose = (id: string): Pose => POSES.find((p) => p.id === id)!;

const rad2 = (deg: number): number => (deg * Math.PI) / 180;
const dir = (deg: number): Pt => [Math.sin(rad2(deg)), Math.cos(rad2(deg))];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const turn = (p: Pt, about: Pt, deg: number): Pt => {
  const [c2, s2] = [Math.cos(rad2(deg)), Math.sin(rad2(deg))];
  const [x, y] = [p[0] - about[0], p[1] - about[1]];
  return [about[0] + x * c2 - y * s2, about[1] + x * s2 + y * c2];
};
const f1 = (n: number): string => n.toFixed(1);

/** Body width and height against the first template. */
const STOCKY: Pt = [1.2, 0.95];
let gid = 0;
/** A gradient across a form, lit from the upper left: mid, a light band, mid, then shade. */
function across(a: Pt, b: Pt, r: Ramp3): [string, string] {
  const id = `bg${gid++}`;
  return [`<defs>${lin(id, a[0], a[1], b[0], b[1], [[0, r[1]], [0.16, r[2]], [0.36, r[1]], [0.66, r[1]], [1, r[0]]])}</defs>`, `url(#${id})`];
}
/** A tapered limb segment from a (width wa) to b (width wb), rounded at both ends. */
function seg(a: Pt, b: Pt, wa: number, wb: number, r: Ramp3): string {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let n: Pt = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L];
  // The shaded side is the right one, or the underside of a limb held level.
  if (Math.abs(n[0]) > 0.35 ? n[0] < 0 : n[1] < 0) n = [-n[0], -n[1]];
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const w = Math.max(wa, wb) / 2 + 0.5;
  const [def, fill] = across(add(m, n, -w), add(m, n, w), r);
  const pts = [add(a, n, -wa / 2), add(a, n, wa / 2), add(b, n, wb / 2), add(b, n, -wb / 2)].map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
  return def + `<polygon points="${pts}" fill="${fill}"/>` + `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${wa / 2}" fill="${fill}"/><circle cx="${f1(b[0])}" cy="${f1(b[1])}" r="${wb / 2}" fill="${fill}"/>`;
}

interface Built {
  /** The parts behind the head, back to front. Each is its own sprite, so each gets its own dark line. */
  back: string[];
  /** The near arm, which can pass in front of the head. */
  front: string[];
  /** Where the chin goes on the body canvas, and how far the head turns. */
  neck: Pt;
  headRot: number;
}

function build(o: Outfit, skin: string[], ps: Pose, senior: boolean): Built {
  const c: Cloth = (name) => ramp(`cloth.${((senior && o.senior?.[`cloth.${name}`]) || `cloth.${name}`).slice(6)}`) as Ramp3;
  const sk: Ramp3 = [skin[1]!, skin[2]!, skin[3]!];
  const p = o.parts;
  const [sl, tor, pel, lg, sh] = [c(p.sleeve[0]), c(p.torso), c(p.pelvis), c(p.legs[0]), c(p.shoes)];
  const hips: Pt = [46, 121 + ps.dy];
  const up = (q: Pt): Pt => turn([q[0], q[1] + ps.dy], hips, ps.lean);

  const arm = (shoulder: Pt, [swing, bend]: [number, number], w: number, near: boolean): string => {
    const s = up(shoulder);
    const a1 = swing + ps.lean;
    const e = add(s, dir(a1), 17);
    const wr = add(e, dir(a1 + bend), 14);
    const n = p.sleeve[1];
    const out: string[] = [];
    out.push(seg(e, wr, w - 0.5, w - 1.5, n >= 2 ? sl : sk));
    out.push(seg(s, e, w + 0.5, w - 0.5, n >= 1 ? sl : sk));
    if (n < 1) out.push(seg(s, add(s, dir(a1), 17 * n), w + 1.5, w + 0.5, sl));
    if (p.elbows) out.push(`<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${w * 0.38}" ry="${w * 0.5}" fill="${c(p.elbows)[1]}" transform="rotate(${-a1} ${f1(e[0])} ${f1(e[1])})"/>`);
    if (n >= 2 && p.cuffs) out.push(seg(add(wr, dir(a1 + bend), -1.5), add(wr, dir(a1 + bend), 0.5), w - 2.2, w - 2.2, c(p.cuffs)));
    // The hand: a rounded mitt with a thumb, or a fist.
    const hand: Ramp3 = p.gloves ? c(p.gloves) : sk;
    const h = add(wr, dir(a1 + bend), 4.5);
    const [hd2, hf] = across([h[0] - 5.5, h[1] - 3], [h[0] + 5.5, h[1] + 3], hand);
    const r2 = near ? 5.6 : 5;
    if (p.gloves) out.push(seg(add(wr, dir(a1 + bend), -2), add(wr, dir(a1 + bend), 0.5), w + 0.6, w + 0.6, hand));
    out.push(hd2 + `<ellipse cx="${f1(h[0])}" cy="${f1(h[1])}" rx="${ps.fists ? r2 : r2 * 0.86}" ry="${ps.fists ? r2 * 0.92 : r2 * 1.12}" fill="${hf}" transform="rotate(${-(a1 + bend)} ${f1(h[0])} ${f1(h[1])})"/>`);
    const th = add(h, dir(a1 + bend + 70), r2 * 0.75);
    out.push(ell(th[0], th[1], 2.1, 1.8, hand[2]));
    out.push(line(`M${f1(h[0] - 2)},${f1(h[1] + 1.4)} L${f1(h[0] + 3)},${f1(h[1] + 1.8)}`, hand[0], 0.9));
    return out.join('');
  };

  const leg = (hip: Pt, [swing, bend]: [number, number], w: number): string => {
    const h: Pt = [hip[0], hip[1] + ps.dy];
    const k = add(h, dir(swing), 17);
    const an = add(k, dir(swing - bend), 14.5 - ps.dy * 0.3);
    const n = p.legs[1];
    const out: string[] = [];
    out.push(seg(k, an, w - 1, w - 2.5, n >= 2 ? lg : sk));
    out.push(seg(h, k, w, w - 1, n >= 1 ? lg : sk));
    if (p.knees && n >= 2) out.push(`<ellipse cx="${f1(k[0] + 0.6)}" cy="${f1(k[1])}" rx="${w * 0.42}" ry="${w * 0.36}" fill="${c(p.knees)[0]}"/>` + ell(k[0], k[1] - 0.8, w * 0.2, w * 0.12, c(p.knees)[2]));
    // The shoe stays flat on its sole and points the way the fighter faces.
    const [x, y] = an;
    out.push(`<g transform="translate(${f1(x)} ${f1(y + 6)}) scale(1.22 1.18) translate(${f1(-x)} ${f1(-y - 6)})">`);
    const [sd, sf] = across([x, y - 4], [x, y + 6], [sh[0], sh[1], sh[2]]);
    out.push(sd + path(`M${f1(x - 5.5)},${f1(y + 1)} Q${f1(x - 6)},${f1(y - 3)} ${f1(x - 2)},${f1(y - 3.5)} L${f1(x + 3)},${f1(y - 3.5)} Q${f1(x + 5)},${f1(y - 1)} ${f1(x + 9)},${f1(y - 0.5)} Q${f1(x + 12.5)},${f1(y + 0.5)} ${f1(x + 12.5)},${f1(y + 3.5)} L${f1(x + 12.5)},${f1(y + 6)} L${f1(x - 5.5)},${f1(y + 6)} Z`, sf));
    out.push(rect(x - 5.5, y + 4.6, 18, 1.6, mixInk(sh[0])), line(`M${f1(x + 2)},${f1(y - 1.6)} L${f1(x + 6)},${f1(y - 0.2)}`, sh[2], 0.9), ell(x + 10, y + 1.6, 1.6, 1, sh[2]), `</g>`);
    return out.join('');
  };

  const [td, tf] = across([27, 80], [66, 92], tor);
  const [pd, pf] = across([30, 110], [63, 116], pel);
  const [nd, nf] = across([41, 66], [52, 70], sk);
  const torso =
    `<g transform="translate(0 ${ps.dy}) rotate(${ps.lean} 46 121)">` +
    nd + rect(41.5, 62, 9.5, 12, nf) + soft(rect(41.5, 66, 9.5, 4, skin[0]!), 'b05') +
    td + path('M30,75 Q32,71.5 39,71.5 L53,71.5 Q60,71.5 62.5,75 Q65,79 64,86 L61.5,108 L32,108 L28.5,86 Q27.5,79 30,75 Z', tf) +
    soft(path('M34,104 L60,104 L61.5,108 L32,108 Z', tor[0]), 'b1') +
    (o.chest?.(c) ?? '') +
    soft(ell(46, 73.4, 7, 2.4, tor[0])) +
    `</g>`;
  const pelvis = pd + path(`M32,${105 + ps.dy} L61,${105 + ps.dy} L62.5,${122 + ps.dy} Q55,${125 + ps.dy} 47,${123 + ps.dy} L46,${119 + ps.dy} L45,${123 + ps.dy} Q38,${125 + ps.dy} 30.5,${122 + ps.dy} Z`, pf);
  // The fidelity pass is stockier than the first template: wider and a little shorter, about the feet.
  const part = (t: string): string => `<defs>${BLURS}</defs><g transform="translate(46 159) scale(${STOCKY[0]} ${STOCKY[1]}) translate(-46 -159)">${t}</g>`;
  const back = [arm([61, 79], ps.armF, 9.5, false), leg([53.5, 121], ps.legF, 13.5), leg([39.5, 121], ps.legN, 14.5), pelvis + `<g transform="translate(0 ${ps.dy})">${o.hips?.(c) ?? ''}</g>` + torso].map(part);
  const front = [part(arm([31.5, 79], ps.armN, 10.5, true))];
  const n0 = up([46, 70]);
  return { back, front, neck: [46 + (n0[0] - 46) * STOCKY[0], 159 + (n0[1] - 159) * STOCKY[1]], headRot: ps.lean * 0.6 + ps.head };
}
const mixInk = (col: string): string => {
  const v = [1, 3, 5].map((i) => Math.round(parseInt(col.slice(i, i + 2), 16) * 0.55));
  return '#' + v.map((n) => n.toString(16).padStart(2, '0')).join('');
};

export const OUTFITS: Outfit[] = [
  { id: 'mannequin', name: 'body template', parts: { sleeve: ['white', 0.55], torso: 'white', pelvis: 'grey', legs: ['grey', 1], shoes: 'grey' }, chest: (c) => line('M40,72 Q46,77 52,72', c('white')[0], 1) },
  {
    id: 'builder',
    name: 'builder',
    parts: { sleeve: ['dkgrey', 0.6], torso: 'dkgrey', pelvis: 'denim', legs: ['denim', 2], shoes: 'khaki', knees: 'dkgrey', gloves: 'khaki' },
    senior: { 'cloth.denim': 'cloth.navy', 'cloth.hivis': 'cloth.gold' },
    chest: (c) => {
      const [De, H, L, M] = [c('denim'), c('hivis'), c('leather'), c('metal')];
      return (
        path('M38,81 L55,81 L56,108 L37,108 Z', De[1]) + path('M52,81 L55,81 L56,108 L53,108 Z', De[0]) + line('M40,72.5 L40,82 M53,72.5 L53,82', De[1], 3) + rect(39, 80, 2, 2, M[2]) + rect(52, 80, 2, 2, M[2]) + rect(43, 86, 7, 6, De[0], 1) + line('M43.5,87 L49.5,87', De[2], 0.8) +
        path('M30.5,74.5 Q33,72 38,72 L40,104 L31,104 L28.5,86 Q28,79 30.5,74.5 Z', H[1]) + path('M54,72 Q60,72 62.5,75 Q65,79 64,86 L61.5,104 L53,104 Z', H[1]) + path('M60.5,73.6 Q65,78 64,86 L61.5,104 L58.5,104 L60.5,86 Z', H[0]) + line('M31,77 L32,103', H[2], 1.2) +
        rect(29, 87, 11, 2.4, M[2]) + rect(30, 95, 10, 2.4, M[2]) + rect(53, 87, 11, 2.4, M[2]) + rect(53, 95, 10, 2.4, M[2]) + rect(60.5, 87, 3.5, 2.4, M[1]) + rect(60, 95, 3, 2.4, M[1]) +
        rect(31, 104, 31, 4.4, L[1]) + rect(31, 107.2, 31, 1.2, L[0]) + rect(31, 104, 31, 1, L[2]) + rect(44, 103.6, 5.4, 5, M[2]) + rect(45.6, 105.2, 2.2, 1.8, L[0]) + rect(34, 107, 5, 6, L[1], 1) + rect(34, 107, 5, 1.4, L[2])
      );
    },
  },
  {
    id: 'chef',
    name: 'chef',
    parts: { sleeve: ['white', 2], torso: 'white', pelvis: 'white', legs: ['dkgrey', 2], shoes: 'dkgrey', cuffs: 'white' },
    senior: { 'cloth.red': 'cloth.gold', 'cloth.dkgrey': 'cloth.navy' },
    chest: (c) => {
      const [W, R, G] = [c('white'), c('red'), c('grey')];
      return (
        line('M50,73 Q49,90 45,104', W[1], 1.1) + line('M36,104 L58,104', W[0], 0.9) + [81, 88, 95].map((y) => ell(40, y, 1.3, 1.3, G[0]) + ell(51, y - 0.5, 1.3, 1.3, G[0]) + rect(39.4, y - 1, 0.9, 0.9, G[2])).join('') +
        path('M38.5,71.6 L53.5,71.6 L48.5,81 L44,78 Z', R[1]) + path('M48.5,81 L53.5,71.6 L50.5,71.6 L47,77.5 Z', R[0]) + line('M40,72.4 L44.5,77', R[2], 1)
      );
    },
    hips: (c) => {
      const W = c('white');
      return path('M33,107 L60,107 L61,130 L32,130 Z', W[2]) + path('M56,107 L60,107 L61,130 L56.5,130 Z', W[1]) + line('M33,111 L60,111', W[1], 1) + line('M38,113 L37.5,129', W[1], 0.8) + rect(42, 116, 10, 8, W[1], 1) + rect(42.8, 117, 8.4, 6.4, W[2], 1) + rect(32, 129, 29, 1.2, W[0]) + ell(36, 124, 1.6, 1.2, c('khaki')[2]) + ell(55, 120, 1.2, 1, c('khaki')[2]);
    },
  },
  {
    id: 'teacher',
    name: 'teacher (cardigan)',
    parts: { sleeve: ['green', 2], torso: 'green', pelvis: 'khaki', legs: ['khaki', 2], shoes: 'leather', elbows: 'leather', cuffs: 'green' },
    senior: { 'cloth.green': 'cloth.navy', 'cloth.red': 'cloth.gold' },
    chest: (c) => {
      const [W, R, L, K, Gn] = [c('white'), c('red'), c('leather'), c('khaki'), c('green')];
      return (
        path('M40,71.6 L52.5,71.6 L49.5,108 L43.5,108 Z', W[2]) + path('M49.5,72 L52.5,71.6 L49.5,108 L48,108 Z', W[1]) + path('M40,71.6 L44.5,76.5 L42,79 Z', W[1]) + path('M52.5,71.6 L48.5,76.5 L50.5,79 Z', W[1]) +
        path('M45.2,75.5 L48.2,75.5 L48.9,93 L46.8,96.4 L44.9,93 Z', R[1]) + line('M48,76.5 L48.6,93', R[0], 0.9) + rect(45.2, 75.5, 3, 2, R[0]) +
        line('M39.5,72 Q41,92 43.5,108', Gn[0], 1.2) + line('M53,72 Q52,92 49.5,108', Gn[0], 1.2) + line('M38.4,73 Q39.8,92 42.2,107', Gn[2], 0.9) +
        [86, 94, 102].map((y, i) => ell(41.6 + i * 0.3, y, 1.1, 1.1, L[1])).join('') + rect(33, 97, 6, 5, Gn[0], 1) + rect(54, 97, 6, 5, Gn[0], 1) +
        rect(32, 105, 29, 3, L[1]) + rect(32, 105, 29, 0.9, L[2]) + rect(45, 104.6, 3.4, 3.6, K[2])
      );
    },
  },
  {
    id: 'dress',
    name: 'formalwear: dress',
    parts: { sleeve: ['purple', 0.5], torso: 'purple', pelvis: 'purple', legs: ['purple', 0], shoes: 'purple' },
    senior: { 'cloth.purple': 'cloth.navy' },
    chest: (c) => {
      const P = c('purple');
      return line('M39.5,72 Q46,80.5 52.5,72', P[2], 1.3) + rect(31.5, 101, 30.5, 3.2, P[2]) + rect(31.5, 103.4, 30.5, 1, P[0]) + ell(46, 102.6, 2, 2, P[0]);
    },
    hips: (c) => {
      const P = c('purple');
      return (
        `<defs>${lin('dr', 26, 120, 67, 124, [[0, P[1]], [0.14, P[2]], [0.34, P[1]], [0.7, P[1]], [1, P[0]]])}</defs>` +
        path('M32,104 L61,104 L67.5,139 Q57,143 47,141.5 Q37,143 25.5,139 Z', 'url(#dr)') + soft(line('M38,108 L33.5,139 M47,108 L47,141 M54.5,108 L58,140', P[0], 1.3), 'b05') + soft(line('M42,110 L40,139 M51,110 L52.5,140', P[2], 1), 'b05') + line('M26,138.6 Q37,142.4 47,141 Q57,142.4 67,138.6', P[2], 1)
      );
    },
  },
];

export interface BodySprites {
  back: Img[];
  front: Img[];
  /** Top-left of the big face cell on the body canvas, so the chin lands on the neck. */
  headAt: [number, number];
  headRot: number;
}
export async function bodySprites(o: Outfit, skin: string[], ps: Pose = POSES[0]!, senior = false): Promise<BodySprites> {
  const b = build(o, skin, ps, senior);
  const opts = { texture: o.texture, seed: 3 };
  const draw = (t: string): Promise<Img> => paint(t, BODY_W, BODY_H, BODY_OX, -HEAD_ROOM, opts);
  const [back, front] = await Promise.all([Promise.all(b.back.map(draw)), Promise.all(b.front.map(draw))]);
  // The head turns about its chin at (30, 54) in face coordinates.
  return { back, front, headAt: [Math.round(b.neck[0] - BODY_OX - 30 + BIG_CELL[2]), Math.round(b.neck[1] - 54 + BIG_CELL[3]) + HEAD_ROOM], headRot: Math.round(b.headRot) };
}
