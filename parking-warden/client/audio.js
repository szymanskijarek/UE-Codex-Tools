// Tiny WebAudio synth: no audio files, just bleeps with personality.

let ac = null;
let muted = false;

export function unlockAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}

export function toggleMute() { muted = !muted; return muted; }

function tone(freq, dur, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.08, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ac.createBufferSource(); const g = ac.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g).connect(ac.destination); s.start(t);
}

const SOUNDS = {
  ticket: () => { for (let i = 0; i < 5; i++) tone(900 + (i % 2) * 300, 0.04, { delay: i * 0.045, vol: 0.04 }); tone(1500, 0.12, { delay: 0.25, type: 'triangle' }); },
  complaint: () => { tone(220, 0.35, { type: 'sawtooth', slide: -120, vol: 0.05 }); },
  ability: () => { tone(300, 0.25, { type: 'triangle', slide: 900, vol: 0.06 }); },
  fail: () => { tone(160, 0.15, { type: 'square', vol: 0.04 }); },
  clap: () => { noise(0.08, 0.2); noise(0.06, 0.12, 0.07); },
  sad: () => { tone(392, 0.2, { type: 'triangle' }); tone(370, 0.2, { type: 'triangle', delay: 0.2 }); tone(349, 0.45, { type: 'triangle', delay: 0.4, slide: -40 }); },
  trip: () => { tone(500, 0.3, { type: 'sine', slide: -400, vol: 0.08 }); noise(0.1, 0.1, 0.25); },
  angry: () => { tone(140, 0.12, { type: 'sawtooth', vol: 0.04 }); tone(150, 0.12, { type: 'sawtooth', vol: 0.04, delay: 0.14 }); },
  escape: () => { tone(200, 0.5, { type: 'sawtooth', slide: 500, vol: 0.04 }); },
  radio: () => { noise(0.05, 0.05); tone(1200, 0.05, { vol: 0.02, delay: 0.05 }); },
  whistle: () => { tone(2000, 0.15, { type: 'sine', vol: 0.05 }); tone(2000, 0.35, { type: 'sine', vol: 0.05, delay: 0.2 }); }
};

export function play(name) { const f = SOUNDS[name]; if (f) f(); }
