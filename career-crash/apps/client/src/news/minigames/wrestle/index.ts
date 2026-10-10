/**
 * Wrestle the Bird (Man vs Emu, art brief 13): first person on the A381 verge,
 * squared up to Side Neck. He winds up a peck, a kick or a body slam; its note
 * falls down that lane, and the player grabs, blocks or ducks on the beat.
 * Every attack that lands costs the trousers a stage. Rules: `rules.ts`.
 */
import { music } from '../../../replay/music';
import type { Minigame } from '../index';
import { ANSWER, bout, judge, landed, pace, resultLine, WRESTLE, type Verdict } from './rules';
import plateUrl from '../../art/location-sheep-field.webp';
import alpacaUrl from '../../art/cameo-alpaca.webp';
import alpacaBUrl from '../../art/cameo-alpaca-b.webp';
import './wrestle.css';

const ART = import.meta.glob('./art/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const art = (name: string) => ART[`./art/${name}.webp`];

type Move = 'grab' | 'block' | 'duck';
const LANES: { move: Move; icon: string; key: string }[] = [
  { move: 'grab', icon: '✊', key: '←' },
  { move: 'block', icon: '✋', key: '↓' },
  { move: 'duck', icon: '⤵', key: '→' },
];
const KEYS: Record<string, Move> = { ArrowLeft: 'grab', a: 'grab', j: 'grab', ArrowDown: 'block', s: 'block', k: 'block', ' ': 'block', ArrowRight: 'duck', d: 'duck', l: 'duck' };
const TELL_SOUND = { peck: 'squawk', kick: 'honk', slam: 'flutter' } as const;
const MOVE_SOUND = { grab: 'pop', block: 'clang', duck: 'whoosh' } as const;
const CALL: Record<Verdict, string> = { perfect: 'PERFECT!', good: 'GOOD', wrong: 'WRONG MOVE!', early: 'TOO EARLY!', miss: 'OOF!' };
/** How long a beat's outcome stays on screen before the breather. */
const REACT_MS = 520;
const END_MS = 2600;

// This chunk is fetched while the open plays: warm every frame then, so the first wind-up doesn't flash.
for (const url of [...Object.values(ART), plateUrl, alpacaUrl, alpacaBUrl]) new Image().src = url;

export const wrestle: Minigame = {
  mount(el, ctx) {
    const sfx = ctx.sfx;
    const attacks = bout();
    const root = document.createElement('div');
    root.className = 'bn-w';
    root.innerHTML = `
      <img class="bn-w-bg" src="${plateUrl}" alt="" />
      <img class="bn-w-alpaca" src="${alpacaUrl}" alt="" />
      <div class="bn-w-emu"><img alt="" /></div>
      <img class="bn-w-hands" alt="" />
      <div class="bn-w-hud"><b>WRESTLE THE BIRD</b><span class="bn-w-count"></span><span class="bn-w-combo"></span></div>
      <div class="bn-w-trousers"><img alt="" /><div><div class="bn-w-bar"><b></b></div><span></span></div></div>
      <div class="bn-w-lanes">${LANES.map((l) => `<div class="bn-w-lane bn-w-${l.move}"><i class="bn-w-note">${l.icon}</i><span class="bn-w-target">${l.icon}<small>${l.move.toUpperCase()} ${l.key}</small></span></div>`).join('')}</div>
      <div class="bn-w-call"></div>
      <div class="bn-w-ready"><b>WRESTLE THE BIRD</b><p>Side Neck winds up a <em>peck</em>, a <em>kick</em> or a <em>body slam</em>.<br />When its note hits the line: <em>grab</em>, <em>block</em> or <em>duck</em>.</p><p class="bn-w-how">Tap the left, middle or right of the screen · or ← ↓ →</p><button>Square up</button></div>`;
    const $ = <T extends Element>(s: string) => root.querySelector(s) as T;
    const emu = $<HTMLImageElement>('.bn-w-emu img');
    const emuBox = $<HTMLDivElement>('.bn-w-emu');
    const hands = $<HTMLImageElement>('.bn-w-hands');
    const alpaca = $<HTMLImageElement>('.bn-w-alpaca');
    const count = $<HTMLSpanElement>('.bn-w-count');
    const combo = $<HTMLSpanElement>('.bn-w-combo');
    const trousersImg = $<HTMLImageElement>('.bn-w-trousers img');
    const bar = $<HTMLElement>('.bn-w-bar b');
    const integrity = $<HTMLSpanElement>('.bn-w-trousers span');
    const call = $<HTMLDivElement>('.bn-w-call');
    const ready = $<HTMLDivElement>('.bn-w-ready');
    const lanes = LANES.map((l) => root.querySelector(`.bn-w-${l.move}`) as HTMLDivElement);
    const notes = lanes.map((l) => l.querySelector('.bn-w-note') as HTMLElement);

    let phase: 'ready' | 'fight' | 'over' = 'ready';
    let i = 0;
    let hits = 0;
    let beaten = 0;
    let streak = 0;
    /** The current attack: when its wind-up started, and how it went (once it's been answered or has landed). */
    let tellAt = 0;
    let verdict: Verdict | null = null;
    let verdictAt = 0;
    let raf = 0;
    let ended = false;

    const show = (img: HTMLImageElement, url: string | undefined) => {
      if (url && img.getAttribute('src') !== url) img.src = url;
    };
    const trousers = () => {
      const pct = Math.max(0, 100 - (hits / WRESTLE.trousers) * 100);
      show(trousersImg, art(`trousers-${Math.min(hits, WRESTLE.trousers) + 1}`));
      bar.style.width = `${pct}%`;
      bar.parentElement!.classList.toggle('bn-w-low', pct <= 25);
      integrity.textContent = `TROUSER INTEGRITY ${pct}%`;
    };
    const shout = (v: Verdict) => {
      call.textContent = CALL[v];
      call.className = `bn-w-call bn-w-call-${landed(v) ? 'bad' : v}`;
      void call.offsetWidth;
      call.classList.add('bn-w-pop');
    };
    const restart = (cls: string) => {
      root.classList.remove(cls);
      void root.offsetWidth;
      root.classList.add(cls);
    };
    trousers();
    show(emu, art('emu-idle'));
    show(hands, art('hands-ready'));

    const resolve = (v: Verdict, now: number) => {
      verdict = v;
      verdictAt = now;
      const a = attacks[i]!;
      shout(v);
      if (landed(v)) {
        hits++;
        streak = 0;
        restart('bn-w-shake');
        sfx?.play(a === 'kick' ? 'bonk' : a === 'slam' ? 'thud' : 'punch');
        setTimeout(() => sfx?.play('wah'), 160);
        trousers();
      } else {
        beaten++;
        streak++;
        sfx?.play(MOVE_SOUND[ANSWER[a]]);
        if (v === 'perfect') setTimeout(() => sfx?.play('ooh', 0.6), 120);
      }
      combo.textContent = streak >= 3 ? `${streak} IN A ROW` : '';
    };

    const finish = () => {
      phase = 'over';
      const won = hits < WRESTLE.trousers;
      root.classList.add('bn-w-over');
      emuBox.className = `bn-w-emu bn-w-end${won ? ' bn-w-sulk' : ' bn-w-strut'}`;
      show(emu, art(won ? 'emu-sulk' : 'emu-win'));
      show(hands, art(won ? 'hands-ready' : 'hands-hit'));
      call.textContent = won ? 'SIDE NECK GOES HOME' : 'SIDE NECK TAKES THE TROUSERS';
      call.className = `bn-w-call bn-w-call-end bn-w-pop`;
      if (!won) sfx?.play('honk');
      music.sting(won ? 'win' : 'lose');
      setTimeout(() => {
        if (!ended) ctx.done({ score: beaten, line: resultLine(hits) });
      }, END_MS);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // The alpaca chews throughout, unimpressed.
      show(alpaca, Math.floor(now / 700) % 2 ? alpacaBUrl : alpacaUrl);
      if (phase !== 'fight') return;
      const a = attacks[i]!;
      const p = pace(i);
      const beatAt = tellAt + p.fallMs;
      const t = now - tellAt;
      count.textContent = `${i + 1} / ${WRESTLE.attacks}`;
      if (!verdict && now > beatAt + p.windowMs) resolve('miss', now);
      // The note falls down its lane to the line (100%) on the beat.
      notes.forEach((n, k) => {
        const mine = LANES[k]!.move === ANSWER[a] && t >= 0 && !verdict;
        n.style.opacity = mine ? '1' : '0';
        if (mine) n.style.top = `calc(var(--line) * ${Math.min(1.15, t / p.fallMs)})`;
      });
      lanes.forEach((l, k) => l.classList.toggle('bn-w-live', LANES[k]!.move === ANSWER[a] && t >= 0 && !verdict));
      if (t < 0) {
        // The breather: Side Neck bobs his famous neck from side to side.
        emuBox.className = 'bn-w-emu';
        show(emu, art(Math.floor(now / 380) % 2 ? 'emu-idle-b' : 'emu-idle'));
        show(hands, art('hands-ready'));
        return;
      }
      if (!verdict) {
        // The wind-up: the tell grows on him as the beat nears.
        emuBox.className = 'bn-w-emu bn-w-tell';
        emuBox.style.setProperty('--wind', String(Math.min(1, t / p.fallMs)));
        show(emu, art(`emu-tell-${a}`));
        return;
      }
      const since = now - verdictAt;
      if (landed(verdict)) {
        emuBox.className = 'bn-w-emu bn-w-strike';
        show(emu, art(`emu-${a}`));
        show(hands, art('hands-hit'));
      } else {
        emuBox.className = 'bn-w-emu bn-w-dazed';
        show(emu, art(Math.floor(since / 160) % 2 ? 'emu-dazed-b' : 'emu-dazed'));
        show(hands, art(`hands-${ANSWER[a]}`));
      }
      if (since < REACT_MS) return;
      // On to the next attack, or the end of the bout.
      if (hits >= WRESTLE.trousers || i + 1 >= WRESTLE.attacks) return finish();
      i++;
      verdict = null;
      tellAt = now + pace(i).gapMs;
      setTimeout(() => phase === 'fight' && sfx?.play(TELL_SOUND[attacks[i]!], 0.7), pace(i).gapMs);
    };

    const press = (move: Move) => {
      const now = performance.now();
      if (phase !== 'fight') return;
      lanes[LANES.findIndex((l) => l.move === move)]!.animate([{ filter: 'brightness(1.8)' }, { filter: 'none' }], 180);
      if (verdict || now < tellAt) return;
      const p = pace(i);
      const v = judge(attacks[i]!, move, now - (tellAt + p.fallMs), p.windowMs);
      if (v) resolve(v, now);
    };

    const start = () => {
      if (phase !== 'ready') return;
      sfx?.unlock();
      ready.remove();
      phase = 'fight';
      tellAt = performance.now() + 900;
      call.textContent = 'FIGHT!';
      call.className = 'bn-w-call bn-w-call-end bn-w-pop';
      setTimeout(() => sfx?.play(TELL_SOUND[attacks[0]!], 0.7), 900);
    };

    const onKey = (e: KeyboardEvent) => {
      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        return start();
      }
      const move = KEYS[e.key];
      if (!move) return;
      e.preventDefault();
      press(move);
    };
    const onPointer = (e: PointerEvent) => {
      if (phase === 'ready') return;
      const r = root.getBoundingClientRect();
      const third = Math.min(2, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 3)));
      press(LANES[third]!.move);
    };
    ready.querySelector('button')!.addEventListener('click', start);
    window.addEventListener('keydown', onKey);
    root.addEventListener('pointerdown', onPointer);
    el.appendChild(root);
    raf = requestAnimationFrame(tick);
    return () => {
      ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerdown', onPointer);
      root.remove();
    };
  },
};

