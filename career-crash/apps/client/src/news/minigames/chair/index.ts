/**
 * Spinning With Intent (Chairs Recalled, art brief 14): top down, you are
 * Jeff's recalled office chair. Roll out of the props store, through the
 * newsroom and the green room, into Studio 1, and hit Brock at the desk hard
 * enough to knock him over. The chair keeps its momentum; walls and furniture
 * cost integrity. Physics: `rules.ts`; the building: `map.ts`.
 *
 * Block-out: everything is drawn from shapes until brief 14's sprites land
 * (`art/<name>.webp`, picked up by name).
 */
import type { Minigame } from '../index';
import { BROCK, PROPS, ROOMS, START, WALLS, WORLD, type Prop, type Room } from './map';
import { CHAIR, newChair, resultLine, step, type Input } from './rules';
import './chair.css';

const ART = import.meta.glob('./art/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const IMG: Record<string, HTMLImageElement> = {};
for (const [k, url] of Object.entries(ART)) {
  const im = new Image();
  im.src = url;
  IMG[k.slice(6, -5)] = im;
}
/** A sprite, once it's in and loaded. */
const sprite = (name: string) => (IMG[name]?.complete && IMG[name]!.naturalWidth ? IMG[name] : undefined);

/** How much of the world the view shows across. */
const VIEW_W = 1000;
const STEP = 1 / 120;
const END_MS = 2400;
const FLOOR_COLOUR: Record<Room['floor'], string> = { concrete: '#5d6168', carpet: '#34416a', lounge: '#4f3f62', studio: '#161d38' };
const PROP_COLOUR: Record<Prop['kind'], string> = {
  'news-desk': '#8a6a46',
  sofa: '#2f6d63',
  plant: '#3c8a3c',
  'water-cooler': '#7fb8e0',
  camera: '#2b2f36',
  light: '#e8c14a',
  'anchor-desk': '#9aa6c4',
  'coffee-cart': '#7a4b2a',
  'cable-reel': '#c4572f',
  shelves: '#6e6e6e',
};
const LABEL: Record<Prop['kind'], string> = {
  'news-desk': 'DESK',
  sofa: 'SOFA',
  plant: 'PLANT',
  'water-cooler': 'COOLER',
  camera: 'CAMERA',
  light: 'LIGHT',
  'anchor-desk': 'ANCHOR DESK',
  'coffee-cart': 'COFFEE',
  'cable-reel': 'CABLE',
  shelves: 'SHELVES',
};
const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
};

