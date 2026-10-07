/**
 * The Diplomatic Incident vote service (docs/career-crash/09 §6): what
 * vote.careercrash.org (apps/votes) and the Summit Hall page
 * (apps/client/src/incident) say to each other. No dependencies, so the
 * Worker and the page can both import it cheaply.
 *
 *   GET  /config                → VoteConfig
 *   POST /token  TokenRequest   → TokenResponse          (400 bad proof)
 *   POST /like   LikeRequest    → LikeResponse           (409 already liked, 410 wrong hour, 429 network cap, 503 likes paused)
 *   GET  /hour/<hour>?s=<n>     → HourTallies            (425 until session n has started on the server's clock)
 */

/** Leading zero bits a token's proof of work needs (~0.2 s on a laptop, ~1 s on a phone). */
export const POW_BITS = 17;
/** How long a token stays valid, in days. */
export const TOKEN_DAYS = 7;
/** Likes per network (IPv4 /24, IPv6 /48) per country per hour; past it, likes are turned away (09 §6.3). */
export const NETWORK_CAP = 200;

export interface VoteConfig {
  bits: number;
  /** The server's clock (ms), so the page can tell how far off its own is. */
  now: number;
  /** False while likes are paused (the kill switch). */
  open: boolean;
}

/** A hashcash proof: sha256(`${POW_PREFIX}${day}:${salt}:${nonce}`) starts with `bits` zero bits. */
export const POW_PREFIX = 'cc-vote:';

export interface TokenRequest {
  /** UTC day the proof was made, YYYY-MM-DD (today or yesterday). */
  day: string;
  /** Random hex the page picks, so every proof (and so every token) is different. */
  salt: string;
  nonce: number;
}

export interface TokenResponse {
  token: string;
  /** When it stops being accepted (ms). */
  expires: number;
}

export interface LikeRequest {
  token: string;
  /** Country key, e.g. "PL" or "ENG". */
  country: string;
  /** The hour the page thinks it is, e.g. "2026-10-07T14"; a like for any other hour is turned away. */
  hour: string;
}

export interface LikeResponse {
  hour: string;
  /** The session (0–11) it landed in on the server's clock: it counts from the next one. */
  session: number;
}

/** Likes by country key. */
export type Tally = Record<string, number>;

export interface HourTallies {
  hour: string;
  /** The server's current session for this hour (11 once the hour is over). */
  session: number;
  /**
   * `frozen[s]` is what session `s` runs on: every like cast before it began
   * (in sessions 0…s−1). Entries never change once they exist, so every viewer
   * runs the same session (09 §5.3). Length `session + 1`.
   */
  frozen: Tally[];
  /** Likes cast during the current session so far (arriving at the next seam). */
  pending: Tally;
}

export const HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}$/;
