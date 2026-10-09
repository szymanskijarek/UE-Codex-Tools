/**
 * Synthesised gibberish voices for speech bubbles — Simlish-style babble, no
 * assets. A line is turned into syllables from its own letters (so the same
 * line always "sounds" the same), and each syllable drives a buzzy glottal
 * source through three vowel formant filters, with little noise bursts for
 * consonants. A handful of voice types (deep, gravelly, mid, bright, squeaky
 * and a mime's whisper) plus per-character pitch and personality-driven pace
 * keep a squad distinguishable.
 */
export type VoiceType = 'deep' | 'gravel' | 'mid' | 'bright' | 'squeaky' | 'whisper';

/**
 * What a voice does to the words (Crypto Bros, 08): a dog barks every word, a
 * small dog yips, a frog croaks "ribbit", a voice changer goes robotic, and
 * auto-tune snaps every syllable to a pentatonic note.
 */
export type VoiceFx = 'bark' | 'yip' | 'croak' | 'robot' | 'autotune';

export interface Voice {
  type: VoiceType;
  /** Pitch multiplier (per character). */
  pitch: number;
  /** Speaking-rate multiplier (personality). */
  speed: number;
  /** Loudness multiplier. */
  loud: number;
  /** Intonation range multiplier (chaotic characters swoop about). */
  range: number;
  fx?: VoiceFx;
}

/** A content override (a market member's `voice`) on top of the voice their career gives them. */
export function withVoice(v: Voice, over: { type?: VoiceType; pitch?: number; speed?: number; fx?: VoiceFx } | undefined): Voice {
  if (!over) return v;
  return { ...v, type: over.type ?? v.type, pitch: v.pitch * (over.pitch ?? 1), speed: v.speed * (over.speed ?? 1), fx: over.fx ?? v.fx };
}

interface VoiceParams {
  f0: number;
  formant: number;
  syll: number;
  creak: number;
  vibrato: number;
  wave: OscillatorType;
  /** Level trim so every type sits at about the same loudness. */
  gain: number;
}

const PARAMS: Record<VoiceType, VoiceParams> = {
  deep: { f0: 92, formant: 0.86, syll: 0.075, creak: 0, vibrato: 0.012, wave: 'sawtooth', gain: 1 },
  gravel: { f0: 108, formant: 0.9, syll: 0.07, creak: 0.55, vibrato: 0.008, wave: 'sawtooth', gain: 1.4 },
  mid: { f0: 138, formant: 1, syll: 0.065, creak: 0, vibrato: 0.015, wave: 'sawtooth', gain: 1.05 },
  bright: { f0: 215, formant: 1.14, syll: 0.06, creak: 0, vibrato: 0.02, wave: 'sawtooth', gain: 1 },
  squeaky: { f0: 340, formant: 1.3, syll: 0.05, creak: 0, vibrato: 0.035, wave: 'triangle', gain: 0.5 },
  whisper: { f0: 0, formant: 1.05, syll: 0.06, creak: 0, vibrato: 0, wave: 'sawtooth', gain: 1 },
};

