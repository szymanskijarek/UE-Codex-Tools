/**
 * Placeholder minigame: the station's test card. It shows the contract a real
 * week's game follows (mount into the element, call `done`, clean up) and
 * stands in until the first real one exists.
 */
import type { Minigame } from './index';

const BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
const LINES = ['Fixed it.', 'Have you tried turning the news off and on again?', 'Signal restored. Dignity not restored.', 'Normal service has resumed. Normal is relative.'];

export const testCard: Minigame = {
  id: 'test-card',
  title: 'Please Stand By',
  blurb: 'Tap the test card until the signal comes back.',
  mount(el, ctx) {
    let taps = 0;
    const need = 8;
    const root = document.createElement('div');
    root.className = 'bn-test';
    root.innerHTML = `<div class="bn-test-bars">${BARS.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
      <div class="bn-test-label">BROKEN NEWS · TEST CARD</div>
      <div class="bn-test-meter"><b></b></div>
      <div class="bn-test-hint">Tap to fix the signal</div>`;
    const meter = root.querySelector('b')!;
    const tap = () => {
      if (taps >= need) return;
      taps++;
      meter.style.width = `${(taps / need) * 100}%`;
      root.classList.remove('bn-test-hit');
      void root.offsetWidth;
      root.classList.add('bn-test-hit');
      if (taps === need) ctx.done({ score: need, line: LINES[Math.floor(Math.random() * LINES.length)]! });
    };
    root.addEventListener('pointerdown', tap);
    el.appendChild(root);
    return () => {
      root.removeEventListener('pointerdown', tap);
      root.remove();
    };
  },
};
