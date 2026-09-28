// CSP-safe shader/uniform code paths: the artifact host and strict deployments forbid eval.
import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import { bundle } from '@cc/content';
import type { ArenaDef } from '@cc/content-schema';
import type { BattleEvent, BattleInput, FrameEntity } from '@cc/sim';
import { nameOf, STATUS_ICONS } from '../i18n';
import type { ReplayPlayer } from './player';

/**
 * Placeholder-art battle renderer (04 R-3): PixiJS scene graph with a 3/4
 * "stage" projection (02 §2). Characters are simple paper dolls assembled from
 * body/head/hair/hat/held-item parts so real art can replace each part later.
 */
const Y_SQUASH = 0.62;
const Z_LIFT = 0.55;
const WALL_H = 1100;
const TEAM_COLORS = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0xa855f7, 0x14b8a6, 0xec4899, 0x64748b];
const OUTLINE = 0x1b1f2a;

const hex = (s: string): number => parseInt(s.replace('#', ''), 16);

interface CharSprite {
  root: Container;
  doll: Container;
  eyes: Graphics;
  held: Graphics;
  bar: Graphics;
  icons: Text;
  label: Text;
  lastHp: number;
  lastIcons: string;
  lastState: string;
  lastHeld: number;
}

interface PropSprite {
  root: Container;
  g: Graphics;
  area: number;
}

interface Floater {
  text: Text;
  vy: number;
  life: number;
  max: number;
}

export class BattleRenderer {
  app = new Application();
  private stage = new Container();
  private floor = new Container();
  private areas = new Container();
  private bodies = new Container();
  private fx = new Container();
  private banner!: Text;
  private bannerLife = 0;
  private chars = new Map<number, CharSprite>();
  private props = new Map<number, PropSprite>();
  private floaters: Floater[] = [];
  private flashes: { g: Graphics; life: number; max: number }[] = [];
  private scale = 0.04;
  private arena!: ArenaDef;
  private ready = false;
  private observer: ResizeObserver | null = null;

  constructor(private input: BattleInput) {}