/** Voice type per career, chosen to match the character art. */
const CAREER_VOICE: Record<string, VoiceType> = {
  builder: 'deep',
  electrician: 'deep',
  farmer: 'deep',
  chef: 'deep',
  'police-officer': 'deep',
  'personal-trainer': 'deep',
  'taxi-driver': 'gravel',
  'conspiracy-podcaster': 'gravel',
  politician: 'gravel',
  'food-critic': 'gravel',
  accountant: 'mid',
  astronaut: 'mid',
  dentist: 'mid',
  dj: 'mid',
  firefighter: 'mid',
  lawyer: 'mid',
  lifeguard: 'mid',
  mechanic: 'mid',
  programmer: 'mid',
  'tv-host': 'mid',
  plumber: 'squeaky',
  barista: 'bright',
  gardener: 'bright',
  hairdresser: 'bright',
  influencer: 'squeaky',
  journalist: 'bright',
  librarian: 'bright',
  'life-coach': 'bright',
  psychologist: 'bright',
  teacher: 'bright',
  paramedic: 'bright',
  mime: 'whisper',
  archaeologist: 'bright',
  baker: 'deep',
  beekeeper: 'mid',
  'bus-driver': 'gravel',
  carpenter: 'deep',
  'chimney-sweep': 'bright',
  clown: 'squeaky',
  'dog-groomer': 'bright',
  'fashion-designer': 'bright',
  'flight-attendant': 'bright',
  florist: 'bright',
  'fortune-teller': 'whisper',
  'hotel-concierge': 'mid',
  'ice-cream-vendor': 'bright',
  magician: 'mid',
  'marine-biologist': 'mid',
  'museum-curator': 'gravel',
  nurse: 'bright',
  painter: 'mid',
  photographer: 'mid',
  'postal-worker': 'mid',
  sailor: 'gravel',
  scientist: 'mid',
  tailor: 'mid',
  'tattoo-artist': 'gravel',
  'train-conductor': 'gravel',
  veterinarian: 'bright',
  welder: 'deep',
  'window-cleaner': 'bright',
  zookeeper: 'deep',
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A character's voice from their career (look), identity (pitch) and personality (pace). */
export function voiceFor(careerSlug: string, id: string, personality: string, referee = false): Voice {
  const h = hashStr(id || careerSlug);
  const fallback: VoiceType[] = ['deep', 'mid', 'mid', 'bright', 'gravel'];
  const type: VoiceType = referee ? 'gravel' : (CAREER_VOICE[careerSlug] ?? fallback[h % fallback.length]!);
  const v: Voice = { type, pitch: 0.92 + ((h >>> 5) % 17) / 100, speed: 1, loud: 1, range: 1 };
  switch (personality) {
    case 'personality.aggressive':
      v.speed = 1.12;
      v.loud = 1.2;
      v.pitch *= 0.96;
      break;
    case 'personality.lazy':
      v.speed = 0.78;
      v.loud = 0.85;
      v.range = 0.6;
      break;
    case 'personality.coward':
    case 'personality.paranoid':
      v.speed = 1.22;
      v.pitch *= 1.08;
      v.range = 1.3;
      break;
    case 'personality.confident':
    case 'personality.competitive':
      v.loud = 1.15;
      v.speed = 0.95;
      break;
    case 'personality.chaotic':
      v.range = 1.8;
      v.speed = 1.1;
      break;
  }
  return v;
}

// Vowel formants (Hz): F1, F2, F3.
const VOWELS: Record<string, [number, number, number]> = {
  a: [760, 1250, 2500],
  e: [520, 1850, 2550],
  i: [310, 2250, 2950],
  o: [560, 900, 2450],
  u: [330, 880, 2250],
  y: [480, 1550, 2500],
};

interface Syllable {
  onset: string;
  vowel: string;
  wordStart: boolean;
  wordEnd: boolean;
  pause: number;
}

function syllables(text: string, max: number): Syllable[] {
  const out: Syllable[] = [];
  const words = text.toLowerCase().match(/[a-z']+[,.!?…]*/g) ?? [];
  for (const w of words) {
    const letters = w.replace(/[^a-z]/g, '');
    const parts = letters.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+$)?/g) ?? (letters ? [letters + 'a'] : []);
    parts.forEach((p, i) => {
      const onset = /^[^aeiouy]*/.exec(p)![0];
      const vowel = p[onset.length] ?? 'a';
      out.push({ onset, vowel, wordStart: i === 0, wordEnd: i === parts.length - 1, pause: i === parts.length - 1 ? (/[,.!?…]$/.test(w) ? 0.09 : 0.015) : 0 });
    });
  }
  if (out.length <= max) return out;
  // Long lines: keep the start and the end, the listener only needs the shape.
  const head = out.slice(0, max - 3);
  head[head.length - 1]!.pause = 0.05;
  return [...head, ...out.slice(-3)];
}

/** Cheap deterministic RNG from a string. */
function rng(seed: string): () => number {
  let s = hashStr(seed) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

/** One sound unit of an utterance: an optional consonant, then a vowel held for `dur` seconds. */
interface Note {
  onset: string;
  vowel: string;
  /** Vowel it glides to by the end (screams: "aaa-eee"). */
  vowel2?: string;
  dur: number;
  /** Pitch relative to the voice's base at the start and end of the vowel. */
  pitch: number;
  pitch2: number;
  gain: number;
  /** Start from silence (word start) and end in silence (word end). */
  hardStart: boolean;
  hardEnd: boolean;
  pause: number;
}

/** Major pentatonic steps over two octaves (auto-tune), or just two notes (a robot). */
const PENTA = [0.5, 0.5625, 0.625, 0.75, 0.8333, 1, 1.125, 1.25, 1.5, 1.6667, 2, 2.25, 2.5];
const ROBOT = [0.9, 1, 1.12];
function snapPitch(p: number, robot: boolean): number {
  const steps = robot ? ROBOT : PENTA;
  return steps.reduce((best, s) => (Math.abs(Math.log(s / p)) < Math.abs(Math.log(best / p)) ? s : best), steps[0]!);
}

/**
 * Animal "words": one bark, yip or ribbit per word of the line, so a dog bro
 * still barks longer for a longer post. Shouts become a big bark, a whimper or
 * a howl.
 */
function animalNotes(fx: 'bark' | 'yip' | 'croak', words: number, R: () => number, exclaim: boolean): Note[] {
  const out: Note[] = [];
  const n = Math.min(7, Math.max(1, words));
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const lift = (exclaim ? 1.12 : 1) * (0.94 + R() * 0.14);
    const gap = 0.06 + R() * 0.07 + (last ? 0 : R() < 0.25 ? 0.12 : 0);
    if (fx === 'croak') {
      // "rib-bit": two short throaty bumps, or now and then one long "croooak".
      if (R() < 0.3) out.push({ onset: 'kr', vowel: 'o', vowel2: 'a', dur: 0.2, pitch: 0.62 * lift, pitch2: 0.5 * lift, gain: 1.1, hardStart: true, hardEnd: true, pause: gap });
      else {
        out.push({ onset: 'r', vowel: 'i', dur: 0.07, pitch: 0.7 * lift, pitch2: 0.66 * lift, gain: 1, hardStart: true, hardEnd: true, pause: 0.025 });
        out.push({ onset: 'b', vowel: 'i', vowel2: 'u', dur: 0.09, pitch: 0.66 * lift, pitch2: 0.55 * lift, gain: 1.05, hardStart: true, hardEnd: true, pause: gap });
      }
    } else if (fx === 'yip') {
      out.push({ onset: 'y', vowel: 'i', vowel2: 'a', dur: 0.055, pitch: 2.1 * lift, pitch2: 1.6 * lift, gain: 1, hardStart: true, hardEnd: true, pause: gap * 0.6 });
    } else {
      // "WOOF" / "ARF": a sharp attack, the jaw opening then closing, falling pitch.
      const ruff = R() < 0.4;
      out.push({ onset: ruff ? 'r' : 'wh', vowel: ruff ? 'a' : 'u', vowel2: ruff ? 'u' : 'o', dur: 0.1 + R() * 0.04, pitch: 1.75 * lift, pitch2: 1.05 * lift, gain: 1.15, hardStart: true, hardEnd: true, pause: gap });
    }
  }
  return out;
}

const ANIMAL_ROUGH = { bark: 0.5, yip: 0.25, croak: 0.85 } as const;
/** Level trim per effect, so a croak sits as loud as a sentence. */
const FX_GAIN: Record<VoiceFx, number> = { bark: 0.85, yip: 1.5, croak: 2, robot: 1, autotune: 1 };

function animalShout(fx: 'bark' | 'yip' | 'croak', kind: Shout, k: number): Note[] {
  const n = (vowel: string, dur: number, pitch: number, pitch2: number, gain = 1, onset = '', vowel2?: string, pause = 0): Note => ({ onset, vowel, vowel2, dur, pitch, pitch2, gain, hardStart: true, hardEnd: true, pause });
  const base = fx === 'croak' ? 0.6 : fx === 'yip' ? 1.9 : 1.6;
  switch (kind) {
    case 'ouch': // a yelp
      return [n('i', 0.12, base * 1.5, base * 1.1, 1.1, 'y', 'u')];
    case 'wail': // a howl, or the long sad croak
      return fx === 'croak' ? [n('o', 0.6, 0.7, 0.42, 1.1, 'kr', 'u')] : [n('a', 0.15, base * 0.8, base * 1.15, 0.9, 'w', 'o'), n('u', 0.75, base * 1.15, base * 0.6, 1.1, '', 'o')];
    case 'scream': // whimper-yelps all the way across the room
      return [0, 1, 2].map((i) => n('i', 0.1, base * (1.6 - i * 0.12), base * (1.2 - i * 0.12), 1.1, 'y', 'u', 0.05));
    case 'grunt':
    case 'gasp':
      return [n('u', 0.08, base * 0.7, base * 0.6, 0.8, 'h')];
    case 'cheer': // happy barking
      return [0, 1, 2].map((i) => n('a', 0.08, base * (1.1 + i * 0.1), base * (0.9 + i * 0.1), 1.1, 'r', 'u', 0.06));
    case 'yell':
    default: // one big BARK (twice for k=2)
      return k === 2 ? [n('a', 0.1, base * 1.1, base * 0.8, 1.2, 'r', 'u', 0.07), n('a', 0.14, base * 1.15, base * 0.75, 1.25, 'r', 'u')] : [n('a', 0.16, base * 1.15, base * 0.7, 1.3, fx === 'croak' ? 'kr' : 'wh', 'u')];
  }
}

/** Schedule a list of notes in one voice; returns the length in seconds. */
function utter(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, voice: Voice, notes: Note[], at: number, rate: number, seed: string, opts: { vibrato?: number; rough?: number; breath?: number } = {}): number {
  if (notes.length === 0) return 0;
  const P = PARAMS[voice.type];
  const R = rng(seed);
  const f0 = P.f0 * voice.pitch * rate;
  const robot = voice.fx === 'robot';
  const tuned = voice.fx === 'autotune' || robot;
  const fs = P.formant * (0.97 + (voice.pitch - 1) * 0.5) * (rate < 1 ? 0.85 : 1);

  // Source → amplitude envelope → (creak) → three parallel formant filters → out.
  const amp = ctx.createGain();
  amp.gain.value = 0;
  let src: AudioScheduledSourceNode;
  let osc: OscillatorNode | null = null;
  if (voice.type === 'whisper') {
    const n = ctx.createBufferSource();
    n.buffer = noise;
    n.loop = true;
    src = n;
  } else {
    osc = ctx.createOscillator();
    osc.type = robot ? 'square' : P.wave;
    osc.frequency.value = f0 * notes[0]!.pitch;
    src = osc;
  }
  src.connect(amp);
  let chain: AudioNode = amp;
  const extras: AudioScheduledSourceNode[] = [];
  const creakAmt = Math.min(0.9, P.creak + (opts.rough ?? 0));
  if (creakAmt > 0) {
    // Vocal fry / a ragged scream: fast amplitude flutter.
    const creak = ctx.createGain();
    creak.gain.value = 1 - creakAmt * 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = (opts.rough ? 55 : 38) * rate;
    const depth = ctx.createGain();
    depth.gain.value = creakAmt * 0.5;
    lfo.connect(depth).connect(creak.gain);
    amp.connect(creak);
    chain = creak;
    extras.push(lfo);
  }
  if (robot) {
    // Voice changer: ring-modulate the whole voice for that tin-can buzz.
    const ring = ctx.createGain();
    ring.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 62 * rate;
    lfo.connect(ring.gain);
    chain.connect(ring);
    chain = ring;
    extras.push(lfo);
  }
  const vibAmt = robot ? 0 : (opts.vibrato ?? P.vibrato);
  if (osc && vibAmt > 0) {
    const vib = ctx.createOscillator();
    vib.frequency.value = (opts.vibrato ? 9 : 5.5) + R() * 1.5;
    const depth = ctx.createGain();
    depth.gain.value = f0 * vibAmt;
    vib.connect(depth).connect(osc.frequency);
    extras.push(vib);
  }
  const out = ctx.createGain();
  out.gain.value = (voice.type === 'whisper' ? 1.6 : 1) * P.gain * voice.loud * (voice.fx ? FX_GAIN[voice.fx] : 1);
  out.connect(dest);
  const filters = [0, 1, 2].map((k) => {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = [6, 9, 11][k]!;
    const g = ctx.createGain();
    g.gain.value = [1.6, 1.0, 0.45][k]!;
    chain.connect(f).connect(g).connect(out);
    return f;
  });
  if (voice.type !== 'whisper') {
    // A little of the raw source for body.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500 * fs;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    chain.connect(lp).connect(g).connect(out);
  }

  const burst = (t: number, type: BiquadFilterType, freq: number, dur: number, peak: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq * rate;
    f.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak * voice.loud, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, R() * 0.5);
    s.stop(t + dur + 0.02);
  };
  if (opts.breath) burst(at, 'bandpass', 1400, 0.08, opts.breath);

  let t = at;
  for (const n of notes) {
    const on = n.onset.slice(-2);
    // Consonant onset: a short noise burst, then the vowel.
    let lead = 0;
    if (/[sz]|c(?=[ei])|x/.test(on)) {
      burst(t, 'highpass', 5200, 0.045, 0.05);
      lead = 0.035;
    } else if (/sh|ch|j/.test(on)) {
      burst(t, 'bandpass', 2800, 0.05, 0.06);
      lead = 0.04;
    } else if (/[fvh]|th/.test(on)) {
      burst(t, 'bandpass', 2200, 0.035, 0.03);
      lead = 0.025;
    } else if (/[ptk]|c|q/.test(on)) {
      burst(t + 0.005, 'highpass', 2500, 0.02, 0.09);
      lead = 0.02;
    } else if (/[bdg]/.test(on)) {
      burst(t + 0.003, 'lowpass', 900, 0.015, 0.07);
      lead = 0.012;
    }
    const v0 = t + lead / rate;
    const d = n.dur / rate;
    if (osc && tuned) {
      // Hard steps between notes, no glide: the giveaway of auto-tune (and of a robot).
      osc.frequency.setValueAtTime(f0 * snapPitch(n.pitch, robot), v0);
      if (n.pitch2 !== n.pitch) osc.frequency.setValueAtTime(f0 * snapPitch(n.pitch2, robot), v0 + d * 0.5);
    } else if (osc) {
      osc.frequency.setTargetAtTime(f0 * n.pitch, v0, 0.012);
      if (n.pitch2 !== n.pitch) osc.frequency.setTargetAtTime(f0 * n.pitch2, v0 + d * 0.3, d * 0.35);
    }
    const [F1, F2, F3] = VOWELS[n.vowel] ?? VOWELS.a!;
    const nasal = /[mn]/.test(on) ? 0.75 : 1;
    filters[0]!.frequency.setTargetAtTime(F1 * fs * nasal, v0, 0.01);
    filters[1]!.frequency.setTargetAtTime(F2 * fs, v0, 0.014);
    filters[2]!.frequency.setTargetAtTime(F3 * fs, v0, 0.018);
    if (n.vowel2) {
      const [G1, G2, G3] = VOWELS[n.vowel2] ?? VOWELS.a!;
      filters[0]!.frequency.setTargetAtTime(G1 * fs, v0 + d * 0.4, d * 0.3);
      filters[1]!.frequency.setTargetAtTime(G2 * fs, v0 + d * 0.4, d * 0.3);
      filters[2]!.frequency.setTargetAtTime(G3 * fs, v0 + d * 0.4, d * 0.3);
    }
    const peak = 0.8 * n.gain;
    amp.gain.setValueAtTime(n.hardStart ? 0.0001 : peak * 0.3, v0);
    amp.gain.linearRampToValueAtTime(peak, v0 + Math.min(0.015, d * 0.3));
    amp.gain.linearRampToValueAtTime(peak * 0.8, v0 + d * 0.8);
    amp.gain.linearRampToValueAtTime(n.hardEnd ? 0.0001 : peak * 0.35, v0 + d);
    t = v0 + d + n.pause / rate;
  }
  const end = t + 0.04;
  src.start(at);
  src.stop(end);
  for (const x of extras) {
    x.start(at);
    x.stop(end);
  }
  return end - at;
}

