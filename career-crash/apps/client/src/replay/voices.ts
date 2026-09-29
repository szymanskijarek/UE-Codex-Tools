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
  deep: { f0: 92, formant: 0.86, syll: 0.135, creak: 0, vibrato: 0.012, wave: 'sawtooth', gain: 1 },
  gravel: { f0: 108, formant: 0.9, syll: 0.125, creak: 0.55, vibrato: 0.008, wave: 'sawtooth', gain: 1.4 },
  mid: { f0: 138, formant: 1, syll: 0.115, creak: 0, vibrato: 0.015, wave: 'sawtooth', gain: 1.05 },
  bright: { f0: 215, formant: 1.14, syll: 0.105, creak: 0, vibrato: 0.02, wave: 'sawtooth', gain: 1 },
  squeaky: { f0: 340, formant: 1.3, syll: 0.085, creak: 0, vibrato: 0.035, wave: 'triangle', gain: 0.5 },
  whisper: { f0: 0, formant: 1.05, syll: 0.1, creak: 0, vibrato: 0, wave: 'sawtooth', gain: 1 },
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
      out.push({ onset, vowel, wordStart: i === 0, wordEnd: i === parts.length - 1, pause: i === parts.length - 1 ? (/[,.!?…]$/.test(w) ? 0.12 : 0.035) : 0 });
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

/**
 * Schedule a babbled line on `ctx`, into `dest`. `noise` is a looping white
 * noise buffer. Returns the utterance length in seconds.
 */
export function babble(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, text: string, voice: Voice, at: number, rate = 1): number {
  const P = PARAMS[voice.type];
  const R = rng(text + voice.type);
  const syl = syllables(text, 14);
  if (syl.length === 0) return 0;
  const exclaim = /!/.test(text);
  const question = /\?\s*$/.test(text);
  const f0 = P.f0 * voice.pitch * rate * (exclaim ? 1.12 : 1);
  const fs = P.formant * (0.97 + (voice.pitch - 1) * 0.5) * (rate < 1 ? 0.85 : 1);
  const loud = 0.8 * P.gain * voice.loud * (exclaim ? 1.2 : 1);

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
    osc.type = P.wave;
    osc.frequency.value = f0;
    src = osc;
  }
  src.connect(amp);
  let chain: AudioNode = amp;
  const extras: AudioScheduledSourceNode[] = [];
  if (P.creak > 0) {
    // Vocal fry: fast, irregular amplitude flutter.
    const creak = ctx.createGain();
    creak.gain.value = 1 - P.creak * 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 38 * rate;
    const depth = ctx.createGain();
    depth.gain.value = P.creak * 0.5;
    lfo.connect(depth).connect(creak.gain);
    amp.connect(creak);
    chain = creak;
    extras.push(lfo);
  }
  if (osc && P.vibrato > 0) {
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5 + R() * 1.5;
    const depth = ctx.createGain();
    depth.gain.value = f0 * P.vibrato;
    vib.connect(depth).connect(osc.frequency);
    extras.push(vib);
  }
  const out = ctx.createGain();
  out.gain.value = voice.type === 'whisper' ? 1.6 : 1;
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
  // A little of the raw source for body.
  if (voice.type !== 'whisper') {
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
    g.gain.exponentialRampToValueAtTime(peak * voice.loud, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, R() * 0.5);
    s.stop(t + dur + 0.02);
  };

  const n = syl.length;
  let t = at;
  const baseDur = P.syll / voice.speed / rate;
  for (let i = 0; i < n; i++) {
    const s = syl[i]!;
    const last = i === n - 1;
    const on = s.onset.slice(-2);
    // Consonant onset.
    let lead = 0;
    if (/[sz]|c(?=[ei])|x/.test(on)) {
      burst(t, 'highpass', 5200, 0.07 / voice.speed, 0.05);
      lead = 0.055;
    } else if (/sh|ch|j/.test(on)) {
      burst(t, 'bandpass', 2800, 0.08 / voice.speed, 0.06);
      lead = 0.06;
    } else if (/[fvh]|th/.test(on)) {
      burst(t, 'bandpass', 2200, 0.05, 0.025);
      lead = 0.04;
    } else if (/[ptk]|c|q/.test(on)) {
      burst(t + 0.01, 'highpass', 2500, 0.025, 0.09);
      lead = 0.035;
    } else if (/[bdg]/.test(on)) {
      burst(t + 0.005, 'lowpass', 900, 0.02, 0.07);
      lead = 0.02;
    }
    lead /= rate;
    const d = baseDur * (0.8 + R() * 0.45) * (s.wordEnd ? 1.15 : 1) * (last ? 1.7 : 1);
    const v0 = t + lead;
    // Intonation: gentle declination, stressed word starts, a rise for questions.
    const prog = i / Math.max(1, n - 1);
    let pitch = 1 + (0.1 - prog * 0.22) * voice.range + (R() - 0.5) * 0.18 * voice.range + (s.wordStart ? 0.06 : 0);
    if (last) pitch = question ? 1.35 : exclaim ? 1.18 : 0.82;
    if (osc) {
      osc.frequency.setTargetAtTime(f0 * pitch, v0, 0.025);
      if (last) osc.frequency.setTargetAtTime(f0 * pitch * (question ? 1.2 : 0.85), v0 + d * 0.4, d * 0.4);
    }
    const [F1, F2, F3] = VOWELS[s.vowel] ?? VOWELS.a!;
    const nasal = /[mn]/.test(on) ? 0.75 : 1;
    filters[0]!.frequency.setTargetAtTime(F1 * fs * nasal, v0, 0.018);
    filters[1]!.frequency.setTargetAtTime(F2 * fs, v0, 0.025);
    filters[2]!.frequency.setTargetAtTime(F3 * fs, v0, 0.03);
    const peak = loud * (s.wordStart ? 1 : 0.85) * (0.9 + R() * 0.2);
    const floor = s.wordStart ? 0.0001 : peak * 0.25;
    amp.gain.setValueAtTime(floor, v0);
    amp.gain.linearRampToValueAtTime(peak, v0 + 0.02);
    amp.gain.linearRampToValueAtTime(peak * 0.75, v0 + d * 0.8);
    amp.gain.linearRampToValueAtTime(s.wordEnd ? 0.0001 : peak * 0.3, v0 + d);
    t = v0 + d + s.pause / rate;
  }
  const end = t + 0.05;
  src.start(at);
  src.stop(end);
  for (const x of extras) {
    x.start(at);
    x.stop(end);
  }
  return end - at;
}
