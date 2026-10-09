/**
 * NES-style chiptune music, synthesised live (WebAudio, no files): two pulse
 * channels (12.5 / 25 / 50% duty), a triangle bass and a noise channel for
 * drums — the 2A03's line-up. Songs are tiny trackers: a hand-written lead
 * (eighth notes), bass and second-pulse parts generated from the chord
 * progression in a style, and a drum pattern. One song for the menus and one
 * per arena; `setTempo` speeds a song up as a match heads for its finish.
 */
export type SongId = 'menu' | 'supermarket' | 'office' | 'station' | 'diner' | 'construction' | 'warehouse' | 'docks' | 'theatre' | 'hotel' | 'hospital' | 'museum' | 'airport' | 'trading-floor' | 'trading-floor-bear' | 'news-theme' | 'news-bed' | 'news-brawl';

type BassStyle = 'octave' | 'walk' | 'chug' | 'half' | 'funk';
type ArpStyle = 'arp16' | 'stab' | 'none';

interface Song {
  bpm: number;
  /** Swing amount for off-beat 16ths (0 = straight). */
  swing: number;
  /** One chord per bar. */
  chords: string[];
  /** Lead: eighth-note tokens per bar ("E5", "-" hold, "." rest), bars split by "|". */
  lead: string;
  leadDuty: 0 | 1 | 2;
  arpDuty: 0 | 1 | 2;
  bass: BassStyle;
  arp: ArpStyle;
  /** 16 or 32 steps: k kick, s snare, h hat, o open hat, X kick+snare, . rest. */
  drums: string;
  /** Lead octave shift for variety. */
  transpose?: number;
}

