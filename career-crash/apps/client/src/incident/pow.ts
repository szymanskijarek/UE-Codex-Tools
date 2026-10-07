import { POW_PREFIX, type TokenRequest } from '@cc/protocol/votes';

/**
 * The proof of work behind a vote token (09 §6.3): find a nonce whose
 * sha256(`cc-vote:<day>:<salt>:<nonce>`) starts with `bits` zero bits. Plain
 * synchronous SHA-256, run in small slices so the page never stutters (a
 * WebCrypto call per attempt would be far slower).
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const W = new Uint32Array(64);

/** SHA-256 of an ASCII string (all a proof ever holds). */
export function sha256Ascii(text: string): Uint8Array {
  const len = text.length;
  const blocks = ((len + 8) >> 6) + 1;
  const m = new Uint8Array(blocks * 64);
  for (let i = 0; i < len; i++) m[i] = text.charCodeAt(i);
  m[len] = 0x80;
  const bitLen = len * 8;
  m[m.length - 4] = bitLen >>> 24;
  m[m.length - 3] = (bitLen >>> 16) & 0xff;
  m[m.length - 2] = (bitLen >>> 8) & 0xff;
  m[m.length - 1] = bitLen & 0xff;
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < 16; i++) {
      const o = b * 64 + i * 4;
      W[i] = (m[o]! << 24) | (m[o + 1]! << 16) | (m[o + 2]! << 8) | m[o + 3]!;
    }
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15]!, y = W[i - 2]!;
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[i] = (W[i - 16]! + s0 + W[i - 7]! + s1) | 0;
    }
    let a = h0, bb = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i]! + W[i]!) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = bb;
      bb = a;
      a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + bb) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  const out = new Uint8Array(32);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => {
    out[i * 4] = v >>> 24;
    out[i * 4 + 1] = (v >>> 16) & 0xff;
    out[i * 4 + 2] = (v >>> 8) & 0xff;
    out[i * 4 + 3] = v & 0xff;
  });
  return out;
}

function zeroBits(h: Uint8Array): number {
  let n = 0;
  for (const x of h) {
    if (x === 0) n += 8;
    else return n + Math.clz32(x) - 24;
  }
  return n;
}

/**
 * Finds a proof, working `sliceMs` at a time and then giving the page a turn,
 * so the floor keeps animating (a busy page can take a while to hand control
 * back, so slices are timed rather than counted).
 */
export async function solve(day: string, bits: number, sliceMs = 12): Promise<TokenRequest> {
  const salt = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, '0')).join('');
  const head = `${POW_PREFIX}${day}:${salt}:`;
  for (let nonce = 0; ; ) {
    const until = performance.now() + sliceMs;
    do {
      for (const end = nonce + 256; nonce < end; nonce++) if (zeroBits(sha256Ascii(head + nonce)) >= bits) return { day, salt, nonce };
    } while (performance.now() < until);
    await new Promise((r) => setTimeout(r, 0));
  }
}