export const chair: Minigame = {
  mount(el, ctx) {
    const sfx = ctx.sfx;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const root = document.createElement('div');
    root.className = 'bn-c';
    root.innerHTML = `
      <canvas></canvas>
      <div class="bn-c-hud">
        <div class="bn-c-hp"><span>CHAIR INTEGRITY</span><div class="bn-c-bar"><b></b></div></div>
        <div class="bn-c-time">0.0 s</div>
      </div>
      <div class="bn-c-call"></div>
      <div class="bn-c-pad${coarse ? ' bn-c-touch' : ''}"><i class="bn-c-stick"><b></b></i><i class="bn-c-push">PUSH</i></div>
      <div class="bn-c-ready"><b>SPINNING WITH INTENT</b>
        <p>You are Jeff's recalled chair. Roll through the building and hit <em>Brock</em> at the desk, <em>fast</em>.<br />The chair keeps rolling: plan your turns. Walls and furniture cost integrity.</p>
        <p class="bn-c-how">${coarse ? 'Left thumb: steer · right thumb: hold to push' : 'Steer: W A S D or arrow keys · push: Space'}</p>
        <button>Roll out</button></div>`;
    const $ = <T extends Element>(s: string) => root.querySelector(s) as T;
    const canvas = $<HTMLCanvasElement>('canvas');
    const g = canvas.getContext('2d')!;
    const bar = $<HTMLElement>('.bn-c-bar b');
    const time = $<HTMLDivElement>('.bn-c-time');
    const call = $<HTMLDivElement>('.bn-c-call');
    const ready = $<HTMLDivElement>('.bn-c-ready');
    const stick = $<HTMLElement>('.bn-c-stick');
    const stickKnob = $<HTMLElement>('.bn-c-stick b');
    const push = $<HTMLElement>('.bn-c-push');

    const s = newChair(START.x, START.y, START.angle);
    // For automated play-throughs (screenshots, the bot): the chair and the building.
    Object.assign(canvas, { debug: { s, solids: [...WALLS, ...PROPS], brock: BROCK, world: WORLD, r: CHAIR.r } });
    const trail: { x: number; y: number }[] = [];
    const cam = { x: START.x, y: START.y };
    let phase: 'ready' | 'roll' | 'won' | 'lost' = 'ready';
    let t0 = 0;
    let elapsed = 0;
    let last = 0;
    let acc = 0;
    let raf = 0;
    let ended = false;
    let bumpedAt = -1e9;
    let brockHitAt = 0;

    // Input: keys, or a thumb stick (left half) and a push button (right half).
    const held = new Set<string>();
    const touch = { stickId: -1, ox: 0, oy: 0, dx: 0, dy: 0, pushIds: new Set<number>() };
    const input = (): Input => {
      let dx = 0, dy = 0;
      for (const k of held) {
        const v = KEYS[k];
        if (v) {
          dx += v[0];
          dy += v[1];
        }
      }
      if (touch.stickId >= 0) {
        dx += touch.dx;
        dy += touch.dy;
      }
      return { dx, dy, thrust: held.has(' ') || touch.pushIds.size > 0 };
    };

    const shout = (text: string, kind = '') => {
      call.textContent = text;
      call.className = `bn-c-call ${kind}`;
      void call.offsetWidth;
      call.classList.add('bn-c-pop');
    };

    const resize = () => {
      const r = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };

    const finish = (won: boolean) => {
      phase = won ? 'won' : 'lost';
      brockHitAt = performance.now();
      if (won) {
        sfx?.play('bonk', 1.3);
        setTimeout(() => sfx?.play('ooh'), 200);
        shout('BROCK IS DOWN!', 'bn-c-good');
      } else {
        sfx?.play('crunch', 1.2);
        shout('CHAIR RECALLED', 'bn-c-bad');
      }
      setTimeout(() => {
        if (!ended) ctx.done({ score: won ? Math.round(s.hp) : 0, line: resultLine(won, s.hp, elapsed) });
      }, END_MS);
    };

    const update = (dt: number) => {
      const ev = step(s, input(), dt);
      if (ev.impact > CHAIR.safeImpact) {
        sfx?.play(ev.impact > 380 ? 'crunch' : 'thud', Math.min(1.4, ev.impact / 400));
        if (ev.damage >= 4) shout(`-${ev.damage}`, 'bn-c-bad');
        root.classList.remove('bn-c-shake');
        void root.offsetWidth;
        root.classList.add('bn-c-shake');
      } else if (ev.impact > 60) sfx?.play('bonk', 0.4);
      if (ev.brock === 'hit') return finish(true);
      if (ev.brock === 'bump' && performance.now() - bumpedAt > 1500) {
        bumpedAt = performance.now();
        sfx?.play('boing', 0.6);
        shout('TOO GENTLE! BACK UP AND CHARGE', 'bn-c-warn');
      }
      if (s.hp <= 0) finish(false);
    };

    // ---- Drawing (block-out; sprites by name when brief 14 lands) ----
    const draw = (now: number) => {
      const W = canvas.width, H = canvas.height;
      const scale = W / VIEW_W;
      const vw = VIEW_W, vh = H / scale;
      // The camera leads the chair a little, and stays inside the building.
      const tx = s.x + s.vx * 0.35, ty = s.y + s.vy * 0.35;
      cam.x += (tx - cam.x) * 0.12;
      cam.y += (ty - cam.y) * 0.12;
      const cx = Math.max(vw / 2, Math.min(WORLD.w - vw / 2, cam.x));
      const cy = Math.max(vh / 2, Math.min(WORLD.h - vh / 2, cam.y));
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#0a0d18';
      g.fillRect(0, 0, W, H);
      g.setTransform(scale, 0, 0, scale, (vw / 2 - cx) * scale, (vh / 2 - cy) * scale);

      for (const r of ROOMS) {
        const tex = sprite(`floor-${r.floor}`);
        if (tex) {
          g.fillStyle = g.createPattern(tex, 'repeat')!;
        } else g.fillStyle = FLOOR_COLOUR[r.floor];
        g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle = '#ffffff14';
        g.font = 'bold 54px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2 + 18);
      }
      // Skid marks: where the chair has been.
      g.strokeStyle = '#00000040';
      g.lineWidth = 10;
      g.lineCap = 'round';
      g.beginPath();
      trail.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();

      for (const p of PROPS) {
        const im = sprite(p.kind);
        if (im) {
          g.drawImage(im, p.x, p.y, p.w, p.h);
          continue;
        }
        g.fillStyle = '#0006';
        g.fillRect(p.x + 6, p.y + 8, p.w, p.h);
        g.fillStyle = PROP_COLOUR[p.kind];
        g.fillRect(p.x, p.y, p.w, p.h);
        g.strokeStyle = '#1b1f2a';
        g.lineWidth = 4;
        g.strokeRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#ffffffcc';
        g.font = `bold ${Math.min(22, p.w / 4)}px system-ui, sans-serif`;
        g.fillText(LABEL[p.kind], p.x + p.w / 2, p.y + p.h / 2 + 7);
      }
      const wallTex = sprite('wall');
      for (const w of WALLS) {
        g.fillStyle = wallTex ? g.createPattern(wallTex, 'repeat')! : '#0f1424';
        g.fillRect(w.x, w.y, w.w, w.h);
        // The house red stripe runs along every wall (the tile itself has no direction).
        g.fillStyle = '#c8102e';
        if (w.w > w.h) g.fillRect(w.x, w.y + w.h / 2 - 3, w.w, 6);
        else g.fillRect(w.x + w.w / 2 - 3, w.y, 6, w.h);
      }
      drawBrock(now);
      drawChair();
      // Off screen: an arrow at the edge points the way to Brock.
      g.setTransform(1, 0, 0, 1, 0, 0);
      const bx = (BROCK.x - cx) * scale + W / 2, by = (BROCK.y - cy) * scale + H / 2;
      if (phase === 'roll' && (bx < 0 || bx > W || by < 0 || by > H)) {
        const a = Math.atan2(by - H / 2, bx - W / 2);
        // Kept clear of the HUD along the top.
        const m = 0.06 * W;
        const ex = Math.max(m, Math.min(W - m, W / 2 + Math.cos(a) * W)), ey = Math.max(0.2 * H, Math.min(H - m, H / 2 + Math.sin(a) * W));
        g.save();
        g.translate(ex, ey);
        g.rotate(a);
        g.fillStyle = '#f5c518';
        g.beginPath();
        g.moveTo(0.022 * W, 0);
        g.lineTo(-0.012 * W, -0.014 * W);
        g.lineTo(-0.012 * W, 0.014 * W);
        g.fill();
        g.restore();
        g.fillStyle = '#f5c518';
        g.font = `bold ${0.016 * W}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText('BROCK', ex - Math.cos(a) * 0.04 * W, ey - Math.sin(a) * 0.04 * W + 0.005 * W);
      }
    };

    const drawBrock = (now: number) => {
      const down = phase === 'won';
      const startled = !down && Math.hypot(s.x - BROCK.x, s.y - BROCK.y) < 420;
      const im = sprite(down ? 'brock-hit' : startled ? 'brock-startled' : 'brock');
      g.save();
      g.translate(BROCK.x, BROCK.y);
      // The block-out tips over; the painted one is already sprawled.
      if (down && !im) g.rotate(Math.min(1, (now - brockHitAt) / 300) * 1.4);
      if (im) {
        g.drawImage(im, -BROCK.r * 1.6, -BROCK.r * 1.6, BROCK.r * 3.2, BROCK.r * 3.2);
      } else {
        // Shoulders, head (that hair), the tie: seen from above.
        g.fillStyle = '#1e2a55';
        g.beginPath();
        g.ellipse(0, 0, BROCK.r * 0.7, BROCK.r, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#c8102e';
        g.fillRect(4, -6, 16, 12);
        g.fillStyle = '#7a4a24';
        g.beginPath();
        g.arc(-4, 0, BROCK.r * 0.5, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = '#1b1f2a';
        g.stroke();
      }
      g.restore();
      g.fillStyle = down ? '#f5c518' : '#fff';
      g.font = 'bold 26px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(down ? '★ BROCK ★' : startled ? 'BROCK?!' : 'BROCK', BROCK.x, BROCK.y - BROCK.r - 16);
    };

    const drawChair = () => {
      const lost = phase === 'lost';
      const dmg = s.hp < 34 ? 3 : s.hp < 67 ? 2 : 1;
      const im = sprite(lost ? 'chair-broken' : `chair-${dmg}`) ?? sprite('chair-1');
      g.save();
      g.translate(s.x, s.y);
      // The base turns with the steering; the seat spins on top.
      g.rotate(s.angle);
      const base = sprite('chair-base');
      if (base) g.drawImage(base, -CHAIR.r * 1.2, -CHAIR.r * 1.2, CHAIR.r * 2.4, CHAIR.r * 2.4);
      else g.strokeStyle = '#2a2d33';
      g.lineWidth = 7;
      for (let i = 0; i < (base ? 0 : 5); i++) {
        const a = (i / 5) * Math.PI * 2;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * CHAIR.r, Math.sin(a) * CHAIR.r);
        g.stroke();
        g.fillStyle = '#111';
        g.beginPath();
        g.arc(Math.cos(a) * CHAIR.r, Math.sin(a) * CHAIR.r, 6, 0, Math.PI * 2);
        g.fill();
      }
      // Which way it's facing: a little arrow ahead of the base.
      g.fillStyle = '#f5c518';
      g.beginPath();
      g.moveTo(CHAIR.r + 18, 0);
      g.lineTo(CHAIR.r + 4, -9);
      g.lineTo(CHAIR.r + 4, 9);
      g.fill();
      g.rotate(s.spin);
      if (im) g.drawImage(im, -CHAIR.r * 1.3, -CHAIR.r * 1.3, CHAIR.r * 2.6, CHAIR.r * 2.6);
      else {
        g.fillStyle = lost ? '#444' : '#2f4fa8';
        g.beginPath();
        g.arc(0, 0, CHAIR.r * 0.75, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = lost ? '#333' : '#1f357a';
        g.fillRect(-CHAIR.r * 0.95, -CHAIR.r * 0.7, CHAIR.r * 0.35, CHAIR.r * 1.4);
        g.lineWidth = 4;
        g.strokeStyle = '#1b1f2a';
        g.strokeRect(-CHAIR.r * 0.95, -CHAIR.r * 0.7, CHAIR.r * 0.35, CHAIR.r * 1.4);
        g.beginPath();
        g.arc(0, 0, CHAIR.r * 0.75, 0, Math.PI * 2);
        g.stroke();
        if (dmg >= 2) {
          g.strokeStyle = '#ffffffaa';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(-8, -14);
          g.lineTo(4, 0);
          g.lineTo(-2, 14);
          if (dmg >= 3) {
            g.moveTo(10, -16);
            g.lineTo(16, 4);
          }
          g.stroke();
        }
      }
      g.restore();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (canvas.width !== Math.round(root.clientWidth * Math.min(2, window.devicePixelRatio || 1))) resize();
      if (phase === 'roll') {
        acc += Math.min(0.1, (now - last) / 1000);
        while (acc >= STEP && phase === 'roll') {
          update(STEP);
          acc -= STEP;
        }
        elapsed = (now - t0) / 1000;
        time.textContent = `${elapsed.toFixed(1)} s`;
        const lastP = trail[trail.length - 1];
        if (!lastP || Math.hypot(lastP.x - s.x, lastP.y - s.y) > 14) {
          trail.push({ x: s.x, y: s.y });
          if (trail.length > 160) trail.shift();
        }
      }
      last = now;
      bar.style.width = `${s.hp}%`;
      bar.parentElement!.classList.toggle('bn-c-low', s.hp <= 34);
      draw(now);
    };

    const start = () => {
      if (phase !== 'ready') return;
      sfx?.unlock();
      ready.remove();
      phase = 'roll';
      t0 = last = performance.now();
      shout('(JEFF, OFF) COME BACK! THAT ONE\'S RECALLED!', 'bn-c-jeff');
    };

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (phase === 'ready' && down && (k === 'Enter' || k === ' ')) {
        e.preventDefault();
        return start();
      }
      if (!(k in KEYS) && k !== ' ') return;
      e.preventDefault();
      if (down) held.add(k);
      else held.delete(k);
    };
    const keydown = (e: KeyboardEvent) => onKey(e, true);
    const keyup = (e: KeyboardEvent) => onKey(e, false);

    // Touch (and mouse): the left half is a thumb stick that appears where you touch; the right half pushes.
    const onDown = (e: PointerEvent) => {
      if (phase !== 'roll') return;
      e.preventDefault();
      const r = root.getBoundingClientRect();
      if (e.clientX - r.left < r.width / 2) {
        touch.stickId = e.pointerId;
        touch.ox = e.clientX;
        touch.oy = e.clientY;
        touch.dx = touch.dy = 0;
        stick.style.left = `${e.clientX - r.left}px`;
        stick.style.top = `${e.clientY - r.top}px`;
        stick.classList.add('bn-c-on');
      } else {
        touch.pushIds.add(e.pointerId);
        push.classList.add('bn-c-on');
      }
      root.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== touch.stickId) return;
      const dx = e.clientX - touch.ox, dy = e.clientY - touch.oy;
      const d = Math.hypot(dx, dy);
      const max = root.clientWidth * 0.06;
      touch.dx = d > 8 ? dx / d : 0;
      touch.dy = d > 8 ? dy / d : 0;
      const k = Math.min(1, d / max);
      stickKnob.style.transform = `translate(${(dx / (d || 1)) * k * 100}%, ${(dy / (d || 1)) * k * 100}%)`;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === touch.stickId) {
        touch.stickId = -1;
        touch.dx = touch.dy = 0;
        stickKnob.style.transform = '';
        stick.classList.remove('bn-c-on');
      }
      touch.pushIds.delete(e.pointerId);
      if (!touch.pushIds.size) push.classList.remove('bn-c-on');
    };

    ready.querySelector('button')!.addEventListener('click', start);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    el.appendChild(root);
    resize();
    raf = requestAnimationFrame(tick);
    return () => {
      ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      root.remove();
    };
  },
};
