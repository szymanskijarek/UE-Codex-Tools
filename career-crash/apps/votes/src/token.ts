import { POW_BITS, POW_PREFIX, TOKEN_DAYS, type TokenRequest } from '@cc/protocol/votes';

/**
 * Device tokens (09 §6.3). A page earns one with a small proof of work and
 * keeps it for a week; the token is the proof's hash signed with the
 * service's key, so it can't be forged and each one cost real CPU. No account,
 * nothing about the person in it.
 */

const enc = new TextEncoder();
const DAY_MS = 86_400_000;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

export async function sha256Hex(text: string): Promise<string> {
  return hex((await sha256(text)).buffer as ArrayBuffer);
}

export function leadingZeroBits(b: Uint8Array): number {
  let n = 0;
  for (const x of b) {
    if (x === 0) {
      n += 8;
      continue;
    }
    return n + Math.clz32(x) - 24;
  }
  return n;
}

export const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The proof's id (hex), or null if it isn't a valid proof made today or yesterday. */
export async function checkProof(p: TokenRequest, now: number, bits = POW_BITS): Promise<string | null> {
  if (typeof p?.day !== 'string' || typeof p.salt !== 'string' || !Number.isSafeInteger(p.nonce) || p.nonce < 0) return null;
  if (p.day !== dayOf(now) && p.day !== dayOf(now - DAY_MS)) return null;
  if (!/^[0-9a-f]{16,64}$/.test(p.salt)) return null;
  const h = await sha256(`${POW_PREFIX}${p.day}:${p.salt}:${p.nonce}`);
  return leadingZeroBits(h) >= bits ? hex(h.buffer as ArrayBuffer).slice(0, 32) : null;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function sign(secret: string, payload: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload))).slice(0, 32);
}

export async function issueToken(secret: string, id: string, now: number): Promise<{ token: string; expires: number }> {
  const day = dayOf(now);
  return { token: `v1.${id}.${day}.${await sign(secret, `${id}.${day}`)}`, expires: Date.parse(`${day}T00:00:00Z`) + TOKEN_DAYS * DAY_MS };
}

/** The token's id if it's genuine and not expired, else null. */
export async function checkToken(secret: string, token: unknown, now: number): Promise<string | null> {
  if (typeof token !== 'string') return null;
  const m = /^v1\.([0-9a-f]{32})\.(\d{4}-\d{2}-\d{2})\.([0-9a-f]{32})$/.exec(token);
  if (!m) return null;
  const [, id, day, sig] = m as unknown as [string, string, string, string];
  const issued = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(issued) || now >= issued + TOKEN_DAYS * DAY_MS || issued > now + DAY_MS) return null;
  const want = await sign(secret, `${id}.${day}`);
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? id : null;
}

/** The network a like comes from: an IPv4 /24 or IPv6 /48 (09 §6.3). */
export function networkOf(ip: string): string {
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':');
  return ip.split('.').slice(0, 3).join('.');
}