const SONGS: Record<SongId, Song> = {
  // Broken News (10): the BSN anthem. Bombastic, self-important cable-news brass, in D major.
  'news-theme': {
    bpm: 120,
    swing: 0,
    chords: ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'],
    lead: 'D5 - - A4 D5 - F#5 - | G5 - - - B5 - A5 G5 | F#5 - D5 - A4 - D5 - | E5 - - - . E5 F#5 G5 | F#5 - D5 - B4 - D5 F#5 | G5 - B5 - D6 - B5 G5 | A5 - - - C#6 - E6 - | D6 - - - - - . .',
    leadDuty: 2,
    arpDuty: 1,
    bass: 'octave',
    arp: 'arp16',
    drums: 'X...s...k.k.s.ho',
  },
  // Broken News: the desk bed. Ticking, urgent news underscore in D minor; it speeds up with the heat (setTempo).
  'news-bed': {
    bpm: 128,
    swing: 0,
    chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'],
    lead: 'D5 . D5 . D5 . F5 E5 | D5 . D5 . A4 . . . | D5 . D5 . F5 . D5 . | E5 . E5 . G5 . E5 C5 | A5 . A5 . A5 . G5 F5 | E5 . D5 . A4 . . . | Bb4 . D5 . G5 . Bb5 . | A5 - G5 - F5 - E5 -',
    leadDuty: 0,
    arpDuty: 0,
    bass: 'chug',
    arp: 'arp16',
    drums: 'k.h.k.h.k.h.k.hh',
  },
  // Broken News: the brawl. The bed's theme, twice as frantic.
  'news-brawl': {
    bpm: 172,
    swing: 0,
    chords: ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'Gm', 'A'],
    lead: 'D5 F5 A5 F5 D5 F5 A5 D6 | D6 - Bb5 - F5 - D5 - | E5 G5 C6 G5 E5 G5 C6 E6 | C#6 - A5 - E5 - C#5 - | D6 - A5 D6 F6 - D6 A5 | Bb5 - F5 Bb5 D6 - Bb5 F5 | G5 Bb5 D6 G6 D6 Bb5 G5 D5 | A5 - E5 - C#5 - A4 -',
    leadDuty: 1,
    arpDuty: 0,
    bass: 'chug',
    arp: 'stab',
    drums: 'k.s.k.s.kks.k.sX',
  },
  // Upbeat office-march jingle for the menus.
  menu: {
    bpm: 138,
    swing: 0,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    lead: 'E5 - G5 - C6 - G5 E5 | D5 - G5 - B5 - A5 G5 | C5 E5 A5 - G5 E5 C5 E5 | F5 - A5 - C6 - A5 - | G5 - E5 G5 C6 - D6 E6 | D6 - B5 G5 D5 - G5 B5 | A5 - F5 A5 C6 A5 F5 E5 | D5 - . D5 E5 F5 G5 -',
    leadDuty: 2,
    arpDuty: 0,
    bass: 'octave',
    arp: 'arp16',
    drums: 'k.h.s.h.k.k.s.hh',
  },
  // Lazy supermarket muzak with a bossa lilt.
  supermarket: {
    bpm: 116,
    swing: 0.12,
    chords: ['F', 'Dm', 'Gm', 'C7', 'F', 'Dm', 'Bb', 'C7'],
    lead: 'A4 - C5 - F5 - E5 - | D5 - - . A4 - F4 - | G4 - Bb4 - D5 - C5 Bb4 | A4 - G4 - E4 - C4 - | A4 C5 F5 A5 G5 - F5 - | F5 - D5 - A4 - D5 - | D5 - F5 - Bb5 - A5 G5 | E5 - C5 - G4 - . .',
    leadDuty: 1,
    arpDuty: 2,
    bass: 'walk',
    arp: 'stab',
    drums: 'k..hs.h.k.hhs.h.',
  },
  // Tense corporate funk.
  office: {
    bpm: 126,
    swing: 0.08,
    chords: ['Am7', 'D7', 'Am7', 'D7', 'F', 'G', 'Am', 'E'],
    lead: 'A4 . C5 A4 . G4 A4 . | F#4 . A4 C5 . D5 . C5 | A4 . C5 A4 . G4 E4 G4 | A4 - . D5 C5 A4 F#4 A4 | F4 . A4 C5 F5 . E5 C5 | D5 . B4 G4 . D5 . B4 | C5 - A4 - E5 - C5 - | B4 . G#4 . E4 - . .',
    leadDuty: 1,
    arpDuty: 0,
    bass: 'funk',
    arp: 'stab',
    drums: 'k.hks.h..hk.s.ho',
  },
  // Driving train rhythm.
  station: {
    bpm: 150,
    swing: 0,
    chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B'],
    lead: 'E5 - - B4 E5 - G5 - | E5 - C5 - G4 - C5 - | D5 - F#5 - A5 - F#5 D5 | E5 - - - B4 - - - | G5 - F#5 - E5 - B4 - | C5 - E5 - G5 - E5 - | F#5 - A5 - D6 - A5 - | B5 - A5 - G5 - F#5 -',
    leadDuty: 2,
    arpDuty: 0,
    bass: 'chug',
    arp: 'arp16',
    drums: 'khhkshhkkhhkshhk',
  },
  // 50s rock'n'roll shuffle.
  diner: {
    bpm: 158,
    swing: 0.3,
    chords: ['G', 'G', 'C', 'G', 'D', 'C', 'G', 'D'],
    lead: 'G4 B4 D5 . E5 D5 B4 G4 | G4 B4 D5 . E5 D5 B4 . | C5 E5 G5 . A5 G5 E5 C5 | B4 - G4 - D4 - G4 - | A4 C5 F#5 . A5 F#5 D5 . | C5 E5 G5 . E5 C5 G4 . | D5 - B4 - G4 - B4 D5 | F#5 - A5 - D5 - . .',
    leadDuty: 1,
    arpDuty: 2,
    bass: 'walk',
    arp: 'stab',
    drums: 'k.h.s.h.k.h.s.h.',
  },
  // Heavy, stomping building-site riff.
  construction: {
    bpm: 112,
    swing: 0,
    chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A'],
    lead: 'D4 - - - A4 - F4 - | D4 - - - C5 - A4 - | Bb4 - - - F4 - D4 - | C5 - - - E4 - G4 - | D5 - - - A4 - D5 F5 | E5 - D5 - C5 - A4 - | Bb4 - D5 - F5 - D5 - | C#5 - E5 - A5 - - -',
    leadDuty: 2,
    arpDuty: 1,
    bass: 'half',
    arp: 'stab',
    drums: 'k.......s.......k.k.....s.....hh',
  },
  // Dark, industrial warehouse pulse.
  warehouse: {
    bpm: 124,
    swing: 0,
    chords: ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G'],
    lead: 'C5 - . Eb5 . G5 . Eb5 | C5 - . G4 . Bb4 C5 . | Ab4 - . C5 . Eb5 . C5 | Bb4 - . D5 . F5 . D5 | G5 - Eb5 - C5 - G4 - | Eb5 - D5 - C5 - Bb4 - | Ab4 - C5 - F5 - Ab5 - | G5 - F5 - D5 - B4 -',
    leadDuty: 0,
    arpDuty: 0,
    bass: 'chug',
    arp: 'arp16',
    drums: 'k.h.X.h.k.h.X.ho',
  },
  // Sea shanty in 6/8 feel: rolling, swung, a bit drunk.
  docks: {
    bpm: 132,
    swing: 0.28,
    chords: ['Dm', 'Dm', 'C', 'C', 'Dm', 'Dm', 'A', 'Dm'],
    lead: 'A4 - D5 - D5 E5 F5 - | E5 - D5 - C5 - A4 - | G4 - C5 - C5 D5 E5 - | D5 - C5 - A4 - G4 - | A4 - D5 - D5 E5 F5 G5 | A5 - G5 - F5 - D5 - | E5 - C#5 - A4 - E5 - | D5 - - - . . . .',
    leadDuty: 1,
    arpDuty: 2,
    bass: 'octave',
    arp: 'stab',
    drums: 'k..s..k..s..k.hs',
  },
  // Grand overture: brassy fanfare with a waltzing bass.
  theatre: {
    bpm: 144,
    swing: 0,
    chords: ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'Eb', 'F'],
    lead: 'Bb4 - D5 - F5 - Bb5 - | A5 - F5 - C5 - A4 - | G4 - Bb4 - D5 - G5 - | G5 - F5 - Eb5 - Bb4 - | D5 F5 Bb5 - A5 - F5 - | C5 - F5 - A5 - C6 - | Bb5 - G5 - Eb5 - G5 - | F5 - - - F5 - . .',
    leadDuty: 2,
    arpDuty: 1,
    bass: 'octave',
    arp: 'arp16',
    drums: 'k...s.s.k...s.hh',
  },
  // Lift-music lounge jazz, very polite.
  hotel: {
    bpm: 104,
    swing: 0.22,
    chords: ['Fmaj7', 'Em7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'G7'],
    lead: 'A4 - C5 - E5 - . D5 | E5 - - - G4 - B4 - | F4 - A4 - C5 - D5 - | B4 - - - . . G4 - | A4 C5 E5 - G5 - E5 - | D5 - B4 - G4 - B4 - | C5 - A4 - F4 - A4 - | G4 - - - . . . .',
    leadDuty: 1,
    arpDuty: 2,
    bass: 'walk',
    arp: 'stab',
    drums: 'k..h..h.k..h..hh',
  },
  // Beeping monitors and a nervous, quick pulse.
  hospital: {
    bpm: 140,
    swing: 0,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E'],
    lead: 'E5 . . E5 . . A5 . | F5 . . C5 . . A4 . | G5 . . E5 . . C5 . | D5 . . B4 . . G4 . | A5 - G5 - E5 - C5 - | F5 - E5 - C5 - A4 - | B4 - G#4 - E4 - G#4 - | B4 - - - E5 - . .',
    leadDuty: 0,
    arpDuty: 0,
    bass: 'chug',
    arp: 'arp16',
    drums: 'k.h.s.h.k.h.s.hh',
  },
  // Stately baroque minuet, echoing in marble halls.
  museum: {
    bpm: 118,
    swing: 0,
    chords: ['Gm', 'D', 'Gm', 'Cm', 'Gm', 'D', 'Eb', 'D'],
    lead: 'G4 - Bb4 - D5 - G5 - | F#5 - D5 - A4 - F#4 - | G4 - D5 - Bb4 - G4 - | C5 - Eb5 - G5 - Eb5 - | D5 - G5 - Bb5 - A5 G5 | F#5 - A5 - D5 - F#5 - | G5 - Eb5 - C5 - Bb4 - | A4 - F#4 - D4 - . .',
    leadDuty: 2,
    arpDuty: 1,
    bass: 'half',
    arp: 'arp16',
    drums: 'k.......s.......',
  },
  // Departure-lounge synth-pop with a PA-chime hook.
  airport: {
    bpm: 128,
    swing: 0,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'],
    lead: 'E5 - C5 - G5 - - - | E5 - A4 - C5 - E5 - | F5 - A5 - C6 - A5 - | G5 - D5 - B4 - G4 - | C6 - B5 - G5 - E5 - | A5 - G5 - E5 - C5 - | D5 - F5 - A5 - F5 - | G5 - - - . . . .',
    leadDuty: 2,
    arpDuty: 0,
    bass: 'octave',
    arp: 'arp16',
    drums: 'k.hks.h.k.hks.ho',
  },
  // Crypto Bros (08), a green hour: four-on-the-floor euphoria climbing "to the moon".
  'trading-floor': {
    bpm: 140,
    swing: 0,
    chords: ['A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'E'],
    lead: 'A4 . C#5 E5 A5 - E5 C#5 | B4 . E5 G#5 B5 - G#5 E5 | C#5 . F#5 A5 C#6 - A5 F#5 | D5 - F#5 - A5 - F#5 D5 | E5 - A5 - C#6 - E6 - | D6 - B5 G#5 E5 - G#5 B5 | A5 - F#5 D5 A4 - D5 F#5 | E5 - G#5 - B5 - E6 -',
    leadDuty: 2,
    arpDuty: 0,
    bass: 'octave',
    arp: 'arp16',
    drums: 'k.o.X.o.k.o.X.oh',
  },
  // A red hour: the same floor, everything heading down.
  'trading-floor-bear': {
    bpm: 112,
    swing: 0.06,
    chords: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'E7'],
    lead: 'E5 - - D5 C5 - B4 - | C5 - A4 - F4 - A4 - | D5 - - C5 A4 - F4 - | G#4 - B4 - E5 - - . | A5 - G5 - E5 - C5 - | F5 - E5 - C5 - A4 - | D5 - F5 - A5 - G5 F5 | E5 - G#4 - B4 - . .',
    leadDuty: 1,
    arpDuty: 2,
    bass: 'half',
    arp: 'stab',
    drums: 'k...s..kk...s.h.',
  },
};