/**
 * Schedule a babbled line on `ctx`, into `dest`. `noise` is a looping white
 * noise buffer. Returns the utterance length in seconds.
 */
/**
 * `fitS`: talk for this many seconds (Broken News times the babble to its
 * speech bubble): every syllable of the line is voiced, not just the first 16,
 * and the syllables and pauses stretch or squeeze to fit, at the same pitch.
 */
export function babble(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, text: string, voice: Voice, at: number, rate = 1, fitS?: number): number {
  const P = PARAMS[voice.type];
  const R = rng(text + voice.type);
  const syl = syllables(text, fitS ? 120 : 16);
  if (syl.length === 0) return 0;
  const exclaim = /!/.test(text);
  if (voice.fx === 'bark' || voice.fx === 'yip' || voice.fx === 'croak') {
    const words = syl.filter((s) => s.wordStart).length;
    return utter(ctx, dest, noise, voice, animalNotes(voice.fx, Math.ceil(words * 0.7), R, exclaim), at, rate, text + voice.fx, { rough: ANIMAL_ROUGH[voice.fx], breath: voice.fx === 'bark' ? 0.04 : 0 });
  }
  const question = /\?\s*$/.test(text);
  const baseDur = P.syll / voice.speed;
  const n = syl.length;
  const notes: Note[] = syl.map((s, i) => {
    const last = i === n - 1;
    const prog = i / Math.max(1, n - 1);
    // Intonation: gentle declination, stressed word starts, a rise for questions.
    let pitch = (exclaim ? 1.12 : 1) * (1 + (0.1 - prog * 0.22) * voice.range + (R() - 0.5) * 0.2 * voice.range + (s.wordStart ? 0.07 : 0));
    let pitch2 = pitch;
    if (last) {
      pitch = question ? 1.3 : exclaim ? 1.25 : 0.88;
      pitch2 = pitch * (question ? 1.25 : 0.82);
    }
    return {
      onset: s.onset,
      vowel: s.vowel,
      dur: baseDur * (0.75 + R() * 0.4) * (s.wordEnd ? 1.1 : 1) * (last ? 1.9 : 1),
      pitch,
      pitch2,
      gain: (exclaim ? 1.15 : 1) * (s.wordStart ? 1 : 0.85) * (0.9 + R() * 0.2),
      hardStart: s.wordStart,
      hardEnd: s.wordEnd,
      pause: s.pause * (0.6 / voice.speed),
    };
  });
  if (fitS) {
    const natural = notes.reduce((t, n) => t + n.dur + n.pause, 0) / rate;
    // utter() adds a little tail (the last syllable's release): aim that much short.
    const k = Math.max(0.45, Math.min(2.2, (fitS * 0.97 - 0.15) / natural));
    for (const n of notes) {
      n.dur *= k;
      n.pause *= k;
    }
  }
  return utter(ctx, dest, noise, voice, notes, at, rate, text + voice.type);
}

