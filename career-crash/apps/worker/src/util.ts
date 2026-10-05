import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  TURNSTILE_SECRET?: string;
  ALLOWED_ORIGIN?: string;
}

export class ApiFail extends Error {
  constructor(
    public status: 400 | 401 | 402 | 403 | 404 | 409 | 429,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: ApiFail['status'], code: string, message: string): never => {
  throw new ApiFail(status, code, message);
};

export function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Time-sortable id: 10 chars of time + 12 random hex. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36).padStart(10, '0')}${randomHex(6)}`;
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function sha256(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

const TOKEN_TTL_MS = 24 * 3_600_000;

/** Session token: `${playerId}.${expiresAt}.${hmac}` (01 §6.4). */
export async function signToken(secret: string, playerId: string, now: number): Promise<string> {
  const payload = `${playerId}.${now + TOKEN_TTL_MS}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${toHex(sig)}`;
}

export async function verifyToken(secret: string, token: string, now: number): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [playerId, exp, sig] = parts as [string, string, string];
  if (Number(exp) < now) return null;
  const expected = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(`${playerId}.${exp}`));
  const hex = toHex(expected);
  if (hex.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? playerId : null;
}

export async function verifyTurnstile(env: Env, token: string | undefined, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // not configured (local dev / tests)
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