  async mount(el: HTMLElement): Promise<void> {
    this.arena = bundle.arenas.find((a) => a.id === this.input.arenaId)!;
    await this.app.init({ preference: 'webgl', resizeTo: el, background: hex(this.arena.theme.wall), antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
    el.appendChild(this.app.canvas);
    this.bodies.sortableChildren = true;
    this.stage.addChild(this.floor, this.areas, this.bodies, this.fx);
    this.app.stage.addChild(this.stage);
    this.banner = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: '900', fill: 0xffffff, stroke: { color: OUTLINE, width: 5 }, align: 'center' } });
    this.banner.anchor.set(0.5, 0);
    this.app.stage.addChild(this.banner);
    this.layout();
    this.app.renderer.on('resize', () => this.layout());
    // resizeTo only tracks window resizes; the stage box can change size on its own (fonts, wrapping, phones).
    this.observer = new ResizeObserver(() => this.app.resize());
    this.observer.observe(el);
    this.ready = true;
  }

  destroy(): void {
    this.observer?.disconnect();
    if (this.ready) this.app.destroy(true, { children: true });
    this.ready = false;
  }

  private layout(): void {
    const [W, H] = this.arena.sizeMm;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const worldH = H * Y_SQUASH + WALL_H * Z_LIFT;
    this.scale = Math.min((sw - 16) / W, (sh - 40) / worldH);
    this.stage.x = (sw - W * this.scale) / 2;
    this.stage.y = (sh - worldH * this.scale) / 2 + WALL_H * Z_LIFT * this.scale;
    this.banner.x = sw / 2;
    this.banner.y = 8;
    this.drawFloor();
    // Character dolls depend on scale: rebuild.
    for (const s of this.chars.values()) s.root.destroy({ children: true });
    this.chars.clear();
    for (const s of this.props.values()) s.root.destroy({ children: true });
    this.props.clear();
  }

  private px(x: number, y: number, z = 0): [number, number] {
    return [x * this.scale, (y * Y_SQUASH - z * Z_LIFT) * this.scale];
  }

  private drawFloor(): void {
    this.floor.removeChildren().forEach((c) => c.destroy());
    const [W, H] = this.arena.sizeMm;
    const g = new Graphics();
    const [fw, fh] = this.px(W, H);
    g.rect(0, 0, fw, fh).fill(hex(this.arena.theme.floor));
    // Tile grid for a sense of scale (1 m).
    for (let x = 0; x <= W; x += 1000) {
      const [sx] = this.px(x, 0);
      g.moveTo(sx, 0).lineTo(sx, fh);
    }
    for (let y = 0; y <= H; y += 1000) {
      const [, sy] = this.px(0, y);
      g.moveTo(0, sy).lineTo(fw, sy);
    }
    g.stroke({ width: 1, color: 0x000000, alpha: 0.06 });
    g.rect(0, 0, fw, fh).stroke({ width: 4, color: OUTLINE });
    this.floor.addChild(g);
    // Walls / shelves: extruded boxes, drawn into the sorted body layer so people can walk in front/behind.
    for (const [x, y, w, h] of this.arena.walls) {
      const wall = new Graphics();
      const [x0, y0] = this.px(x, y);
      const [x1, y1] = this.px(x + w, y + h);
      const lift = WALL_H * Z_LIFT * this.scale;
      wall.rect(x0, y1 - lift, x1 - x0, lift).fill(hex(this.arena.theme.wall)).stroke({ width: 2, color: OUTLINE });
      wall.rect(x0, y0 - lift, x1 - x0, y1 - y0).fill(hex(this.arena.theme.accent)).stroke({ width: 2, color: OUTLINE });
      wall.zIndex = y + h;
      this.bodies.addChild(wall);
    }
  }

  // ---------------------------------------------------------------------------
  // Sprites
  // ---------------------------------------------------------------------------
  private makeChar(e: FrameEntity): CharSprite {
    const r = e.r * this.scale; // body radius in px
    const snap = this.input.teams[e.team]?.characters.find((c) => c.id === e.snap);
    const career = bundle.careers.find((c) => c.id === e.def);
    const isRef = e.kind === 'npc';
    const bodyColor = isRef ? 0xffffff : hex(career?.art.color ?? '#999999');
    const hatColor = career?.art.hat ? hex(career.art.hat) : null;
    const skin = hex(snap?.appearance.skin ?? '#e0ac69');
    const hair = hex(snap?.appearance.hair ?? '#3b2a1a');

    const root = new Container();
    const doll = new Container();
    const shadow = new Graphics().ellipse(0, 0, r * 1.1, r * 0.45).fill({ color: 0x000000, alpha: 0.18 });
    const ring = new Graphics().ellipse(0, 0, r * 1.15, r * 0.5).stroke({ width: Math.max(2, r * 0.18), color: isRef ? 0x111111 : TEAM_COLORS[e.team % TEAM_COLORS.length]! });
    root.addChild(shadow, ring, doll);

    const body = new Graphics().roundRect(-r * 0.8, -r * 2.1, r * 1.6, r * 1.9, r * 0.45).fill(bodyColor).stroke({ width: Math.max(1.5, r * 0.14), color: OUTLINE });
    if (isRef) for (let i = -2; i <= 2; i++) body.rect(i * r * 0.32 - r * 0.07, -r * 2.05, r * 0.14, r * 1.8).fill(0x111111);
    const head = new Graphics().circle(0, -r * 2.9, r * 0.95).fill(skin).stroke({ width: Math.max(1.5, r * 0.14), color: OUTLINE });
    const style = snap?.appearance.hairStyle ?? 0;
    const hairG = new Graphics();
    if (style % 3 === 0) hairG.arc(0, -r * 2.95, r * 0.95, Math.PI, 0).fill(hair);
    else if (style % 3 === 1) hairG.rect(-r * 0.95, -r * 3.85, r * 1.9, r * 0.55).fill(hair);
    else hairG.circle(-r * 0.6, -r * 3.5, r * 0.4).circle(r * 0.6, -r * 3.5, r * 0.4).circle(0, -r * 3.75, r * 0.45).fill(hair);
    doll.addChild(body, head, hairG);
    if (hatColor !== null && !isRef) {
      const hat = new Graphics().roundRect(-r * 0.85, -r * 4.05, r * 1.7, r * 0.55, r * 0.2).fill(hatColor).stroke({ width: Math.max(1, r * 0.1), color: OUTLINE });
      hat.rect(r * 0.2, -r * 3.62, r * 0.95, r * 0.18).fill(hatColor);
      doll.addChild(hat);
    }
    const eyes = new Graphics();
    const held = new Graphics();
    doll.addChild(eyes, held);
    const bar = new Graphics();
    const labelStyle: TextStyleOptions = { fontFamily: 'system-ui, sans-serif', fontSize: Math.max(9, r * 0.75), fontWeight: '700', fill: 0xffffff, stroke: { color: OUTLINE, width: 3 } };
    const label = new Text({ text: isRef ? 'REF' : e.name.split(' ')[0]!, style: labelStyle });
    label.anchor.set(0.5, 1);
    label.y = -r * 4.5;
    const icons = new Text({ text: '', style: { fontSize: Math.max(10, r * 0.95) } });
    icons.anchor.set(0.5, 1);
    icons.y = -r * 5.6;
    bar.y = -r * 4.35;
    root.addChild(bar, label, icons);
    this.bodies.addChild(root);
    const s: CharSprite = { root, doll, eyes, held, bar, icons, label, lastHp: -1, lastIcons: '', lastState: '', lastHeld: -2 };
    this.drawEyes(s, e);
    return s;
  }

  private drawEyes(s: CharSprite, e: FrameEntity): void {
    const r = e.r * this.scale;
    const g = s.eyes;
    g.clear();
    const ey = -r * 2.95;
    if (e.state === 'ko') {
      for (const ex of [-r * 0.35, r * 0.35]) g.moveTo(ex - r * 0.15, ey - r * 0.15).lineTo(ex + r * 0.15, ey + r * 0.15).moveTo(ex + r * 0.15, ey - r * 0.15).lineTo(ex - r * 0.15, ey + r * 0.15);
      g.stroke({ width: Math.max(1.5, r * 0.12), color: OUTLINE });
    } else if (e.panicking) {
      g.circle(-r * 0.32, ey, r * 0.2).circle(r * 0.32, ey, r * 0.2).fill(0xffffff).stroke({ width: 1, color: OUTLINE });
      g.circle(-r * 0.32, ey, r * 0.08).circle(r * 0.32, ey, r * 0.08).fill(OUTLINE);
    } else {
      g.circle(-r * 0.1, ey, r * 0.11).circle(r * 0.45, ey, r * 0.11).fill(OUTLINE);
    }
  }

  private drawHeld(s: CharSprite, e: FrameEntity, frameProps: Map<number, FrameEntity>): void {
    const r = e.r * this.scale;
    s.held.clear();
    const heldProp = e.held >= 0 ? frameProps.get(e.held) : undefined;
    const snap = this.input.teams[e.team]?.characters.find((c) => c.id === e.snap);
    if (heldProp) return; // carried props render themselves
    if (snap?.held) {
      const def = bundle.equipment.find((x) => x.id === snap.held);
      const color = def?.tags.includes('material:metal') ? 0x9ca3af : def?.tags.includes('material:wood') ? 0x92400e : 0x475569;
      s.held.roundRect(r * 0.7, -r * 1.7, r * 0.35, r * 1.2, r * 0.1).fill(color).stroke({ width: 1, color: OUTLINE });
    }
  }

  private makeProp(e: FrameEntity): PropSprite {
    const def = bundle.props.find((p) => p.id === e.def);
    const root = new Container();
    const g = new Graphics();
    root.addChild(g);
    const s: PropSprite = { root, g, area: -1 };
    if (def?.art.shape === 'area') {
      this.areas.addChild(root);
    } else {
      const r = e.r * this.scale;
      const color = hex(def?.art.color ?? '#999999');
      g.ellipse(0, 0, r, r * 0.45).fill({ color: 0x000000, alpha: 0.15 });
      if (def?.art.shape === 'square') g.roundRect(-r, -r * 1.7, r * 2, r * 1.7, r * 0.2).fill(color).stroke({ width: Math.max(1, r * 0.12), color: OUTLINE });
      else g.circle(0, -r * 0.9, r * 0.9).fill(color).stroke({ width: Math.max(1, r * 0.12), color: OUTLINE });
      this.bodies.addChild(root);
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------
  render(player: ReplayPlayer, dtMs: number): void {
    if (!this.ready) return;
    const a = player.alpha;
    const prev = new Map(player.prev.entities.map((e) => [e.id, e]));
    const cur = player.cur.entities;
    const byId = new Map(cur.map((e) => [e.id, e]));
    const seenC = new Set<number>();
    const seenP = new Set<number>();
    for (const e of cur) {
      const p = prev.get(e.id) ?? e;
      const x = p.x + (e.x - p.x) * a;
      const y = p.y + (e.y - p.y) * a;
      const z = p.z + (e.z - p.z) * a;
      if (e.kind === 'prop') {
        seenP.add(e.id);
        let s = this.props.get(e.id);
        if (!s) this.props.set(e.id, (s = this.makeProp(e)));
        const [sx, sy] = this.px(x, y, z);
        s.root.position.set(sx, sy);
        s.root.zIndex = y + (e.z > 0 ? 400 : 0);
        if (e.area > 0 && Math.abs(e.area - s.area) > 5) {
          const def = bundle.props.find((pp) => pp.id === e.def);
          s.g.clear();
          const rr = e.area * this.scale;
          s.g.ellipse(0, 0, rr, rr * Y_SQUASH).fill({ color: hex(def?.art.color ?? '#4fa3e0'), alpha: 0.45 });
          s.area = e.area;
        }
        const live = e.statuses.includes('status.burning') || e.statuses.includes('status.electrified') || e.statuses.includes('status.live');
        s.root.alpha = live && player.tick % 4 < 2 ? 0.75 : 1;
        continue;
      }
      seenC.add(e.id);
      let s = this.chars.get(e.id);
      if (!s) this.chars.set(e.id, (s = this.makeChar(e)));
      const [sx, sy] = this.px(x, y, z);
      s.root.position.set(sx, sy);
      s.root.zIndex = y;
      s.doll.scale.x = e.fx < 0 ? -1 : 1;
      const down = e.state !== 'active' || e.statuses.includes('status.knocked-down');
      s.doll.rotation = down ? (e.fx < 0 ? -1.4 : 1.4) : e.statuses.includes('status.electrified') ? Math.sin(player.tick * 2.3) * 0.15 : 0;
      s.root.alpha = e.state === 'ko' ? 0.55 : 1;
      const stateKey = `${e.state}:${e.panicking}`;
      if (stateKey !== s.lastState) {
        this.drawEyes(s, e);
        s.lastState = stateKey;
      }
      if (e.held !== s.lastHeld) {
        this.drawHeld(s, e, byId);
        s.lastHeld = e.held;
      }
      if (e.hp !== s.lastHp) {
        const r = e.r * this.scale;
        const w = r * 2.4;
        const frac = e.maxHp > 0 ? Math.max(0, e.hp / e.maxHp) : 0;
        s.bar.clear();
        s.bar.rect(-w / 2, 0, w, Math.max(3, r * 0.28)).fill(0x111111);
        s.bar.rect(-w / 2, 0, w * frac, Math.max(3, r * 0.28)).fill(frac > 0.5 ? 0x22c55e : frac > 0.25 ? 0xf59e0b : 0xef4444);
        s.lastHp = e.hp;
      }
      const iconStr = (e.panicking ? '❗' : '') + [...new Set(e.statuses.map((st) => STATUS_ICONS[st] ?? ''))].join('');
      if (iconStr !== s.lastIcons) {
        s.icons.text = iconStr;
        s.lastIcons = iconStr;
      }
      s.label.visible = e.state !== 'ko';
    }
    for (const [id, s] of this.chars) if (!seenC.has(id)) s.root.visible = false;
    for (const [id, s] of this.props) {
      if (!seenP.has(id)) {
        s.root.destroy({ children: true });
        this.props.delete(id);
      }
    }
    for (const ev of player.drainEvents()) this.onEvent(ev, byId);
    this.tickFx(dtMs);
  }

  private posOf(id: number, byId: Map<number, FrameEntity>): [number, number] | null {
    const e = byId.get(id);
    if (!e) return null;
    const [x, y] = this.px(e.x, e.y, e.z);
    return [x, y - e.r * this.scale * 4.8];
  }

  private float(text: string, at: [number, number] | null, color: number, size = 14): void {
    if (!at || this.floaters.length > 60) return;
    const t = new Text({ text, style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '900', fill: color, stroke: { color: OUTLINE, width: 4 } } });
    t.anchor.set(0.5, 1);
    t.position.set(at[0] + (Math.random() - 0.5) * 10, at[1]);
    this.fx.addChild(t);
    this.floaters.push({ text: t, vy: -0.04, life: 1100, max: 1100 });
  }

  private announce(text: string): void {
    this.banner.text = text;
    this.bannerLife = 2200;
  }

  private onEvent(ev: BattleEvent, byId: Map<number, FrameEntity>): void {
    switch (ev.type) {
      case 'hit':
        this.float(`-${ev.v}`, this.posOf(ev.b, byId), 0xff5a5a, 13);
        break;
      case 'crit':
        this.float(`CRIT -${ev.v}`, this.posOf(ev.b, byId), 0xffd000, 17);
        break;
      case 'heal':
        this.float(`+${ev.v}`, this.posOf(ev.b, byId), 0x4ade80, 13);
        break;
      case 'abilityCast':
        this.float(nameOf(ev.s), this.posOf(ev.a, byId), 0xfff3a0, 15);
        break;
      case 'downed':
        this.float('DOWN!', this.posOf(ev.b, byId), 0xffffff, 18);
        break;
      case 'ko':
        this.float('KO!', this.posOf(ev.b, byId), 0xff3b3b, 24);
        break;
      case 'revived':
        this.float('REVIVED!', this.posOf(ev.b, byId), 0x4ade80, 18);
        break;
      case 'panic':
        this.float('PANIC!', this.posOf(ev.a, byId), 0xffa500, 16);
        break;
      case 'card':
        this.float('🟨 CARD', this.posOf(ev.b, byId), 0xffe600, 18);
        break;
      case 'taunt':
        if (ev.b < 0) this.float('😜', this.posOf(ev.a, byId), 0xffffff, 18);
        break;
      case 'refereeDown':
        this.announce('THE REFEREE IS DOWN!');
        break;
      case 'suddenDeath':
        this.announce(ev.v <= 1 ? 'SUDDEN DEATH' : `SUDDEN DEATH ×${ev.v}`);
        break;
      case 'hazardWarn':
        this.announce(`⚠ ${nameOf(ev.s).replace(/^Hazard\s*/i, '')}`);
        break;
      case 'explosion': {
        const e = byId.get(ev.b);
        const [x, y] = e ? this.px(e.x, e.y) : [0, 0];
        const g = new Graphics().circle(0, 0, ev.v * this.scale).fill({ color: 0xff7a00, alpha: 0.6 });
        g.position.set(x, y);
        g.scale.y = Y_SQUASH;
        this.fx.addChild(g);
        this.flashes.push({ g, life: 450, max: 450 });
        this.announce('BOOM!');
        break;
      }
      default:
        break;
    }
  }

  private tickFx(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.life -= dt;
      f.text.y += f.vy * dt;
      f.text.alpha = Math.min(1, f.life / 400);
      if (f.life <= 0) {
        f.text.destroy();
        this.floaters.splice(i, 1);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]!;
      f.life -= dt;
      f.g.alpha = f.life / f.max;
      f.g.scale.x = 1 + (1 - f.life / f.max) * 0.4;
      if (f.life <= 0) {
        f.g.destroy();
        this.flashes.splice(i, 1);
      }
    }
    if (this.bannerLife > 0) {
      this.bannerLife -= dt;
      this.banner.alpha = Math.min(1, this.bannerLife / 400);
    }
  }
}
