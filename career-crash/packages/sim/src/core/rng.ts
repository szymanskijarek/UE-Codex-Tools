/**
 * sfc32 PRNG (01 §4.1). Pure 32-bit integer arithmetic, identical in every JS engine.
 */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

export class Rng {
  s: RngState;

  constructor(state: RngState) {
    this.s = { ...state };
  }

  static fromSeed(seedHex: string): Rng {
    const h = seedHex.padEnd(32, '0').slice(0, 32);
    const words = [0, 1, 2, 3].map((i) => parseInt(h.slice(i * 8, i * 8 + 8), 16) >>> 0);
    const rng = new Rng({ a: words[0]!, b: words[1]!, c: words[2]!, d: words[3]! | 1 });
    for (let i = 0; i < 15; i++) rng.nextU32();
    return rng;
  }

  /** Independent stream derived from this seed and a label; forking never advances this stream. */
  fork(label: string): Rng {
    const lh = fnv32(label, 0x811c9dc5);
    const lh2 = fnv32(label, 0x01000193);
    const rng = new Rng({ a: (this.s.a ^ lh) >>> 0, b: (this.s.b ^ lh2) >>> 0, c: (this.s.c + lh) >>> 0, d: (this.s.d ^ Math.imul(lh2, 2654435761)) >>> 0 | 1 });
    for (let i = 0; i < 15; i++) rng.nextU32();
    return rng;
  }

  nextU32(): number {
    let { a, b, c, d } = this.s;
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) >>> 0;
    this.s = { a: a >>> 0, b, c, d };
    return t;
  }

  /** Integer in [0, n). */
  int(n: number): number {
    if (n <= 1) return 0;
    return this.nextU32() % n;
  }

  /** Integer in [lo, hi] inclusive. */
  range(lo: number, hi: number): number {
    return lo + this.int(hi - lo + 1);
  }

  /** True with probability bp/10000. */
  chance(bp: number): boolean {
    if (bp <= 0) return false;
    if (bp >= 10000) return true;
    return this.int(10000) < bp;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]!;
  }
}

export function fnv32(str: string, offset = 0x811c9dc5): number {
  let h = offset >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 64-bit (as two 32-bit FNV-1a lanes) hash, 16 hex chars. */
export function hash64(str: string): string {
  const a = fnv32(str, 0x811c9dc5);
  const b = fnv32(str, 0xcbf29ce4);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}