export function arenaSong(arenaId: string): SongId {
  const id = arenaId.replace('arena.', '') as SongId;
  return id in SONGS ? id : 'menu';
}

// ---------------------------------------------------------------------------
// Score → steps
// ---------------------------------------------------------------------------
const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(tok: string): number | null {
  const m = /^([A-G])(#|b)?(\d)$/.exec(tok);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** Chord symbol → root pitch class and intervals. */
function chord(sym: string): { root: number; iv: number[] } {
  const m = /^([A-G])(#|b)?(.*)$/.exec(sym)!;
  const root = NOTE[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const q = m[3] ?? '';
  const iv = q.startsWith('m7')
    ? [0, 3, 7, 10]
    : q.startsWith('maj7')
      ? [0, 4, 7, 11]
      : q.startsWith('m')
        ? [0, 3, 7, 12]
        : q.startsWith('7')
          ? [0, 4, 7, 10]
          : q.startsWith('dim')
            ? [0, 3, 6, 9]
            : [0, 4, 7, 12];
  return { root: (root + 12) % 12, iv };
}

/** A note on a step: pitch and length in steps (16ths). */
interface Ev {
  n: number;
  len: number;
  vel: number;
}

interface Track {
  steps: number;
  lead: (Ev | null)[];
  arp: (Ev | null)[];
  bass: (Ev | null)[];
  drums: string[];
}

function build(song: Song): Track {
  const bars = song.chords.length;
  const steps = bars * 16;
  const lead: (Ev | null)[] = new Array(steps).fill(null);
  const arp: (Ev | null)[] = new Array(steps).fill(null);
  const bass: (Ev | null)[] = new Array(steps).fill(null);
  // Lead: eighth-note tokens.
  const toks = song.lead
    .split('|')
    .flatMap((b) => b.trim().split(/\s+/))
    .filter(Boolean);
  toks.forEach((t, i) => {
    const n = midi(t);
    if (n === null) return;
    let len = 2;
    for (let j = i + 1; j < toks.length && toks[j] === '-'; j++) len += 2;
    lead[i * 2] = { n: n + (song.transpose ?? 0), len, vel: 1 };
  });
  song.chords.forEach((sym, bar) => {
    const { root, iv } = chord(sym);
    const b0 = bar * 16;
    const r2 = 36 + root; // bass octave (C2 = 36)
    const put = (s: number, n: number, len: number, vel = 1) => (bass[b0 + s] = { n, len, vel });
    switch (song.bass) {
      case 'octave':
        for (let s = 0; s < 16; s += 2) put(s, r2 + (s % 4 === 2 ? 12 : 0), 2);
        break;
      case 'walk': {
        const walk = [0, iv[1]!, 7, iv[1] === 3 ? 10 : 9];
        for (let q = 0; q < 4; q++) put(q * 4, r2 + walk[q]!, 3);
        break;
      }
      case 'chug':
        for (let s = 0; s < 16; s++) put(s, r2 + (s === 14 ? 7 : s === 15 ? 12 : 0), 1, s % 4 === 0 ? 1 : 0.7);
        break;
      case 'half':
        put(0, r2, 7);
        put(8, r2 + 7, 4);
        put(12, r2 + 12, 4);
        break;
      case 'funk':
        for (const [s, k, l] of [
          [0, 0, 2],
          [3, 12, 1],
          [6, 0, 2],
          [8, 7, 2],
          [10, 12, 1],
          [14, iv[3] ?? 10, 2],
        ] as const)
          put(s, r2 + k, l);
        break;
    }
    const a4 = 60 + root;
    if (song.arp === 'arp16') for (let s = 0; s < 16; s++) arp[b0 + s] = { n: a4 + iv[s % iv.length]! + (s % 8 >= 4 ? 12 : 0) - 12, len: 1, vel: 0.55 };
    else if (song.arp === 'stab') for (const s of [2, 6, 10, 14]) arp[b0 + s] = { n: a4 + (s % 8 === 2 ? iv[1]! : iv[2]!) - 12, len: 1, vel: 0.6 };
  });
  const drums: string[] = [];
  for (let s = 0; s < steps; s++) drums.push(song.drums[s % song.drums.length]!);
  return { steps, lead, arp, bass, drums };
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
const ON_KEY = 'cc.music';

function readOn(): boolean {
  try {
    return window.localStorage.getItem(ON_KEY) !== '0';
  } catch {
    return true;
  }
}

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/**
 * Short musical cues over the song (or after it ends): a fight's count-in, a
 * boss's entrance, gatecrashers bursting in, sudden death, and the result.
 * Lead and bass parts as "note:sixteenths" tokens ("." rests); `drums` uses
 * the song drum letters, one per sixteenth.
 */
export type StingId = 'start' | 'boss' | 'crash' | 'suddenDeath' | 'win' | 'lose' | 'draw' | 'ko' | 'newsIdent' | 'newsHandoff' | 'testTone';
interface Sting {
  bpm: number;
  lead: string;
  bass?: string;
  drums?: string;
  duty: 0 | 1 | 2;
  /** How far the song ducks under the cue (0 = silent, 1 = unchanged). */
  duck: number;
}
const STINGS: Record<StingId, Sting> = {
  // "Ready… FIGHT!": three rising beeps and a bright hit.
  start: { bpm: 150, lead: 'C5:4 .:4 C5:4 .:4 G5:4 .:4 C6:8', bass: 'C3:4 .:4 C3:4 .:4 G2:4 .:4 C3:8', drums: 'k...k...k...X.......', duty: 1, duck: 0.15 },
  // Ominous descending minor line under a low drone.
  boss: { bpm: 96, lead: 'A4:2 Ab4:2 G4:2 F#4:2 F4:6 E4:2 F4:2 E4:4', bass: 'A2:12 E2:10', drums: 'k.......k.......k...X.', duty: 0, duck: 0.1 },
  // Siren-style alternating riff with a snare roll: they're here.
  crash: { bpm: 168, lead: 'E5:2 B4:2 E5:2 B4:2 E5:2 B4:2 G5:4 F#5:2 E5:6', bass: 'E3:4 E3:4 E3:4 G2:2 B2:6', drums: 'k.s.k.s.ssssX.......', duty: 2, duck: 0.12 },
  // Tense chromatic climb.
  suddenDeath: { bpm: 132, lead: 'C5:2 C#5:2 D5:2 D#5:2 E5:2 F5:2 F#5:2 G5:6', bass: 'C3:8 G2:8', drums: 'k.k.k.k.k.k.X...', duty: 1, duck: 0.25 },
  // Victory fanfare.
  win: { bpm: 140, lead: 'G4:2 C5:2 E5:2 G5:4 E5:2 G5:8 .:2 A5:2 B5:2 C6:12', bass: 'C3:6 C3:6 G2:8 F2:4 G2:4 C3:12', drums: 'k...s...k...s...k.k.s...X...........', duty: 2, duck: 0 },
  // Sad trombone, chiptune edition.
  lose: { bpm: 84, lead: 'G4:3 F#4:3 F4:3 E4:12', bass: 'C3:3 B2:3 Bb2:3 A2:12', duty: 0, duck: 0 },
  // A shrug: two notes that don't resolve.
  draw: { bpm: 110, lead: 'E5:4 D5:4 E5:4 D5:8', bass: 'C3:8 G2:12', duty: 1, duck: 0 },
  // Short punctuation for a knockout.
  ko: { bpm: 180, lead: 'G5:2 E5:2 C5:6', drums: 'X.......', duty: 2, duck: 0.4 },
  // Broken News (10): the BSN ident. A timpani roll, then "BAH-ba-ba BAAAAH".
  newsIdent: { bpm: 120, lead: '.:8 D5:2 D5:1 D5:1 A5:4 F#5:2 D6:14', bass: '.:8 D3:4 A2:4 D3:14', drums: 'kkkkkkkkX.......X.............', duty: 2, duck: 0 },
  // "This week on Broken News": a rising arpeggio and a hit.
  newsHandoff: { bpm: 140, lead: 'A4:2 D5:2 F#5:2 A5:2 D6:8', bass: 'D3:8 D3:8', drums: 'k.k.k.k.X.......', duty: 1, duck: 0.2 },
  // The colour bars' test tone: one flat, endless beep.
  testTone: { bpm: 120, lead: 'A5:24', duty: 2, duck: 0 },
};

function stingNotes(part: string): { n: number | null; len: number }[] {
  return part.split(/\s+/).filter(Boolean).map((tok) => {
    const [note, len] = tok.split(':');
    return { n: note === '.' ? null : midi(note!), len: Number(len ?? 1) };
  });
}

export class Music {
  private ctx: BaseAudioContext | null = null;
  private out: GainNode | null = null;
  private waves: PeriodicWave[] = [];
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private song: SongId | null = null;
  private track: Track | null = null;
  private def: Song | null = null;
  private step = 0;
  private next = 0;
  private tempo = 1;
  private finished = false;
  enabled = readOn();

  /** Create/resume the audio context (call from a user gesture). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.setup(new AC());
      }
      const live = this.ctx as AudioContext;
      if (live.state === 'suspended') void live.resume();
      if (this.song && this.enabled && this.timer === null) this.start();
    } catch {
      this.ctx = null;
    }
  }

  private setup(ctx: BaseAudioContext): void {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    this.out.connect(comp).connect(ctx.destination);
    // Pulse waves at the 2A03's duty cycles: 12.5%, 25%, 50%.
    this.waves = [0.125, 0.25, 0.5].map((d) => {
      const N = 32;
      const re = new Float32Array(N);
      const im = new Float32Array(N);
      for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
      return ctx.createPeriodicWave(re, im);
    });
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    // Blocky noise (sample-and-hold) sounds more like the NES noise channel than smooth white noise.
    let v = 0;
    for (let i = 0; i < len; i++) {
      if (i % 3 === 0) v = Math.random() * 2 - 1;
      data[i] = v;
    }
  }

  /** Render `seconds` of a song offline (previews, tests); `tempo(p)` gives the speed at fraction p. */
  async renderOffline(id: SongId, seconds: number, tempo: (p: number) => number = () => 1): Promise<AudioBuffer> {
    const ctx = new OfflineAudioContext(1, Math.round(44100 * seconds), 44100);
    this.setup(ctx);
    this.out!.gain.value = 0.22;
    this.def = SONGS[id];
    this.track = build(this.def);
    let t = 0.05;
    let step = 0;
    while (t < seconds - 0.3) {
      const dur = 60 / (this.def.bpm * tempo(t / seconds)) / 4;
      this.playStep(step, t + (step % 2 === 1 ? this.def.swing * dur : 0), dur);
      t += dur;
      step = (step + 1) % this.track.steps;
    }
    return ctx.startRendering();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      window.localStorage.setItem(ON_KEY, on ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    if (on) {
      this.unlock();
      if (this.song && !this.finished) this.start();
    } else this.halt(250);
  }

  /** Play a song (no-op if it's already playing). */
  play(id: SongId): void {
    if (this.song === id && !this.finished && this.timer !== null) return;
    const changed = this.song !== id;
    this.song = id;
    this.finished = false;
    if (changed) {
      this.def = SONGS[id];
      this.track = build(this.def);
      this.step = 0;
      this.tempo = 1;
    }
    if (this.enabled && this.ctx) {
      this.halt(changed ? 120 : 0);
      this.start();
    }
  }

  /** Tempo multiplier (1 = written tempo); eased so it never jumps. */
  setTempo(mul: number): void {
    this.tempo += (mul - this.tempo) * 0.1;
  }

  /**
   * Play a short cue (see STINGS) over whatever's playing, ducking the song
   * for its length, or on its own after the song has finished.
   */
  sting(id: StingId): void {
    if (!this.enabled || !this.ctx || !this.out || (this.ctx as AudioContext).state !== 'running') return;
    const ctx = this.ctx;
    const st = STINGS[id];
    const sx = 60 / st.bpm / 4;
    const t0 = ctx.currentTime + 0.03;
    // Its own output, so it plays even when the song has faded out.
    const out = this.out;
    const saved = out;
    const sOut = ctx.createGain();
    // A touch louder than the song (which plays at 0.22).
    sOut.gain.value = 0.3;
    sOut.connect(ctx.destination);
    this.out = sOut;
    let end = t0;
    const part = (spec: string | undefined, wave: PeriodicWave | 'triangle', vol: number) => {
      let t = t0;
      for (const { n, len } of stingNotes(spec ?? '')) {
        if (n !== null) this.tone(wave, n, t, len * sx * 0.95, vol, len >= 8);
        t += len * sx;
      }
      end = Math.max(end, t);
    };
    part(st.lead, this.waves[st.duty]!, 0.15);
    part(st.bass, 'triangle', 0.26);
    [...(st.drums ?? '')].forEach((d, i) => {
      const t = t0 + i * sx;
      if (d === 'k' || d === 'X') this.kick(t);
      if (d === 's' || d === 'X') this.hit(t, 'bandpass', 1800, 0.13, 0.22);
    });
    this.out = saved;
    // Duck the song under the cue, then bring it back.
    if (!this.finished && st.duck < 1) {
      const g = out.gain;
      const level = 0.22;
      g.cancelScheduledValues(t0);
      g.setValueAtTime(g.value, t0);
      g.linearRampToValueAtTime(level * st.duck, t0 + 0.06);
      g.setValueAtTime(level * st.duck, end);
      g.linearRampToValueAtTime(level, end + 0.4);
    }
    window.setTimeout(() => sOut.disconnect(), (end - ctx.currentTime + 1) * 1000);
  }

  /** Fade the song out (end of a match); `play` brings it back. */
  finish(fadeMs = 1800): void {
    if (this.finished) return;
    this.finished = true;
    this.halt(fadeMs);
  }

  private start(): void {
    if (!this.ctx || !this.out || !this.track || this.timer !== null) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0.22, t + 0.4);
    this.next = t + 0.08;
    this.timer = window.setInterval(() => this.pump(), 25);
  }

  private halt(fadeMs: number): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (!this.ctx || !this.out) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
  }

  private pump(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track || !this.def) return;
    if (ctx.state !== 'running') return;
    // Fell behind (tab in background): skip ahead rather than burst.
    if (this.next < ctx.currentTime - 0.2) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.12) {
      const dur = 60 / (this.def.bpm * this.tempo) / 4;
      const swing = this.step % 2 === 1 ? this.def.swing * dur : 0;
      this.playStep(this.step, this.next + swing, dur);
      this.next += dur;
      this.step = (this.step + 1) % this.track.steps;
    }
  }

  private playStep(s: number, t: number, dur: number): void {
    const tr = this.track!;
    const d = this.def!;
    const lead = tr.lead[s];
    if (lead) this.tone(this.waves[d.leadDuty]!, lead.n, t, lead.len * dur, 0.16 * lead.vel, lead.len >= 4);
    const arp = tr.arp[s];
    if (arp) this.tone(this.waves[d.arpDuty]!, arp.n, t, arp.len * dur * 0.8, 0.07 * arp.vel, false);
    const bass = tr.bass[s];
    if (bass) this.tone('triangle', bass.n, t, bass.len * dur * 0.92, 0.3 * bass.vel, false);
    const dr = tr.drums[s];
    if (dr === 'k' || dr === 'X') this.kick(t);
    if (dr === 's' || dr === 'X') this.hit(t, 'bandpass', 1800, 0.13, 0.22);
    if (dr === 'h') this.hit(t, 'highpass', 7000, 0.03, 0.08);
    if (dr === 'o') this.hit(t, 'highpass', 6000, 0.12, 0.07);
  }

  private tone(wave: PeriodicWave | 'triangle', n: number, t: number, len: number, vol: number, vibrato: boolean): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    if (wave === 'triangle') o.type = 'triangle';
    else o.setPeriodicWave(wave);
    o.frequency.value = hz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.setValueAtTime(vol * 0.8, t + Math.min(len * 0.5, 0.08));
    g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(g).connect(this.out!);
    if (vibrato) {
      // Delayed vibrato on held notes, NES-style.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(hz(n) * 0.012, t + Math.min(len, 0.35));
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + len + 0.02);
    }
    o.start(t);
    o.stop(t + len + 0.02);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    o.connect(g).connect(this.out!);
    o.start(t);
    o.stop(t + 0.13);
  }

  private hit(t: number, type: BiquadFilterType, f: number, len: number, vol: number): void {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(flt).connect(g).connect(this.out!);
    s.start(t, Math.random() * 0.5);
    s.stop(t + len + 0.01);
  }
}

/** Speed-up towards the end of a match: from 60% of the way through up to +30%. */
export function matchTempo(tick: number, total: number): number {
  const p = total > 0 ? tick / total : 0;
  const k = Math.max(0, Math.min(1, (p - 0.6) / 0.4));
  return 1 + 0.3 * k * k * (3 - 2 * k);
}

/** One music player for the whole app, unlocked on the first tap or key press. */
export const music = new Music();
if (typeof window !== 'undefined') {
  const unlock = () => music.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}
