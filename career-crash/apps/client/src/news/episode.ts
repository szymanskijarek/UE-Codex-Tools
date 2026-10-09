/**
 * Broken News (10): the reusable studio open. Every weekly minigame starts with
 * the same segment: the ident, the two anchors at the desk reading the story,
 * the conversation spiralling into a brawl, a few seconds of brawl, then the
 * hand-off to the week's minigame. An episode is only data (episodes/*.json);
 * this file turns it into a timeline and checks it against the format's rules.
 */
import type { Emotion } from '../replay/face-art';

/** Who is talking: the American anchor, the British anchor, or this week's guest. */
export type Seat = 'us' | 'uk' | 'guest';

/** How far the desk has spiralled: 0 professional, 1 bickering, 2 personal, 3 about to swing. */
export type Heat = 0 | 1 | 2 | 3;

export interface Beat {
  who: Seat;
  text: string;
  /** Face to wear while saying it (defaults from heat). */
  mood?: Emotion;
  heat: Heat;
  /** Hold the line this long instead of the reading-speed default. */
  ms?: number;
  /** A rogue office chair flies in from off screen and hits this seat as the line starts (they wear `hurt`). */
  chair?: Seat;
}

export interface Guest {
  name: string;
  /** Lower-third role, e.g. "Weather" or "Our man in the Cloud". */
  role: string;
  /** Stand-in career for the face and the brawl puppet until the guest has art. */
  career: string;
  /** Index of the beat where the guest walks on (before it, the seat is empty). */
  enters: number;
  /** What the guest thinks BSN stands for. */
  bsn?: string;
  /** Their painted desk-shot pictures, once they exist (art brief 04). */
  art?: string;
  /** Their own brawl puppet and faces (`npc.news-<x>`, art brief 04), render only. */
  persona?: string;
}

export interface Episode {
  /** Slug, also the brawl's seed: `2026-w41-printers`. */
  id: string;
  /** Monday of the week it airs (ISO date). */
  week: string;
  /**
   * This episode's guess at what BSN stands for (10 §3.4), first on the
   * ticker: officially Breaking Story Network, never the same twice.
   */
  bsn: string;
  /** The story, as the anchors would title it. Shown on the monitor wall. */
  headline: string;
  /** The strap under the anchors. */
  chyron: string;
  /** Lines for the crawl along the bottom. */
  ticker: string[];
  guest?: Guest;
  beats: Beat[];
  brawl: {
    seconds: number;
    /** Arena to brawl in (stand-in until the studio arena exists). */
    arena?: string;
    /** Speech bubbles as the first punch lands, one per seat that's in the shot. */
    shouts?: Partial<Record<Seat, string>>;
  };
  /** Id of the week's minigame (minigames/index.ts). */
  minigame: string;
  /**
   * What actually happened, in two or three plain sentences, shown on the
   * sign-off card: the jokes are the vehicle, this is the information.
   */
  realStory: { text: string; source?: string };
}

export type Phase = 'ident' | 'desk' | 'brawl' | 'standby' | 'handoff';

export interface Cue {
  phase: Phase;
  at: number;
  ms: number;
  /** For desk cues: which beat. */
  beat?: number;
}

/** The format's fixed timings (presentation, not gameplay). */
export const FORMAT = {
  identMs: 2400,
  standbyMs: 1600,
  handoffMs: 2600,
  /** The whole segment, ident to hand-off, must fit in this. */
  maxMs: 60_000,
  brawlMinS: 2,
  brawlMaxS: 6,
  /** Reading speed for a desk line: a base plus a little per character. */
  beatBaseMs: 1000,
  beatPerCharMs: 42,
  beatMinMs: 1500,
  beatMaxMs: 6000,
  /** A line with a rogue chair holds at least this long, so the hit and the hurt face both read. */
  chairBeatMs: 2600,
} as const;

/** The channel's official name; everyone else has their own (10 §3.4). */
export const BSN_OFFICIAL = 'Breaking Story Network';
const SMALL_WORDS = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'for', 'to', 'at', 'by']);

/** True when the phrase's initials (small words skipped) spell B-S-N. */
export function spellsBsn(phrase: string): boolean {
  const initials = phrase
    .split(/\s+/)
    .filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()))
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return initials === 'BSN';
}

export function beatMs(b: Beat): number {
  if (b.ms) return b.ms;
  if (b.chair) return Math.max(FORMAT.chairBeatMs, Math.min(FORMAT.beatMaxMs, FORMAT.beatBaseMs + b.text.length * FORMAT.beatPerCharMs));
  return Math.max(FORMAT.beatMinMs, Math.min(FORMAT.beatMaxMs, FORMAT.beatBaseMs + b.text.length * FORMAT.beatPerCharMs));
}

