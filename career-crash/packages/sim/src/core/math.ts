/**
 * Integer math helpers for the deterministic simulation (01 §4.1).
 * Only IEEE-exact operations (+ − × ÷ sqrt) are used; no trig or pow.
 */

/** Integer division truncating toward zero. */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Floor of the square root of a non-negative integer. */
export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return isqrt(dist2(ax, ay, bx, by));
}

/** Unit vector scaled to 1000 (so 1000 = length 1). Returns [0,0] for a zero vector. */
export function dir1000(dx: number, dy: number): [number, number] {
  const len = isqrt(dx * dx + dy * dy);
  if (len === 0) return [0, 0];
  return [idiv(dx * 1000, len), idiv(dy * 1000, len)];
}

/** Scale value by basis points (10000 = ×1). */
export function bpMul(v: number, bp: number): number {
  return idiv(v * bp, 10000);
}

/** Eight compass directions as 1000-scaled unit vectors. */
export const DIRS8: ReadonlyArray<readonly [number, number]> = [
  [1000, 0],
  [707, 707],
  [0, 1000],
  [-707, 707],
  [-1000, 0],
  [-707, -707],
  [0, -1000],
  [707, -707],
];