/** Wordless outbursts: a battle cry, a hurt "oof", a thrown-through-the-air scream, a KO wail, a cheer. */
export type Shout = 'yell' | 'ouch' | 'scream' | 'wail' | 'cheer' | 'grunt' | 'gasp';

export function shout(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, kind: Shout, voice: Voice, at: number, rate = 1, variant = 0): number {
  const k = variant % 3;
  const n = (vowel: string, dur: number, pitch: number, pitch2: number, gain = 1, onset = '', vowel2?: string): Note => ({ onset, vowel, vowel2, dur, pitch, pitch2, gain, hardStart: true, hardEnd: true, pause: 0 });
  const seed = `${kind}${variant}${voice.type}`;
  if (voice.fx === 'bark' || voice.fx === 'yip' || voice.fx === 'croak') return utter(ctx, dest, noise, voice, animalShout(voice.fx, kind, k), at, rate, seed, { rough: ANIMAL_ROUGH[voice.fx], breath: voice.fx === 'bark' ? 0.05 : 0 });
  switch (kind) {
    case 'yell': // "HYAAH!" / "RAAH!" / "HUP-HAH!"
      return utter(ctx, dest, noise, voice, k === 2 ? [{ ...n('u', 0.07, 1.25, 1.3, 1, 'h'), pause: 0.03 }, n('a', 0.2, 1.45, 1.15, 1.2, 'h')] : [n('a', 0.28, 1.35, 1.6, 1.25, k === 0 ? 'hy' : 'r')], at, rate, seed, { rough: 0.25 });
    case 'ouch': // "OOF" / "AGH" / "OW"
      return utter(ctx, dest, noise, voice, [n(k === 0 ? 'u' : k === 1 ? 'a' : 'a', k === 2 ? 0.2 : 0.14, 1.3, 0.85, 1.1, k === 1 ? '' : '', k === 2 ? 'u' : undefined)], at, rate, seed, { breath: k === 0 ? 0.05 : 0 });
    case 'grunt': // effort: "hnn" / "hup"
      return utter(ctx, dest, noise, voice, [n('u', 0.1, 0.95, 0.9, 0.8, k === 1 ? 'h' : 'hn')], at, rate, seed, { rough: 0.2 });
    case 'gasp':
      return utter(ctx, dest, noise, voice, [n('a', 0.12, 1.5, 1.7, 0.6, 'h')], at, rate, seed, { breath: 0.08 });
    case 'scream': // "AAAAHHH!" rising then falling, ragged
      return utter(ctx, dest, noise, voice, [n('a', 0.7 + k * 0.1, 2.0, 2.4, 1.2, '', k === 1 ? 'e' : undefined)], at, rate, seed, { vibrato: 0.05, rough: 0.35 });
    case 'wail': // KO: long falling "nooooo" / "aaaaah"
      return utter(ctx, dest, noise, voice, [n(k === 0 ? 'o' : 'a', 0.85, 1.6, 0.7, 1.1, k === 0 ? 'n' : '', 'u')], at, rate, seed, { vibrato: 0.04, rough: 0.2 });
    case 'cheer': // "WOO-HOO!" / "YEAH!"
      return utter(ctx, dest, noise, voice, k === 0 ? [{ ...n('u', 0.16, 1.4, 1.7, 1.1, 'w'), pause: 0.04 }, n('u', 0.28, 1.5, 1.9, 1.2, 'h')] : [n('e', 0.36, 1.3, 1.65, 1.2, 'y', 'a')], at, rate, seed, { vibrato: 0.02 });
  }
}
