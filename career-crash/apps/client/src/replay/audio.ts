/**
 * Synthesised sound effects (WebAudio, no asset files). Every sound is built
 * from oscillators and filtered noise so it works in locked-down hosts and
 * costs nothing to download. Sounds are throttled per name so a busy fight
 * doesn't turn into mush.
 */
export type SfxName =
  | 'punch'
  | 'crit'
  | 'whoosh'
  | 'thud'
  | 'splash'
  | 'zap'
  | 'fire'
  | 'boom'
  | 'glass'
  | 'boing'
  | 'whistle'
  | 'bell'
  | 'ooh'
  | 'cheer'
  | 'heal'
  | 'power'
  | 'pop'
  | 'down'
  | 'alarm'
  | 'dingdong'
  | 'blah'
  | 'fanfare'
  | 'squeak'
  | 'slurp';

import { babble, type Voice } from './voices';

const MIN_GAP_MS: Partial<Record<SfxName, number>> = { punch: 70, thud: 90, whoosh: 90, pop: 120, blah: 200, ooh: 900, cheer: 1500, fire: 400, zap: 150, splash: 200 };
const MUTE_KEY = 'cc.muted';

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<SfxName, number>();
  muted = readMuted();
  /** Playback rate: < 1 lowers pitch and stretches sounds (slow-motion replays). */
  rate = 1;
  /** End times (context seconds) of voices still talking; at most two at once. */
  private talking: number[] = [];

  /** Create/resume the audio context; call from a user gesture when possible. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp).connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      window.localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    if (!m) this.unlock();
  }

  close(): void {
    void this.ctx?.close();
    this.ctx = null;
  }

  // ---- building blocks ------------------------------------------------------
  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, attack = 0.005): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    f0 *= this.rate;
    f1 *= this.rate;
    dur /= this.rate;
    attack /= this.rate;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, peak, attack, dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  private hiss(filter: BiquadFilterType, f0: number, f1: number, t: number, dur: number, peak: number, attack = 0.005, q = 1): void {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.playbackRate.value = this.rate;
    f0 *= this.rate;
    f1 *= this.rate;
    dur /= this.rate;
    attack /= this.rate;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain();
    this.env(g, t, peak, attack, dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t, Math.random() * 0.5);
    s.stop(t + attack + dur + 0.05);
  }

  /** Babble a speech-bubble line in this voice (skipped if two others are already talking). */
  speak(text: string, voice: Voice, force = false): void {
    if (this.muted || !this.ctx || !this.master || !this.noise || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.talking = this.talking.filter((t) => t > now);
    if (this.talking.length >= (force ? 3 : 2)) return;
    const len = babble(this.ctx, this.master, this.noise, text, voice, now + 0.01, this.rate);
    this.talking.push(now + len);
  }

  play(name: SfxName, intensity = 1): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last.get(name) ?? 0) < (MIN_GAP_MS[name] ?? 50)) return;
    this.last.set(name, now);
    const t = this.ctx.currentTime + 0.005;
    // In slow motion, spread multi-part sounds out too.
    const r0 = this.rate;
    const T = (dt: number): number => t + dt / r0;
    const v = Math.min(1.4, Math.max(0.3, intensity));
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    switch (name) {
      case 'punch':
        this.hiss('lowpass', 1400, 300, t, 0.07, 0.5 * v);
        this.tone('sine', r(140, 170), 55, t, 0.1, 0.6 * v);
        break;
      case 'crit':
        this.hiss('highpass', 2500, 1200, t, 0.05, 0.4);
        this.hiss('lowpass', 1800, 200, t, 0.12, 0.7);
        this.tone('sine', 120, 40, t, 0.2, 0.9);
        break;
      case 'whoosh':
        this.hiss('bandpass', 400, 2400, t, 0.18, 0.35 * v, 0.03, 2);
        break;
      case 'thud':
        this.tone('sine', 110, 40, t, 0.16, 0.7 * v);
        this.hiss('lowpass', 600, 120, t, 0.1, 0.35 * v);
        break;
      case 'splash':
        this.hiss('lowpass', 4000, 350, t, 0.4, 0.45, 0.01);
        this.hiss('bandpass', 1200, 500, T(0.05), 0.25, 0.25, 0.01, 3);
        break;
      case 'zap':
        for (let i = 0; i < 4; i++) this.tone('sawtooth', r(600, 1600), r(200, 900), T(i * 0.045), 0.05, 0.18);
        this.hiss('highpass', 3000, 5000, t, 0.2, 0.2);
        break;
      case 'fire':
        this.hiss('bandpass', 500, 900, t, 0.5, 0.35, 0.12, 0.8);
        this.hiss('highpass', 3000, 2000, T(0.05), 0.3, 0.08, 0.05);
        break;
      case 'boom':
        this.hiss('lowpass', 900, 60, t, 1.1, 0.9, 0.01);
        this.tone('sine', 70, 28, t, 0.9, 1.0);
        break;
      case 'glass':
        for (let i = 0; i < 5; i++) this.tone('sine', r(2200, 5200), r(2000, 5000), T(i * 0.025), 0.12, 0.12);
        this.hiss('highpass', 4000, 6000, t, 0.15, 0.25);
        break;
      case 'boing':
        this.tone('sine', 260, 900, t, 0.12, 0.35);
        this.tone('sine', 900, 180, T(0.12), 0.25, 0.3);
        break;
      case 'whistle':
        this.tone('sine', 2900, 2950, t, 0.35, 0.18, 0.01);
        this.tone('sine', 3150, 3100, t, 0.35, 0.12, 0.01);
        break;
      case 'bell':
        this.tone('triangle', 880, 870, t, 1.0, 0.35);
        this.tone('sine', 1320, 1310, t, 0.8, 0.2);
        break;
      case 'ooh':
        this.hiss('bandpass', 450, 700, t, 0.9, 0.22, 0.25, 4);
        this.hiss('bandpass', 900, 1100, t, 0.8, 0.12, 0.25, 5);
        break;
      case 'cheer':
        this.hiss('bandpass', 1000, 1500, t, 1.4, 0.3, 0.2, 1.2);
        this.hiss('bandpass', 2500, 3000, T(0.1), 1.2, 0.12, 0.2, 2);
        break;
      case 'heal':
        [523, 659, 784, 1047].forEach((f, i) => this.tone('sine', f, f, T(i * 0.06), 0.18, 0.18));
        break;
      case 'power':
        this.tone('sine', 220, 880, t, 0.25, 0.3, 0.02);
        this.tone('triangle', 440, 1320, T(0.05), 0.25, 0.15, 0.02);
        break;
      case 'pop':
        this.tone('sine', 500, 950, t, 0.06, 0.25);
        break;
      case 'down':
        this.tone('sawtooth', 420, 110, t, 0.45, 0.18, 0.01);
        this.tone('sine', 140, 50, T(0.1), 0.3, 0.6);
        break;
      case 'alarm':
        for (let i = 0; i < 4; i++) this.tone('square', i % 2 ? 330 : 440, i % 2 ? 330 : 440, T(i * 0.22), 0.18, 0.12, 0.01);
        break;
      case 'dingdong':
        this.tone('sine', 660, 660, t, 0.45, 0.3);
        this.tone('sine', 523, 523, T(0.4), 0.7, 0.3);
        break;
      case 'blah':
        for (let i = 0; i < 4; i++) this.tone('square', r(180, 320), r(150, 300), T(i * 0.08), 0.06, 0.08);
        break;
      case 'fanfare':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, T(i * 0.11), i === 5 ? 0.6 : 0.12, 0.25));
        break;
      case 'squeak':
        this.tone('square', 1200, 1800, t, 0.08, 0.1);
        this.tone('square', 1700, 900, T(0.08), 0.1, 0.08);
        break;
      case 'slurp':
        this.hiss('bandpass', 800, 1800, t, 0.3, 0.25, 0.05, 6);
        break;
    }
  }
}
