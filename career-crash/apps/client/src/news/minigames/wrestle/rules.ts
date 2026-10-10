/**
 * Wrestle the Bird (Man vs Emu, art brief 13): the rules, kept apart from the
 * screen so they can be tested. Side Neck winds up one of three attacks, a
 * note falls down that move's lane, and the player answers on the beat. The
 * further into the fight, the faster the notes and the narrower the window.
 */

/** Side Neck's three attacks, and the move that beats each. */
export type Attack = 'peck' | 'kick' | 'slam';
export const ATTACKS: readonly Attack[] = ['peck', 'kick', 'slam'];
export const ANSWER: Record<Attack, 'grab' | 'block' | 'duck'> = { peck: 'grab', kick: 'block', slam: 'duck' };

export const WRESTLE = {
  /** Attacks in a full bout (the real one lasted about twenty seconds; ours a little longer). */
  attacks: 16,
  /** Hits until the trousers are lost (trousers-1 … trousers-5). */
  trousers: 4,
  /** Note fall time (the wind-up), first attack → last. */
  fallMs: [1500, 720],
  /** Half-width of the timing window around the beat, first → last. */
  windowMs: [240, 85],
  /** Breather before the next wind-up, first → last. */
  gapMs: [900, 260],
  /** Within this of the beat, a press is "perfect". */
  perfectMs: 60,
} as const;

const lerp = ([a, b]: readonly [number, number], t: number) => Math.round(a + (b - a) * t);

/** How hard attack `i` (0-based) is: it only gets faster and tighter. */
export function pace(i: number) {
  const t = Math.min(1, i / (WRESTLE.attacks - 1));
  return { fallMs: lerp(WRESTLE.fallMs, t), windowMs: lerp(WRESTLE.windowMs, t), gapMs: lerp(WRESTLE.gapMs, t) };
}

/** The bout's attacks: random, but never the same one three times running. */
export function bout(rand: () => number = Math.random): Attack[] {
  const out: Attack[] = [];
  while (out.length < WRESTLE.attacks) {
    const a = ATTACKS[Math.floor(rand() * ATTACKS.length)]!;
    if (out.length >= 2 && out[out.length - 1] === a && out[out.length - 2] === a) continue;
    out.push(a);
  }
  return out;
}

export type Verdict = 'perfect' | 'good' | 'wrong' | 'early' | 'miss';

/**
 * A press against the falling note: `dt` is how far from the beat (negative =
 * early). Inside the window with the right move beats the attack; the wrong
 * move inside it, or a press up to a window early, is too committal and the
 * attack lands. Anything earlier is just a flinch and doesn't count.
 */
export function judge(attack: Attack, move: string, dt: number, windowMs: number): Verdict | null {
  if (dt < -2 * windowMs) return null;
  if (dt < -windowMs) return 'early';
  if (dt > windowMs) return 'miss';
  if (move !== ANSWER[attack]) return 'wrong';
  return Math.abs(dt) <= WRESTLE.perfectMs ? 'perfect' : 'good';
}

export const landed = (v: Verdict) => v === 'wrong' || v === 'early' || v === 'miss';

/** The sign-off line, by how many hits got through (short: it's the card's headline). */
export function resultLine(hits: number): string {
  if (hits === 0) return 'Flawless. Not a crease. Side Neck has gone home.';
  if (hits === 1) return 'Trousers at 75%. A hard-won peace.';
  if (hits === 2) return 'Trousers at 50%. Technically present.';
  if (hits === 3) return 'Trousers at 25%. The alpaca saw everything.';
  return 'Trousers: lost. Side Neck has them.';
}