export function moodOf(b: Beat): Emotion {
  return b.mood ?? (b.heat >= 2 ? 'angry' : 'neutral');
}

/** The painted desk-shot expressions (art brief 01 C). */
export type DeskFace = 'neutral' | 'talk' | 'smug' | 'surprised' | 'angry' | 'lunge' | 'hurt';

/**
 * Which painted expression someone at the desk wears on a line. The speaker
 * talks, gets smug once it's bickering, angry once it's personal, and lunges
 * on the swing; a line's own `mood` wins. Everyone else reacts: calm, then
 * taken aback, then angry.
 */
export function deskFace(b: Beat, seat: Seat): DeskFace {
  if (b.chair === seat) return 'hurt';
  if (seat === b.who) {
    if (b.heat === 3) return 'lunge';
    if (b.mood === 'angry') return 'angry';
    if (b.mood === 'hurt') return 'hurt';
    if (b.mood === 'surprised') return 'surprised';
    if (b.mood === 'neutral') return 'talk';
    return b.heat >= 2 ? 'angry' : b.heat === 1 ? 'smug' : 'talk';
  }
  return b.heat >= 2 ? 'angry' : b.heat === 1 && seat !== 'guest' ? 'surprised' : 'neutral';
}

export function timeline(ep: Episode): { cues: Cue[]; totalMs: number } {
  const cues: Cue[] = [];
  let at = 0;
  const add = (phase: Phase, ms: number, beat?: number) => {
    cues.push(beat === undefined ? { phase, at, ms } : { phase, at, ms, beat });
    at += ms;
  };
  add('ident', FORMAT.identMs);
  ep.beats.forEach((b, i) => add('desk', beatMs(b), i));
  add('brawl', ep.brawl.seconds * 1000);
  add('standby', FORMAT.standbyMs);
  add('handoff', FORMAT.handoffMs);
  return { cues, totalMs: at };
}

/** The cue playing at `ms` into the segment (the last one once it's over). */
export function cueAt(cues: Cue[], ms: number): Cue {
  for (const c of cues) if (ms < c.at + c.ms) return c;
  return cues[cues.length - 1]!;
}

/**
 * The format's rules, so a new week's script can't drift from it: starts
 * professional, only ever escalates, ends ready to swing, has a short brawl,
 * fits in a minute, and points at a minigame that exists.
 */
export function checkEpisode(ep: Episode, minigames: readonly string[]): string[] {
  const out: string[] = [];
  if (ep.beats.length < 4) out.push('needs at least 4 desk lines');
  if (ep.beats[0]?.heat !== 0) out.push('the first line must be professional (heat 0)');
  if (ep.beats[ep.beats.length - 1]?.heat !== 3) out.push('the last line must be the swing (heat 3)');
  for (let i = 1; i < ep.beats.length; i++) if (ep.beats[i]!.heat < ep.beats[i - 1]!.heat) out.push(`line ${i + 1} cools down: the desk only ever escalates`);
  if (!ep.beats.some((b) => b.who === 'us') || !ep.beats.some((b) => b.who === 'uk')) out.push('both anchors must speak');
  const guestLines = ep.beats.map((b, i) => (b.who === 'guest' ? i : -1)).filter((i) => i >= 0);
  if (guestLines.length && !ep.guest) out.push('a guest speaks but the episode has no guest');
  if (ep.guest && guestLines.some((i) => i < ep.guest!.enters)) out.push('the guest speaks before walking on');
  ep.beats.forEach((b, i) => {
    if (b.chair === 'guest' && (!ep.guest || i < ep.guest.enters)) out.push(`line ${i + 1}: the chair hits a guest who isn't there`);
  });
  if (ep.brawl.seconds < FORMAT.brawlMinS || ep.brawl.seconds > FORMAT.brawlMaxS) out.push(`brawl must last ${FORMAT.brawlMinS}–${FORMAT.brawlMaxS} s`);
  if (!minigames.includes(ep.minigame)) out.push(`unknown minigame "${ep.minigame}"`);
  if (!ep.ticker.length) out.push('the ticker needs at least one line');
  if (!ep.realStory?.text) out.push('every episode ends with the real story');
  if (!ep.bsn || !spellsBsn(ep.bsn)) out.push(`"${ep.bsn ?? ''}" doesn't spell BSN`);
  else if (ep.bsn.toLowerCase() === BSN_OFFICIAL.toLowerCase()) out.push('the ticker never uses the official BSN name');
  if (ep.guest?.bsn && !spellsBsn(ep.guest.bsn)) out.push(`the guest's "${ep.guest.bsn}" doesn't spell BSN`);
  const { totalMs } = timeline(ep);
  if (totalMs > FORMAT.maxMs) out.push(`segment runs ${(totalMs / 1000).toFixed(1)} s, over the ${FORMAT.maxMs / 1000} s limit`);
  return out;
}
