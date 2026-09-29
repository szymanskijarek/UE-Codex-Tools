// CSP-safe shader/uniform code paths: the artifact host and strict deployments forbid eval.
import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Sprite, Text, Texture, type TextStyleOptions } from 'pixi.js';
import { bundle } from '@cc/content';
import type { AbilityDef, ArenaDef } from '@cc/content-schema';
import { layoutArena, type BattleEvent, type BattleInput, type FrameEntity, type PlacedObstacle } from '@cc/sim';
import { nameOf, STATUS_ICONS } from '../i18n';
import { Sfx, type SfxName } from './audio';
import type { ReplayPlayer } from './player';
import { arenaArt, type ArenaArt } from './arena-art';
import { drawArea, drawProp } from './props-art';
import { drawHeavy, heavyLength } from './heavy-art';
import { heavySprite, heldIsTool, heldSprite, loadItems, propSprite, wallSprite } from './items';
import { extension, hitPose, MOVES, repertoire, type HitStyle, type Move } from './moves';
import { drawWall } from './wall-art';
import { hasPuppet, loadPuppets, NEUTRAL, Puppet, type Pose } from './puppet';
import { Ragdoll } from './ragdoll';
import { voiceFor, type Shout, type Voice } from './voices';

/**
 * Battle renderer (04 R-3): PixiJS scene graph in a 3/4 "stage" projection
 * (02 §2). Characters are paper dolls (body, arms, head, face, hair, hat,
 * held item) animated from the simulation frames plus cosmetic reactions to
 * events — flinches, lunges, expressions, speech bubbles and bystander
 * reactions. None of this feeds back into the simulation.
 */
const Y_SQUASH = 0.62;
const Z_LIFT = 0.55;
const WALL_H = 1100;
const TEAM_COLORS = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0xa855f7, 0x14b8a6, 0xec4899, 0x64748b];
const OUTLINE = 0x1b1f2a;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const MOVERS = new Set(bundle.props.filter((p) => p.mover).map((p) => p.id));
/**
 * How a launched body looks in the air: `launch` — beat-'em-up knockback, body
 * tipping back towards horizontal with arms and legs thrown forward; `spin` —
 * tucked somersaults; `flail` — windmilling arms and running legs.
 */
type FlightStyle = 'launch' | 'spin' | 'flail';

const HEAVY = new Set(bundle.props.filter((p) => p.heavy).map((p) => p.id));
const isMover = (def: string): boolean => MOVERS.has(def);
const hex = (s: string): number => parseInt(s.replace('#', ''), 16);
const rand = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

type Expr = 'neutral' | 'angry' | 'hurt' | 'scared' | 'happy' | 'ko' | 'stunned' | 'sleepy';

interface CharSprite {
  id: number;
  r: number;
  root: Container;
  doll: Container;
  torso: Container;
  armBack: Graphics;
  armFront: Container;
  /** Held item: a container at the hand holding either item art or a drawn stand-in (heldG). */
  held: Container;
  heldG: Graphics;
  head: Container;
  face: Graphics;
  feet: Graphics;
  fx: Graphics;
  bar: Graphics;
  label: Text;
  icons: Text;
  lastHp: number;
  lastIcons: string;
  lastHeldKey: string;
  expr: Expr;
  drawnExpr: Expr | '';
  exprUntil: number;
  lungeUntil: number;
  hitUntil: number;
  throwUntil: number;
  castUntil: number;
  castColor: number;
  flashUntil: number;
  flashColor: number;
  bubble: Container | null;
  bubbleUntil: number;
  lastBubbleAt: number;
  lastShoutAt: number;
  knockX: number;
  moving: boolean;
  x: number;
  y: number;
  team: number;
  kind: 'char' | 'npc';
  personality: string;
  /** Director interest: rises with events around this character, decays over time. */
  heat: number;
  /** Floppy ragdoll while thrown / knocked down / KO'd (cosmetic). */
  rag: Ragdoll | null;
  ragG: Graphics | null;
  /** Sprite puppet built from career art (replaces the paper doll when available). */
  puppet: Puppet | null;
  emote: Text | null;
  /** When the current ragdoll started (ms) and whether the puppet is in crawl mode. */
  ragAt: number;
  crawling: boolean;
  /** Melee move being wound up / struck (puppets), its end time and the character's repertoire. */
  move: Move | null;
  moveUntil: number;
  /** A heavy-weapon swing is landing until then (bigger hit reactions). */
  heavyUntil: number;
  /** What the repertoire was built for ('' bare hands, 'w' weapon, 'h' heavy). */
  repFor: string;
  /** The item in hand is gripped like a tool (bends at the wrist through a swing). */
  heldTool: boolean;
  /** Wrapper that mirrors tool art back across its own axis when facing left (keeps sign text readable). */
  heldFlip: Container | null;
  wasWinding: boolean;
  repertoire: Move[] | null;
  lastMove: Move | null;
  lastMove2: Move | null;
  hitStyle: HitStyle;
  /** Evade/dash burst (lean into the motion) and parry guard, with screen direction of travel. */
  dashUntil: number;
  dashDir: number;
  parryUntil: number;
  /** Airborne flight (puppets): style, start time, travel direction, spin rate and last centre. */
  flight: { style: FlightStyle; t0: number; dir: number; spin: number; x: number; y: number; vx: number; vy: number } | null;
  /** How the next flight should look (set by the hit that causes it). */
  flightHint: { style: FlightStyle; at: number } | null;
  /** Perspective size factor at the character's depth. */
  depth: number;
  lastEmote: string;
  kick: { dx: number; dy: number; spin: number; at: number } | null;
  colors: { body: number; skin: number; hair: number };
  career: string;
  voice: Voice;
  alive: boolean;
  intent: Text;
  lastIntent: string;
}

interface PropSprite {
  root: Container;
  g: Graphics;
  area: number;
  isArea: boolean;
  animated: boolean;
  color: number;
  seed: number;
}

interface Fx {
  g: Container;
  life: number;
  max: number;
  update?: (k: number) => void;
}

const ABILITY_COLORS: Record<string, number> = { fire: 0xff7a1a, electric: 0xffe14a, water: 0x3ba7ff, social: 0xc084fc, heal: 0x4ade80, stun: 0xffffff, default: 0xfff3a0 };

function abilityColor(ab: AbilityDef | undefined): number {
  if (!ab) return ABILITY_COLORS.default!;
  const eff = ab.effects ?? [];
  if (eff.some((e) => e.type === 'damage' && e.damageType === 'fire') || eff.some((e) => e.type === 'applyStatus' && e.status === 'status.burning')) return ABILITY_COLORS.fire!;
  if (eff.some((e) => e.type === 'damage' && e.damageType === 'electric') || eff.some((e) => e.type === 'applyStatus' && e.status === 'status.electrified')) return ABILITY_COLORS.electric!;
  if (eff.some((e) => e.type === 'applyStatus' && (e.status === 'status.wet' || e.status === 'status.slipping'))) return ABILITY_COLORS.water!;
  if (eff.some((e) => e.type === 'heal')) return ABILITY_COLORS.heal!;
  if (eff.some((e) => (e.type === 'damage' && e.damageType === 'social') || (e.type === 'applyStatus' && (e.status === 'status.embarrassed' || e.status === 'status.distracted')) || e.type === 'taunt' || e.type === 'morale')) return ABILITY_COLORS.social!;
  if (eff.some((e) => e.type === 'applyStatus' && e.status === 'status.stunned')) return ABILITY_COLORS.stun!;
  return ABILITY_COLORS.default!;
}

function sfxForAbility(color: number): SfxName {
  if (color === ABILITY_COLORS.fire) return 'fire';
  if (color === ABILITY_COLORS.electric) return 'zap';
  if (color === ABILITY_COLORS.water) return 'splash';
  if (color === ABILITY_COLORS.heal) return 'heal';
  if (color === ABILITY_COLORS.social) return 'blah';
  return 'power';
}

export class BattleRenderer {
  app = new Application();
  readonly sfx = new Sfx();
  private world = new Container();
  private floor = new Container();
  private areas = new Container();
  private bodies = new Container();
  private fxLayer = new Container();
  private uiLayer = new Container();
  private banner!: Text;
  private bannerLife = 0;
  private chars = new Map<number, CharSprite>();
  private props = new Map<number, PropSprite>();
  private fx: Fx[] = [];
  private scale = 0.04;
  private arena!: ArenaDef;
  private ready = false;
  private observer: ResizeObserver | null = null;
  private now = 0;
  private obstacles: PlacedObstacle[] = [];
  /** One view per arena wall (index-aligned with the sim): toppling, wobble and damage looks. */
  private wallViews: { c: Container; cx: number; by: number; z: number; brokenAt: number; wobbleUntil: number; dir: number; h: number }[] = [];
  /** Persistent floor decals (splats, rubble, cracks): shown only from the tick they happened. */
  private decalLayer = new Container();
  private decals: { g: Graphics; tick: number }[] = [];
  /** Hit stop: real-time instant until which the battle is frozen, and the impact flash. */
  private freezeUntil = 0;
  private impactFlash = new Graphics();
  private impactAlpha = 0;
  private curTick = 0;
  /** Animated arrows on conveyor belts. */
  private beltG: Graphics | null = null;
  /** Projection: vertical squash, and back-row width relative to the front row (perspective). */
  private ysq = Y_SQUASH;
  private persp = 1;
  private art: ArenaArt | null = null;
  private artTex: Texture | null = null;
  /** Screen-space extent of the world (painted backdrop or arena + wall band), for the camera. */
  private bounds = { x0: 0, y0: 0, x1: 1, y1: 1 };
  private frameDt = 16;
  private shake = 0;
  private cam = { x: 0, y: 0, z: 1 };
  private compact = false;
  private refId = -1;
  private overlay = new Container();
  private replayFocus: number[] | null = null;
  private replayBadge: Text | null = null;
  private replayLabel = '● ACTION REPLAY';
  /** Replay zoom lens: follows the action on screen when the camera can't (arena edges). */
  private lens: Graphics | null = null;
  private lensPos = { x: 0, y: 0 };

  constructor(private input: BattleInput) {}

  async mount(el: HTMLElement): Promise<void> {
    // Same per-battle layout the simulation used (obstacle picks, jitter, prop spots).
    const layout = layoutArena(bundle.arenas.find((a) => a.id === this.input.arenaId)!, this.input.seed);
    this.arena = layout.arena;
    this.obstacles = layout.obstacles;
    await this.app.init({ preference: 'webgl', resizeTo: el, background: hex(this.arena.theme.wall), antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
    el.appendChild(this.app.canvas);
    this.art = arenaArt(this.arena.id);
    await Promise.all([loadPuppets(), this.loadBackdrop(), loadItems()]);
    this.bodies.sortableChildren = true;
    this.world.addChild(this.floor, this.decalLayer, this.areas, this.bodies, this.fxLayer, this.uiLayer);
    this.app.stage.addChild(this.world);
    this.banner = new Text({ text: '', style: { fontFamily: FONT, fontSize: 22, fontWeight: '900', fill: 0xffffff, stroke: { color: OUTLINE, width: 5 }, align: 'center' } });
    this.banner.anchor.set(0.5, 0);
    this.app.stage.addChild(this.banner);
    this.app.stage.addChild(this.overlay);
    this.app.stage.addChild(this.impactFlash);
    this.layout();
    this.app.renderer.on('resize', () => this.layout());
    // resizeTo only tracks window resizes; the stage box can change size on its own (fonts, wrapping, phones).
    this.observer = new ResizeObserver(() => this.app.resize());
    this.observer.observe(el);
    el.addEventListener('pointerdown', () => this.sfx.unlock());
    this.sfx.unlock();
    this.ready = true;
  }

  destroy(): void {
    this.observer?.disconnect();
    this.sfx.close();
    if (this.ready) this.app.destroy(true, { children: true });
    this.ready = false;
  }

  /** Clear transient effects (after seeking). */
  resetFx(): void {
    for (const f of this.fx) f.g.destroy({ children: true });
    this.fx = [];
    for (const s of this.chars.values()) {
      s.bubble?.destroy({ children: true });
      s.bubble = null;
      // Seeks and resizes teleport everyone; stale ragdolls would stretch across the screen.
      this.dropRagdoll(s);
      s.kick = null;
    }
  }

  private dropRagdoll(s: CharSprite): void {
    s.ragG?.destroy();
    s.ragG = null;
    s.rag = null;
    s.doll.visible = !s.puppet;
    s.puppet?.settle(300);
  }

  /** Hit stop: freeze the battle for a beat on big impacts (a little longer in slow-mo replays). */
  hitStop(ms: number, flash = 0): void {
    this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms * (this.replayFocus ? 1.8 : 1));
    if (flash > 0) {
      const sw = this.app.screen.width;
      const sh = this.app.screen.height;
      this.impactFlash.clear().rect(0, 0, sw, sh).fill(0xffffff);
      this.impactAlpha = Math.max(this.impactAlpha, flash);
    }
  }

  /** 0 while frozen by hit stop, else 1: the replay loop scales simulation time by this. */
  timeScale(): number {
    return performance.now() < this.freezeUntil ? 0 : 1;
  }

  /** Obstacles wobble when hit, look battered as they lose health, and topple over when broken. */
  private updateWalls(player: ReplayPlayer): void {
    const w = player.world;
    this.wallViews.forEach((v, i) => {
      const broken = !!w.wallBroken[i];
      const frac = w.wallMaxHp[i] ? (w.wallHp[i] ?? 0) / w.wallMaxHp[i]! : 1;
      v.c.pivot.set(v.cx, v.by);
      if (broken) {
        if (v.brokenAt < 0) v.brokenAt = this.now;
        const k = Math.min(1, (this.now - v.brokenAt) / 480);
        // Ease-in fall with a little bounce at the end.
        const fall = k < 0.8 ? (k / 0.8) ** 2 : 1 - Math.sin(((k - 0.8) / 0.2) * Math.PI) * 0.06;
        v.c.rotation = v.dir * 1.35 * fall;
        v.c.position.set(v.cx + v.dir * v.h * 0.15 * fall, v.by + v.h * 0.12 * fall);
        v.c.tint = 0xb8b8b8;
        v.c.zIndex = v.z - 1500;
        return;
      }
      if (v.brokenAt >= 0) v.brokenAt = -1; // replay seeked back to before it fell
      let rot = (1 - frac) * 0.06 * v.dir;
      if (this.now < v.wobbleUntil) rot += Math.sin((v.wobbleUntil - this.now) / 22) * 0.05 * ((v.wobbleUntil - this.now) / 300);
      v.c.rotation = rot;
      v.c.position.set(v.cx, v.by);
      v.c.tint = frac > 0.66 ? 0xffffff : frac > 0.33 ? 0xe8e2da : 0xd2c8bc;
      v.c.zIndex = v.z;
    });
  }

  private decal(draw: (g: Graphics) => void): void {
    const g = new Graphics();
    draw(g);
    this.decalLayer.addChild(g);
    this.decals.push({ g, tick: this.curTick });
    if (this.decals.length > 80) this.decals.shift()!.g.destroy();
  }

  /** A splat of bits in the colour of whatever broke. */
  private splat(at: [number, number] | null, color: number, size: number): void {
    if (!at) return;
    const [x, y] = at;
    const bits = Array.from({ length: 9 }, () => [(Math.random() - 0.5) * size * 2.2, (Math.random() - 0.5) * size * 0.9, size * (0.12 + Math.random() * 0.22)] as const);
    this.decal((g) => {
      g.ellipse(x, y, size * 0.8, size * 0.32).fill({ color, alpha: 0.35 });
      for (const [dx, dy, r] of bits) g.circle(x + dx, y + dy, r).fill({ color, alpha: 0.85 });
    });
  }

  private drawBelts(t: number): void {
    const g = this.beltG;
    if (!g) return;
    g.clear();
    for (const o of this.obstacles) {
      if (!o.belt) continue;
      const [x, y, w, h] = o.rect;
      const dir = Math.sign(o.belt[0]) || 1;
      const step = 700;
      const off = ((t * Math.abs(o.belt[0]) * 20) % step) * dir;
      for (let ax = x - step; ax < x + w + step; ax += step) {
        const cx = ax + off;
        if (cx < x + 150 || cx > x + w - 150) continue;
        const [px, py] = this.px(cx, y + h / 2);
        const s = 160 * this.scale;
        g.moveTo(px - s * dir, py - s * 0.6).lineTo(px, py).lineTo(px - s * dir, py + s * 0.6);
      }
    }
    g.stroke({ width: Math.max(2, 70 * this.scale), color: 0xfacc15, alpha: 0.85 });
  }

  /** Belly-crawling: after a knockdown at low HP, or downed and dragging towards help. */
  private isCrawling(e: FrameEntity): boolean {
    return (e.state === 'downed' || e.statuses.includes('status.crawling')) && !e.statuses.includes('status.knocked-down') && !e.statuses.includes('status.airborne') && e.z <= 60;
  }

  private async loadBackdrop(): Promise<void> {
    if (!this.art) return;
    const img = new Image();
    img.src = this.art.url;
    try {
      await img.decode();
      this.artTex = Texture.from(img);
    } catch {
      this.art = null;
    }
  }

  private layout(): void {
    const [W, H] = this.arena.sizeMm;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    this.compact = sw < 700;
    const art = this.artTex ? this.art : null;
    if (art) {
      // Map the arena rectangle onto the painting's floor trapezoid.
      const f = art.floor;
      this.persp = f.topHalf / f.bottomHalf;
      this.ysq = ((f.bottom - f.top) * art.h * W) / (2 * f.bottomHalf * art.w * H);
      // Screen px of the whole painting per unit of `scale`.
      const imgW = W / (2 * f.bottomHalf);
      const imgH = (imgW * art.h) / art.w;
      // Desktop: the whole painting fits. Phones: fit its height and pan sideways.
      this.scale = this.compact ? sh / imgH : Math.min(sw / imgW, sh / imgH);
      const x0 = (W / 2 - imgW / 2) * this.scale;
      const y0 = -f.top * imgH * this.scale;
      this.bounds = { x0, y0, x1: x0 + imgW * this.scale, y1: y0 + imgH * this.scale };
    } else {
      this.persp = 1;
      this.ysq = Y_SQUASH;
      const worldH = H * this.ysq + WALL_H * Z_LIFT;
      // Phones: fit the arena's height and let the camera pan sideways, so fighters stay readable.
      this.scale = this.compact ? (sh - 16) / worldH : Math.min((sw - 16) / W, (sh - 40) / worldH);
      this.bounds = { x0: 0, y0: -WALL_H * Z_LIFT * this.scale, x1: W * this.scale, y1: H * this.ysq * this.scale };
    }
    this.cam = { x: (this.bounds.x0 + this.bounds.x1) / 2, y: (this.bounds.y0 + this.bounds.y1) / 2, z: 1 };
    this.banner.x = sw / 2;
    this.banner.y = 8;
    this.banner.style.fontSize = this.compact ? 16 : 22;
    this.drawFloor();
    this.drawOverlay();
    for (const d of this.decals) d.g.destroy();
    this.decals = [];
    for (const s of this.chars.values()) {
      s.root.destroy({ children: true });
      s.ragG?.destroy();
      s.puppet?.root.destroy({ children: true });
    }
    this.chars.clear();
    for (const s of this.props.values()) s.root.destroy({ children: true });
    this.props.clear();
    this.resetFx();
  }

  private px(x: number, y: number, z = 0): [number, number] {
    const W = this.arena.sizeMm[0];
    return [(W / 2 + (x - W / 2) * this.depth(y)) * this.scale, (y * this.ysq - z * Z_LIFT) * this.scale];
  }

  /** Size factor at arena depth y: 1 at the front edge, `persp` at the back. */
  private depth(y: number): number {
    if (this.persp === 1) return 1;
    const H = this.arena.sizeMm[1];
    return this.persp + (1 - this.persp) * Math.max(-0.1, Math.min(1.1, y / H));
  }

  private drawFloor(): void {
    this.floor.removeChildren().forEach((c) => c.destroy());
    for (const c of [...this.bodies.children]) if ((c as Container & { isWall?: boolean }).isWall) c.destroy();
    const [W, H] = this.arena.sizeMm;
    const g = new Graphics();
    const [fw, fh] = this.px(W, H);
    if (this.artTex) {
      const b = this.bounds;
      const bg = new Sprite(this.artTex);
      bg.position.set(b.x0, b.y0);
      bg.width = b.x1 - b.x0;
      bg.height = b.y1 - b.y0;
      this.floor.addChild(bg);
      this.drawStations(0.1);
      this.drawWalls();
      return;
    }
    g.rect(0, 0, fw, fh).fill(hex(this.arena.theme.floor));
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
    this.drawStations(0.18);
    this.drawWalls();
  }

  /** Location signage painted on the floor, so viewers know where each scrap is happening. */
  private drawStations(fill: number): void {
    for (const st of this.arena.stations) {
      const [sx, sy] = this.px(st.at[0], st.at[1]);
      const k = this.depth(st.at[1]);
      const mark = new Graphics().ellipse(sx, sy, 2200 * this.scale * k, 2200 * this.scale * this.ysq).fill({ color: 0xffffff, alpha: fill }).stroke({ width: 2, color: hex(this.arena.theme.accent), alpha: 0.35 });
      const label = new Text({ text: st.name.replace(/^the /i, '').toUpperCase(), style: { fontFamily: FONT, fontSize: Math.max(8, 420 * this.scale), fontWeight: '900', fill: hex(this.arena.theme.accent), letterSpacing: 1 }, resolution: 3 });
      label.alpha = 0.55;
      label.anchor.set(0.5, 0.5);
      label.position.set(sx, sy + 1500 * this.scale * this.ysq);
      this.floor.addChild(mark, label);
    }
  }

  private drawWalls(): void {
    // Conveyors lie on the floor, under everyone.
    this.beltG = null;
    for (const o of this.obstacles) {
      if (!o.belt) continue;
      const [x, y, w, h] = o.rect;
      const [x0, y0] = this.px(x, y);
      const [x1, y1] = this.px(x + w, y + h);
      const art = wallSprite(o.art, (x1 - x0) * 1.05);
      if (art) {
        art.position.set((x0 + x1) / 2, y1 + (y1 - y0) * 0.4);
        this.floor.addChild(art);
      }
      this.beltG ??= new Graphics();
    }
    if (this.beltG) this.floor.addChild(this.beltG);
    this.wallViews = [];
    for (const [x, y, w, h] of this.arena.walls) {
      const [vx0] = this.px(x, y);
      const [vx1, vy1] = this.px(x + w, y + h);
      const view = { c: new Container(), cx: (vx0 + vx1) / 2, by: vy1, z: y + h, brokenAt: -1, wobbleUntil: 0, dir: 1, h: WALL_H * Z_LIFT * this.scale };
      this.wallViews.push(view);
      const ob = this.obstacles.find((o) => !o.belt && o.rect[0] === x && o.rect[1] === y && o.rect[2] === w && o.rect[3] === h);
      const wall = new Graphics() as Graphics & { isWall?: boolean };
      wall.isWall = true;
      const [x0, y0] = this.px(x, y);
      const [x1, y1] = this.px(x + w, y + h);
      const lift = WALL_H * Z_LIFT * this.scale * this.depth(y + h);
      // Painted obstacle art: sized to the footprint (a deep, narrow block gets a sideways-on piece of furniture).
      const art = ob ? wallSprite(ob.art, Math.max(x1 - x0, (y1 - y0) * 1.2) * 1.12) : null;
      if (art) {
        const c = new Container() as Container & { isWall?: boolean };
        c.isWall = true;
        art.position.set((x0 + x1) / 2, y1);
        c.addChild(art);
        c.zIndex = y + h;
        this.bodies.addChild(c);
        view.c = c;
        view.h = art.height;
        continue;
      }
      view.c = wall;
      if (drawWall(wall, this.arena.id, x0, y0, x1, y1, lift)) {
        wall.zIndex = y + h;
        this.bodies.addChild(wall);
        continue;
      }
      wall.rect(x0, y1 - lift, x1 - x0, lift).fill(hex(this.arena.theme.wall)).stroke({ width: 2, color: OUTLINE });
      wall.rect(x0, y0 - lift, x1 - x0, y1 - y0).fill(hex(this.arena.theme.accent)).stroke({ width: 2, color: OUTLINE });
      // Shelf goods: little coloured blocks so walls read as shelves/desks.
      const n = Math.max(2, Math.floor((x1 - x0) / 10));
      for (let i = 0; i < n; i++) {
        const bx = x0 + 2 + ((x1 - x0 - 4) * i) / n;
        wall.rect(bx, y1 - lift + 3, (x1 - x0) / n - 2, lift * 0.35).fill([0xfbbf24, 0xef4444, 0x22c55e, 0x60a5fa, 0xf472b6][i % 5]!);
      }
      wall.zIndex = y + h;
      this.bodies.addChild(wall);
    }
  }

  // ---------------------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------------------
  private snapOf(e: FrameEntity) {
    return this.input.teams[e.team]?.characters.find((c) => c.id === e.snap);
  }

  private makeChar(e: FrameEntity): CharSprite {
    const r = e.r * this.scale;
    const snap = this.snapOf(e);
    const career = bundle.careers.find((c) => c.id === e.def);
    const isRef = e.kind === 'npc';
    if (isRef) this.refId = e.id;
    const bodyColor = isRef ? 0xffffff : hex(career?.art.color ?? '#999999');
    const hatColor = career?.art.hat ? hex(career.art.hat) : null;
    const skin = hex(snap?.appearance.skin ?? '#e0ac69');
    const hair = hex(snap?.appearance.hair ?? '#3b2a1a');
    const line = Math.max(1.2, r * 0.14);

    const root = new Container();
    const shadow = new Graphics().ellipse(0, 0, r * 1.1, r * 0.45).fill({ color: 0x000000, alpha: 0.18 });
    const ring = new Graphics().ellipse(0, 0, r * 1.15, r * 0.5).stroke({ width: Math.max(2, r * 0.18), color: isRef ? 0x111111 : TEAM_COLORS[e.team % TEAM_COLORS.length]! });
    const doll = new Container();
    const feet = new Graphics();
    const torso = new Container();
    root.addChild(shadow, ring, doll);
    doll.addChild(feet, torso);

    const armColor = isRef ? 0xffffff : bodyColor;
    const armBack = new Graphics().roundRect(-r * 0.18, 0, r * 0.36, r * 1.05, r * 0.18).fill(armColor).stroke({ width: line * 0.8, color: OUTLINE });
    armBack.position.set(-r * 0.55, -r * 1.95);
    const body = new Graphics().roundRect(-r * 0.8, -r * 2.1, r * 1.6, r * 1.9, r * 0.45).fill(bodyColor).stroke({ width: line, color: OUTLINE });
    if (isRef) for (let i = -2; i <= 2; i++) body.rect(i * r * 0.32 - r * 0.07, -r * 2.05, r * 0.14, r * 1.8).fill(0x111111);
    else body.rect(-r * 0.8, -r * 0.75, r * 1.6, r * 0.18).fill({ color: 0x000000, alpha: 0.25 });
    const armFront = new Container();
    armFront.position.set(r * 0.55, -r * 1.95);
    const armG = new Graphics().roundRect(-r * 0.18, 0, r * 0.36, r * 1.05, r * 0.18).fill(armColor).stroke({ width: line * 0.8, color: OUTLINE });
    const hand = new Graphics().circle(0, r * 1.08, r * 0.2).fill(skin).stroke({ width: line * 0.6, color: OUTLINE });
    const held = new Container();
    const heldG = new Graphics();
    held.addChild(heldG);
    held.position.set(0, r * 1.08);
    armFront.addChild(armG, held, hand);
    torso.addChild(armBack, body, armFront);

    const head = new Container();
    head.position.set(0, -r * 2.9);
    const headG = new Graphics().circle(0, 0, r * 0.95).fill(skin).stroke({ width: line, color: OUTLINE });
    const style = snap?.appearance.hairStyle ?? 0;
    const hairG = new Graphics();
    if (style % 3 === 0) hairG.arc(0, -r * 0.05, r * 0.95, Math.PI, 0).fill(hair);
    else if (style % 3 === 1) hairG.rect(-r * 0.95, -r * 0.95, r * 1.9, r * 0.55).fill(hair);
    else hairG.circle(-r * 0.6, -r * 0.6, r * 0.4).circle(r * 0.6, -r * 0.6, r * 0.4).circle(0, -r * 0.85, r * 0.45).fill(hair);
    const face = new Graphics();
    head.addChild(headG, hairG, face);
    if (hatColor !== null && !isRef) {
      const hat = new Graphics().roundRect(-r * 0.85, -r * 1.15, r * 1.7, r * 0.55, r * 0.2).fill(hatColor).stroke({ width: Math.max(1, r * 0.1), color: OUTLINE });
      hat.rect(r * 0.2, -r * 0.72, r * 0.95, r * 0.18).fill(hatColor);
      head.addChild(hat);
    }
    if (isRef) head.addChild(new Graphics().rect(-r * 0.2, r * 0.5, r * 0.4, r * 0.18).fill(0x111111)); // whistle
    torso.addChild(head);

    const fxG = new Graphics();
    const bar = new Graphics();
    bar.y = -r * 4.35;
    const labelStyle: TextStyleOptions = { fontFamily: FONT, fontSize: Math.max(9, r * 0.75), fontWeight: '800', fill: 0xffffff, stroke: { color: OUTLINE, width: 3 } };
    const jobIcon = career?.art.icon ?? '';
    const label = new Text({ text: isRef ? 'REF' : `${jobIcon} ${e.name.split(' ')[0] ?? e.name}`.trim(), style: labelStyle, resolution: 3 });
    label.anchor.set(0.5, 1);
    label.y = -r * 4.5;
    const icons = new Text({ text: '', style: { fontSize: Math.max(9, r * 0.8) }, resolution: 3 });
    icons.anchor.set(0.5, 1);
    icons.y = -r * 5.5;
    // Intent icon: what this character is about to do (throw, grab, ride, flee...).
    const intent = new Text({ text: '', style: { fontSize: Math.max(10, r * 0.95) }, resolution: 3 });
    intent.anchor.set(0, 1);
    intent.position.set(r * 1.25, -r * 3.4);
    root.addChild(fxG, bar, label, icons, intent);
    this.bodies.addChild(root);
    // Career art available → sprite puppet instead of the paper doll.
    const puppet = !isRef && career && hasPuppet(career.id) ? new Puppet(career.id, r) : null;
    let emote: Text | null = null;
    if (puppet) {
      doll.visible = false;
      puppet.root.addChild(held);
      this.bodies.addChild(puppet.root);
      for (const t of [bar, label, icons]) t.y -= r * 0.9;
      intent.y -= r * 0.8;
      emote = new Text({ text: '', style: { fontSize: Math.max(10, r * 0.95) }, resolution: 3 });
      emote.anchor.set(0.5, 1);
      emote.position.set(-r * 1.4, -r * 4.2);
      root.addChild(emote);
    }
    return {
      id: e.id,
      r,
      root,
      doll,
      torso,
      armBack,
      armFront,
      held,
      heldG,
      head,
      face,
      feet,
      fx: fxG,
      bar,
      label,
      icons,
      lastHp: -1,
      lastIcons: '',
      lastHeldKey: '',
      expr: 'neutral',
      drawnExpr: '',
      exprUntil: 0,
      lungeUntil: 0,
      hitUntil: 0,
      throwUntil: 0,
      castUntil: 0,
      castColor: 0xffffff,
      flashUntil: 0,
      flashColor: 0xffffff,
      bubble: null,
      bubbleUntil: 0,
      lastBubbleAt: -99999,
      lastShoutAt: 0,
      knockX: 0,
      moving: false,
      x: 0,
      y: 0,
      team: e.team,
      kind: isRef ? 'npc' : 'char',
      personality: snap?.personality ?? '',
      heat: 0,
      rag: null,
      ragG: null,
      puppet,
      emote,
      ragAt: 0,
      crawling: false,
      move: null,
      moveUntil: 0,
      heavyUntil: 0,
      flight: null,
      flightHint: null,
      repFor: '',
      heldTool: false,
      heldFlip: null,
      wasWinding: false,
      repertoire: null,
      lastMove: null,
      lastMove2: null,
      hitStyle: 'side',
      dashUntil: 0,
      dashDir: 1,
      parryUntil: 0,
      depth: 1,
      lastEmote: '',
      kick: null,
      colors: { body: bodyColor, skin, hair },
      career: (career?.id ?? '').replace('career.', ''),
      voice: voiceFor((career?.id ?? '').replace('career.', ''), snap?.id ?? `${e.id}`, snap?.personality ?? '', isRef),
      alive: true,
      intent,
      lastIntent: '',
    };
  }

  private drawFace(s: CharSprite, expr: Expr): void {
    const r = s.r;
    const g = s.face;
    g.clear();
    const ey = -r * 0.05;
    const w = Math.max(1.2, r * 0.12);
    const L = -r * 0.1;
    const R = r * 0.45;
    switch (expr) {
      case 'ko':
        for (const ex of [L, R]) g.moveTo(ex - r * 0.15, ey - r * 0.15).lineTo(ex + r * 0.15, ey + r * 0.15).moveTo(ex + r * 0.15, ey - r * 0.15).lineTo(ex - r * 0.15, ey + r * 0.15);
        g.stroke({ width: w, color: OUTLINE });
        g.moveTo(L, r * 0.45).lineTo(R, r * 0.45).stroke({ width: w, color: OUTLINE });
        break;
      case 'scared':
        g.circle(L, ey, r * 0.22).circle(R, ey, r * 0.22).fill(0xffffff).stroke({ width: 1, color: OUTLINE });
        g.circle(L, ey, r * 0.08).circle(R, ey, r * 0.08).fill(OUTLINE);
        g.ellipse((L + R) / 2, r * 0.45, r * 0.14, r * 0.2).fill(OUTLINE);
        break;
      case 'hurt':
        g.moveTo(L - r * 0.14, ey - r * 0.1).lineTo(L + r * 0.12, ey).lineTo(L - r * 0.14, ey + r * 0.1);
        g.moveTo(R + r * 0.14, ey - r * 0.1).lineTo(R - r * 0.12, ey).lineTo(R + r * 0.14, ey + r * 0.1);
        g.stroke({ width: w, color: OUTLINE });
        g.moveTo(L, r * 0.5).quadraticCurveTo((L + R) / 2, r * 0.3, R, r * 0.5).stroke({ width: w, color: OUTLINE });
        break;
      case 'angry':
        g.moveTo(L - r * 0.18, ey - r * 0.3).lineTo(L + r * 0.15, ey - r * 0.15).moveTo(R + r * 0.18, ey - r * 0.3).lineTo(R - r * 0.15, ey - r * 0.15).stroke({ width: w, color: OUTLINE });
        g.circle(L, ey, r * 0.1).circle(R, ey, r * 0.1).fill(OUTLINE);
        g.moveTo(L, r * 0.45).lineTo(R, r * 0.4).stroke({ width: w, color: OUTLINE });
        break;
      case 'happy':
        g.moveTo(L - r * 0.12, ey + r * 0.05).quadraticCurveTo(L, ey - r * 0.15, L + r * 0.12, ey + r * 0.05);
        g.moveTo(R - r * 0.12, ey + r * 0.05).quadraticCurveTo(R, ey - r * 0.15, R + r * 0.12, ey + r * 0.05);
        g.stroke({ width: w, color: OUTLINE });
        g.moveTo(L - r * 0.05, r * 0.3).quadraticCurveTo((L + R) / 2, r * 0.7, R + r * 0.05, r * 0.3).fill(0x7f1d1d).stroke({ width: w, color: OUTLINE });
        break;
      case 'stunned':
        for (const ex of [L, R]) g.circle(ex, ey, r * 0.16).circle(ex, ey, r * 0.07);
        g.stroke({ width: w * 0.7, color: OUTLINE });
        g.moveTo(L, r * 0.45).quadraticCurveTo((L + R) / 2, r * 0.6, R, r * 0.4).stroke({ width: w, color: OUTLINE });
        break;
      case 'sleepy':
        g.moveTo(L - r * 0.12, ey).lineTo(L + r * 0.12, ey).moveTo(R - r * 0.12, ey).lineTo(R + r * 0.12, ey).stroke({ width: w, color: OUTLINE });
        break;
      default:
        g.circle(L, ey, r * 0.11).circle(R, ey, r * 0.11).fill(OUTLINE);
        g.moveTo(L, r * 0.42).quadraticCurveTo((L + R) / 2, r * 0.55, R, r * 0.42).stroke({ width: w * 0.9, color: OUTLINE });
    }
  }

  private drawHeld(s: CharSprite, e: FrameEntity, byId: Map<number, FrameEntity>): void {
    const r = s.r;
    const carried = e.held >= 0 ? byId.get(e.held) : undefined;
    const heavy = carried && HEAVY.has(carried.def) ? carried.def : '';
    const key = `${e.held}:${heavy}:${e.weapon}`;
    if (key === s.lastHeldKey) return;
    s.lastHeldKey = key;
    s.heldG.clear();
    s.heldFlip = null;
    // Drawn stand-ins run along +y; turn them across the fist like the art.
    s.heldG.rotation = -Math.PI / 2;
    for (const c of s.held.children.slice(1)) c.destroy();
    s.heldTool = !!heavy || (!!e.weapon && heldIsTool(e.weapon));
    if (heavy) {
      // Two-handed heavy weapon: drawn in the hands (the world prop hides while carried).
      const len = heavyLength(heavy, r);
      const art = heavySprite(heavy, len);
      if (art) s.held.addChild((s.heldFlip = this.flipWrap(art)));
      else drawHeavy(s.heldG, heavy, len);
      return;
    }
    if (carried) return; // carried throwables render themselves, overhead
    const item = e.weapon;
    if (!item) return;
    const def = bundle.equipment.find((x) => x.id === item);
    const len = r * ((def?.attack?.rangeMm ?? 1000) > 1500 ? 1.9 : 1.2);
    const art = heldSprite(item, len * 1.25);
    if (art) {
      s.held.addChild(s.heldTool ? (s.heldFlip = this.flipWrap(art)) : art);
      return;
    }
    const tags = def?.tags ?? [];
    const color = tags.includes('material:metal') ? 0x9ca3af : tags.includes('material:wood') ? 0x92400e : tags.includes('material:paper') ? 0xf8fafc : tags.includes('material:tech') ? 0x374151 : tags.includes('silly') ? 0xfacc15 : 0x475569;
    s.heldG.roundRect(-r * 0.14, -r * 0.1, r * 0.28, len, r * 0.1).fill(color).stroke({ width: 1, color: OUTLINE });
    if (tags.includes('material:tech') || tags.includes('material:paper')) s.heldG.rect(-r * 0.35, len * 0.55, r * 0.7, len * 0.4).fill(color).stroke({ width: 1, color: OUTLINE });
  }

  private setExpr(s: CharSprite, expr: Expr, ms: number): void {
    s.expr = expr;
    s.exprUntil = this.now + ms;
  }

  private bark(s: CharSprite | undefined, kind: string, chance = 1, slots: Record<string, string> = {}, force = false): void {
    if (!s || (s.kind === 'npc' && !kind.startsWith('bark_ref'))) return;
    if (Math.random() > chance) return;
    if (!force && this.now - s.lastBubbleAt < 1400) return;
    let open = 0;
    for (const o of this.chars.values()) if (o.bubble && o !== s) open++;
    if (open >= (this.compact ? 2 : 4) && !force) return;
    const list = bundle.live[kind];
    if (!list?.length) return;
    const text = rand(list).replace(/\{(\w+)\}/g, (_, k: string) => slots[k] ?? k).replace(/\b([Aa]) ([aeiouAEIOU])/g, '$1n $2');
    this.say(s, text, 1500);
  }

  /** A wordless yell/scream/"oof" in the character's voice. */
  private vox(s: CharSprite | undefined, kind: Shout, chance = 1, force = false): void {
    if (!s || Math.random() > chance) return;
    if (!force && this.now - s.lastShoutAt < 700) return;
    s.lastShoutAt = this.now;
    this.sfx.shout(kind, s.voice, force);
  }

  /** Show a speech bubble with exactly this text. */
  private say(s: CharSprite, text: string, ms: number): void {
    s.bubble?.destroy({ children: true });
    const size = this.compact ? 10 : Math.max(10, Math.min(15, s.r * 0.95));
    const t = new Text({ text, style: { fontFamily: FONT, fontSize: size, fontWeight: '800', fill: OUTLINE, wordWrap: true, wordWrapWidth: 130 }, resolution: 3 });
    const padX = 6;
    const padY = 4;
    const w = t.width + padX * 2;
    const h = t.height + padY * 2;
    const c = new Container();
    const bg = new Graphics()
      .roundRect(-w / 2, -h - 7, w, h, 8)
      .fill(0xffffff)
      .stroke({ width: 2, color: OUTLINE })
      .poly([-5, -8, 5, -8, 0, 0])
      .fill(0xffffff);
    bg.moveTo(-5, -7).lineTo(0, 0).lineTo(5, -7).stroke({ width: 2, color: OUTLINE });
    t.position.set(-w / 2 + padX, -h - 7 + padY);
    c.addChild(bg, t);
    this.uiLayer.addChild(c);
    s.bubble = c;
    s.bubbleUntil = this.now + ms;
    s.lastBubbleAt = this.now;
    this.sfx.speak(text, s.voice, ms > 2000);
  }

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  private makeProp(e: FrameEntity): PropSprite {
    const def = bundle.props.find((p) => p.id === e.def);
    const root = new Container();
    const g = new Graphics();
    root.addChild(g);
    const isArea = def?.art.shape === 'area';
    const color = hex(def?.art.color ?? '#999999');
    const s: PropSprite = { root, g, area: -1, isArea, animated: isArea && ['prop.fire-patch', 'prop.sparks', 'prop.foam-cloud', 'prop.puddle-water', 'prop.flood', 'prop.oil-spill', 'prop.soda-spill'].includes(e.def), color, seed: e.id };
    if (isArea) {
      root.scale.y = this.ysq;
      this.areas.addChild(root);
    } else {
      // Loose weapons lie on the floor: a knocked-away career weapon, or a heavy weapon.
      if (e.def === 'prop.weapon' || HEAVY.has(e.def)) {
        const u = e.r * this.scale;
        g.ellipse(0, 0, u * 1.6, u * 0.5).fill({ color: 0x000000, alpha: 0.18 });
        const lying = new Container();
        lying.rotation = -Math.PI / 2 + 0.25;
        const len = e.def === 'prop.weapon' ? u * 3.2 : u * 3.6;
        const art = e.def === 'prop.weapon' ? heldSprite(e.weapon, len) : heavySprite(e.def, len);
        if (art && e.def !== 'prop.weapon') {
          // Heavy weapon art is painted lying at an angle already: show it as painted.
          art.rotation = 0;
          art.anchor.set(0.5, 0.8);
          art.scale.set(art.scale.x * 0.9);
          root.addChild(art);
          this.bodies.addChild(root);
          return s;
        }
        if (art) {
          // On the floor the art lies as painted (upright art turned onto its side), not in its grip pose.
          art.rotation = 0;
          art.anchor.set(0.5, 0.5);
          art.position.set(0, len * 0.45);
          lying.addChild(art);
        }
        else {
          const lg = new Graphics();
          if (e.def === 'prop.weapon') lg.roundRect(-u * 0.25, 0, u * 0.5, len, u * 0.2).fill(0x94a3b8).stroke({ width: 1, color: OUTLINE });
          else drawHeavy(lg, e.def, len);
          lying.addChild(lg);
        }
        lying.position.set(-len * 0.45, -u * 0.3);
        root.addChild(lying);
        this.bodies.addChild(root);
        return s;
      }
      // Item art when we have it (props read ~2.6× their collision radius), else the drawn version.
      const art = propSprite(e.def, e.r * this.scale * 2.6);
      if (art) {
        g.ellipse(0, 0, e.r * this.scale * 1.1, e.r * this.scale * 0.45).fill({ color: 0x000000, alpha: 0.18 });
        root.addChild(art);
      } else drawProp(g, e.def, e.r * this.scale, color, def?.art.shape === 'square');
      this.bodies.addChild(root);
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // Frame update
  // ---------------------------------------------------------------------------
  render(player: ReplayPlayer, dtMs: number, events: BattleEvent[]): void {
    if (!this.ready) return;
    this.now += dtMs;
    this.frameDt = dtMs;
    const t = this.now / 1000;
    const a = player.alpha;
    const prev = new Map(player.prev.entities.map((e) => [e.id, e]));
    const cur = player.cur.entities;
    const byId = new Map(cur.map((e) => [e.id, e]));
    const seenC = new Set<number>();
    const seenP = new Set<number>();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Who is carrying what: carried props ride above the carrier's head.
    const carrier = new Map<number, number>();
    for (const e of cur) if (e.kind !== 'prop' && e.held >= 0) carrier.set(e.held, e.id);
    for (const e of cur) {
      const p = prev.get(e.id) ?? e;
      const x = p.x + (e.x - p.x) * a;
      const y = p.y + (e.y - p.y) * a;
      const z = p.z + (e.z - p.z) * a;
      const [sx, sy] = this.px(x, y, z);
      if (e.kind === 'prop') {
        seenP.add(e.id);
        let s = this.props.get(e.id);
        if (!s) this.props.set(e.id, (s = this.makeProp(e)));
        const cb = carrier.get(e.id);
        const cs = cb !== undefined ? this.chars.get(cb) : undefined;
        if (cs && !cs.rag) s.root.position.set(cs.x, cs.y - cs.r * (cs.puppet ? 5.4 : 4.4) * cs.depth);
        else s.root.position.set(sx, sy);
        s.root.visible = !(cs && HEAVY.has(e.def));
        if (s.isArea) {
          const dk = this.depth(y);
          s.root.scale.set(dk, this.ysq * dk);
          if (s.animated || Math.abs(e.area - s.area) > 5) {
            drawArea(s.g, e.def, e.area * this.scale, s.color, t, s.seed);
            s.area = e.area;
          }
        } else {
          s.root.zIndex = cs ? (cs.root.zIndex as number) + 1 : y + (e.z > 0 ? 400 : 0);
          s.root.rotation = e.flying ? t * 12 : 0;
          const dk = this.depth(y);
          s.root.scale.set(isMover(e.def) && e.fx < 0 ? -dk : dk, dk);
          const live = e.statuses.includes('status.burning') || e.statuses.includes('status.electrified') || e.statuses.includes('status.live');
          s.root.alpha = live && Math.floor(t * 8) % 2 === 0 ? 0.7 : 1;
        }
        continue;
      }
      seenC.add(e.id);
      let s = this.chars.get(e.id);
      if (!s) this.chars.set(e.id, (s = this.makeChar(e)));
      s.moving = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) > 4;
      s.alive = e.state !== 'ko' && e.kind === 'char';
      s.x = sx;
      s.y = sy;
      s.root.position.set(sx, sy);
      s.root.zIndex = y;
      s.depth = this.depth(y);
      s.root.scale.set(s.depth);
      if (e.state !== 'ko' && e.kind === 'char') {
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }
      this.animateChar(s, e, t, byId);
      this.updateRagdoll(s, e, sx, sy, this.px(x, y, 0)[1], y, dtMs);
      // Puppets and ragdolls draw in world coordinates: scale them about the character's anchor.
      for (const c of [s.puppet?.root, s.ragG]) if (c) {
        c.scale.set(s.depth);
        c.position.set(sx * (1 - s.depth), sy * (1 - s.depth));
      }
    }
    for (const [id, s] of this.chars) {
      if (!seenC.has(id)) {
        s.root.visible = false;
        if (s.puppet) s.puppet.root.visible = false;
        if (s.rag) this.dropRagdoll(s);
      }
      if (s.bubble) {
        if (this.now > s.bubbleUntil || !s.root.visible) {
          s.bubble.destroy({ children: true });
          s.bubble = null;
        } else s.bubble.position.set(s.x, s.y - s.r * (s.puppet ? 5.5 : 4.6));
      }
    }
    for (const [id, s] of this.props) {
      if (!seenP.has(id)) {
        s.root.destroy({ children: true });
        this.props.delete(id);
      }
    }
    this.curTick = player.tick;
    for (const ev of events) this.onEvent(ev, byId);
    this.drawBelts(t);
    this.updateWalls(player);
    for (const d of this.decals) d.g.visible = player.tick >= d.tick;
    this.impactAlpha = Math.max(0, this.impactAlpha - dtMs / 90);
    this.impactFlash.alpha = this.impactAlpha;
    this.tickFx(dtMs);
    this.updateCamera(dtMs, minX);
  }

  private animateChar(s: CharSprite, e: FrameEntity, t: number, byId: Map<number, FrameEntity>): void {
    const r = s.r;
    const down = e.state !== 'active' || e.statuses.includes('status.knocked-down');
    const stunned = e.statuses.includes('status.stunned') || e.statuses.includes('status.electrified') || e.statuses.includes('status.lectured');
    const action = e.action;
    const winding = action.endsWith(':windup');
    const casting = winding && action.startsWith('ability.');
    s.doll.scale.x = e.fx < 0 ? -1 : 1;

    // Expression: event-driven first, then state.
    let expr: Expr = 'neutral';
    if (e.state === 'ko') expr = 'ko';
    else if (this.now < s.exprUntil) expr = s.expr;
    else if (e.panicking || e.statuses.includes('status.burning')) expr = 'scared';
    else if (stunned || e.state === 'downed') expr = 'stunned';
    else if (e.statuses.includes('status.inspired') || e.statuses.includes('status.caffeinated')) expr = 'happy';
    else if (winding || action.startsWith('attack')) expr = 'angry';
    else if (e.maxHp > 0 && e.hp / e.maxHp < 0.25) expr = 'scared';
    if (expr !== s.drawnExpr) {
      this.drawFace(s, expr);
      s.drawnExpr = expr;
    }

    // Body pose.
    const bob = s.moving ? Math.abs(Math.sin(t * 14)) * r * 0.25 : Math.sin(t * 3 + s.id) * r * 0.05;
    let lean = 0;
    let offX = 0;
    let armF = 0.25 + Math.sin(t * 3 + s.id) * 0.08;
    let armB = -0.2;
    if (s.moving) {
      armF = Math.sin(t * 14) * 0.7;
      armB = -Math.sin(t * 14) * 0.7;
    }
    if (winding) {
      armF = casting ? -2.6 + Math.sin(t * 20) * 0.2 : -2.0;
      lean = -0.12;
    }
    if (this.now < s.lungeUntil) {
      const k = (s.lungeUntil - this.now) / 220;
      offX = r * 0.6 * k;
      armF = 1.4;
      lean = 0.18 * k;
    }
    if (this.now < s.throwUntil) {
      const k = (s.throwUntil - this.now) / 320;
      armF = -2.8 + (1 - k) * 4;
    }
    if (this.now < s.hitUntil) {
      const k = (s.hitUntil - this.now) / 300;
      lean = -0.35 * k * (s.knockX >= 0 ? 1 : -1) * (e.fx < 0 ? -1 : 1);
      armF = -2.4;
      armB = 2.4;
      offX = -r * 0.3 * k;
    }
    if (e.panicking && !down) {
      armF = -2.6 + Math.sin(t * 25) * 0.6;
      armB = 2.6 - Math.sin(t * 25) * 0.6;
    }
    let jitterX = 0;
    if (e.statuses.includes('status.electrified')) jitterX = (Math.random() - 0.5) * r * 0.5;
    if (e.statuses.includes('status.caffeinated')) jitterX = (Math.random() - 0.5) * r * 0.15;
    s.torso.position.set(offX + jitterX, -bob);
    s.torso.rotation = lean;
    s.armFront.rotation = armF;
    s.armBack.rotation = armB;
    s.doll.rotation = down ? (e.fx < 0 ? -1.45 : 1.45) : 0;
    s.doll.position.y = down ? -r * 0.4 : 0;
    s.head.rotation = stunned ? Math.sin(t * 8) * 0.25 : 0;

    // Feet: alternate when walking.
    s.feet.clear();
    if (!down) {
      const step = s.moving ? Math.sin(t * 14) * r * 0.25 : 0;
      s.feet.ellipse(-r * 0.35, -r * 0.05 - Math.max(0, step), r * 0.28, r * 0.14).ellipse(r * 0.35, -r * 0.05 - Math.max(0, -step), r * 0.28, r * 0.14).fill(0x1f2937);
    }

    // Tint flashes: red when hit, ability colour while casting, blue when cold.
    let tint = 0xffffff;
    if (this.now < s.flashUntil) tint = s.flashColor;
    else if (casting) tint = Math.floor(t * 10) % 2 ? 0xffffff : s.castColor || 0xfff3a0;
    else if (e.statuses.includes('status.electrified')) tint = Math.floor(t * 20) % 2 ? 0xfff59d : 0xffffff;
    else if (e.statuses.includes('status.cold')) tint = 0xbfdbfe;
    else if (e.statuses.includes('status.embarrassed')) tint = 0xffc4c4;
    s.torso.tint = tint;
    s.root.alpha = e.state === 'ko' ? 0.55 : 1;
    if (s.puppet) this.animatePuppet(s, s.puppet, e, t, tint, expr, { down, stunned, winding, casting }, byId);

    this.drawStatusFx(s, e, t, casting);
    this.drawHeld(s, e, byId);

    if (e.hp !== s.lastHp) {
      const w = r * 2.4;
      const frac = e.maxHp > 0 ? Math.max(0, e.hp / e.maxHp) : 0;
      s.bar.clear();
      s.bar.rect(-w / 2, 0, w, Math.max(3, r * 0.28)).fill(0x111111);
      s.bar.rect(-w / 2, 0, w * frac, Math.max(3, r * 0.28)).fill(frac > 0.5 ? 0x22c55e : frac > 0.25 ? 0xf59e0b : 0xef4444);
      s.lastHp = e.hp;
    }
    const iconStr = [...new Set(e.statuses.map((st) => STATUS_ICONS[st] ?? ''))].join('');
    if (iconStr !== s.lastIcons) {
      s.icons.text = iconStr;
      s.lastIcons = iconStr;
    }
    s.label.visible = e.state !== 'ko';
    s.bar.visible = e.state !== 'ko';
    const intent = e.state === 'active' ? this.intentIcon(e, byId) : '';
    if (intent !== s.lastIntent) {
      s.intent.text = intent;
      s.lastIntent = intent;
    }
  }

  /** Procedural pose for a sprite puppet (the ragdoll takes over when it falls). */
  private animatePuppet(s: CharSprite, pu: Puppet, e: FrameEntity, t: number, tint: number, expr: Expr, st: { down: boolean; stunned: boolean; winding: boolean; casting: boolean }, byId: Map<number, FrameEntity>): void {
    const f = e.fx < 0 ? -1 : 1;
    pu.root.visible = s.root.visible;
    pu.root.zIndex = (s.root.zIndex as number) + 0.5;
    pu.root.tint = tint;
    pu.root.alpha = e.state === 'ko' ? 0.8 : 1;
    const emote = { angry: '💢', scared: '💦', stunned: '💫', happy: '✨', ko: '😵', hurt: '💥', sleepy: '💤', neutral: '' }[expr];
    if (s.emote && emote !== s.lastEmote) {
      s.emote.text = emote;
      s.lastEmote = emote;
    }
    if (s.emote) s.emote.visible = !s.rag;
    if (s.rag || s.crawling) {
      s.held.position.set(pu.hand.x, pu.hand.y);
      s.held.rotation = this.gripRot(s, pu.hand.rot, e.fx < 0 ? -1 : 1);
      return;
    }
    const r = s.r;
    const p: Pose = { ...NEUTRAL };
    const idle = Math.sin(t * 3 + s.id);
    p.bob = idle * r * 0.04;
    p.armF += idle * 0.05;
    p.armB -= idle * 0.05;
    if (s.moving) {
      const w = Math.sin(t * 14);
      p.bob = Math.abs(w) * r * 0.18;
      p.legF = w * 0.5;
      p.legB = -w * 0.5;
      p.kneeF = Math.max(0, -w) * 0.7;
      p.kneeB = Math.max(0, w) * 0.7;
      p.armF = -w * 0.55 - 0.1;
      p.armB = w * 0.55 + 0.1;
      p.elbowF = -0.35;
      p.elbowB = 0.35;
      p.lean = 0.06;
    }
    const action = e.action;
    if (st.winding) {
      if (st.casting) {
        p.armF = -2.7 + Math.sin(t * 20) * 0.2;
        p.armB = 2.7 - Math.sin(t * 20) * 0.2;
        p.elbowF = p.elbowB = 0;
      } else {
        // Pick the blow as the wind-up starts, so the wind-up telegraphs it.
        if (!s.wasWinding || !s.move) s.move = this.pickMove(s, e, e.held >= 0 && HEAVY.has(byId.get(e.held)?.def ?? ''));
        MOVES[s.move].wind(p, r);
      }
    }
    s.wasWinding = st.winding;
    let facing = f;
    if (s.move && this.now < s.moveUntil) {
      const def = MOVES[s.move];
      def.strike(p, r, extension(1 - (s.moveUntil - this.now) / def.ms));
    } else if (!st.winding) s.move = null;
    // Spinning back kick: body turned away from the target for the whole move.
    if (s.move && MOVES[s.move].turn) facing = -f;
    if (this.now < s.throwUntil) {
      const k = (s.throwUntil - this.now) / 320;
      p.armF = -2.9 + (1 - k) * 3.2;
      p.armB = 2.9 - (1 - k) * 3.2;
      p.lean = -0.2 + (1 - k) * 0.4;
    }
    if (this.now < s.hitUntil) {
      const k = (s.hitUntil - this.now) / 300;
      hitPose(p, s.hitStyle, r, k, (s.knockX >= 0 ? 1 : -1) * f);
    }
    if (this.now < s.dashUntil) {
      // Low sprint lean into the direction of travel, legs split, arms swept back.
      const k = (s.dashUntil - this.now) / 320;
      const toward = s.dashDir * facing;
      p.lean = 0.45 * toward * k;
      p.legF = -0.9 * k;
      p.legB = 0.9 * k;
      p.kneeB = 0.6 * k;
      p.armF = 1.2 * k * toward;
      p.armB = 1.4 * k * toward;
      p.bob = -r * 0.2 * k;
    }
    if (this.now < s.parryUntil) {
      // Forearm guard up, weight back.
      p.armF = -2.1;
      p.elbowF = -1.3;
      p.armB = -1.2;
      p.elbowB = -1.6;
      p.lean = -0.15;
    }
    if (e.panicking && !st.down) {
      p.armF = -2.6 + Math.sin(t * 25) * 0.6;
      p.armB = 2.6 - Math.sin(t * 25) * 0.6;
    }
    const heavyHeld = e.held >= 0 && HEAVY.has(byId.get(e.held)?.def ?? '');
    if (heavyHeld && !s.move) {
      // Two hands on a heavy weapon, resting on the shoulder.
      p.armF = -0.9;
      p.elbowF = -1.9;
      p.armB = -0.7;
      p.elbowB = -2.0;
      p.lean = 0.06;
    } else if (e.held >= 0 && !heavyHeld && !action.startsWith('throw')) {
      // Carrying a prop overhead.
      p.armF = -2.9;
      p.armB = 2.9;
      p.elbowF = p.elbowB = 0;
    }
    if (e.statuses.includes('status.choking')) {
      // Arms locked round someone's neck.
      p.armF = -1.45;
      p.elbowF = -2.3;
      p.armB = -1.25;
      p.elbowB = -2.1;
      p.lean = 0.18;
      p.bob += Math.sin(t * 18) * r * 0.03;
    } else if (e.statuses.includes('status.choked')) {
      // Clawing at the arm round their neck, legs kicking.
      p.armF = -2.3 + Math.sin(t * 20) * 0.4;
      p.elbowF = -2.4;
      p.armB = -2.1 + Math.cos(t * 17) * 0.4;
      p.elbowB = -2.4;
      p.legF = Math.sin(t * 14) * 0.35;
      p.legB = -Math.sin(t * 14) * 0.35;
      p.headRot = -0.35 + Math.sin(t * 9) * 0.1;
      p.lean = -0.2;
    }
    if (st.stunned) p.headRot = Math.sin(t * 8) * 0.35;
    if (e.statuses.includes('status.electrified')) {
      p.armF += (Math.random() - 0.5) * 1.2;
      p.armB += (Math.random() - 0.5) * 1.2;
      p.offX += (Math.random() - 0.5) * r * 0.4;
    } else if (e.statuses.includes('status.caffeinated')) p.offX += (Math.random() - 0.5) * r * 0.15;
    pu.poseBlended(p, s.x, s.y, facing, this.frameDt);
    s.held.position.set(pu.hand.x, pu.hand.y);
    s.held.rotation = this.gripRot(s, pu.hand.rot, facing);
    s.held.scale.x = facing;
    if (s.heldFlip) s.heldFlip.scale.y = facing;
  }

  /** Next melee move from this character's repertoire (never the same one three times running). */
  private pickMove(s: CharSprite, e: FrameEntity | undefined, heavy = false): Move {
    // Heavy weapons only swing big; bare hands and weapons use their own move sets.
    if (heavy) return Math.random() < 0.5 ? 'overhead' : 'swing';
    const kind = e?.weapon ? 'w' : '';
    if (!s.repertoire || s.repFor !== kind) {
      s.repertoire = repertoire(s.career, s.personality, kind === 'w');
      s.repFor = kind;
    }
    let m = rand(s.repertoire);
    if (m === s.lastMove && m === s.lastMove2) m = rand(s.repertoire);
    s.lastMove2 = s.lastMove;
    s.lastMove = m;
    return m;
  }

  /**
   * Switch between the animated doll and the floppy ragdoll. The ragdoll takes
   * over when a character is airborne, knocked down, downed or KO'd.
   */
  private updateRagdoll(s: CharSprite, e: FrameEntity, sx: number, sy: number, floorY: number, depth: number, dt: number): void {
    // Launched (tossed, heavy hit) or high in the air; small knockback hops stay on their feet (puppets).
    const airborne = e.statuses.includes('status.airborne') || e.z > (s.puppet ? 250 : 60);
    const want = e.state !== 'active' || e.statuses.includes('status.knocked-down') || airborne || e.statuses.includes('status.crawling');
    if (s.rag && Math.hypot(s.rag.x[2]! - sx, s.rag.y[2]! - sy) > s.r * 8) this.dropRagdoll(s);
    // Puppets crawl for real once they've finished falling; paper dolls just drag their ragdoll.
    const crawl = !!s.puppet && this.isCrawling(e);
    if (s.puppet && crawl && !(s.rag && s.rag.settledMs < 250 && this.now - s.ragAt < 900)) {
      if (s.rag) this.dropRagdoll(s);
      if (!s.crawling) s.puppet.settle(350);
      s.crawling = true;
      s.puppet.crawl(sx, sy, e.fx < 0 ? -1 : 1, this.now / 1000 + s.id, dt, s.moving, e.state === 'downed');
      s.puppet.root.zIndex = depth + 1;
      s.held.position.set(s.puppet.hand.x, s.puppet.hand.y);
      s.held.rotation = this.gripRot(s, s.puppet.hand.rot, e.fx < 0 ? -1 : 1);
      return;
    }
    if (s.crawling && !crawl) {
      s.crawling = false;
      s.puppet?.settle(300);
    }
    // Puppets in the air fly in a posed style, pivoting about their own centre.
    if (s.puppet && airborne) {
      this.fly(s, s.puppet, e, sx, sy, dt);
      s.puppet.root.zIndex = depth + 1;
      s.held.position.set(s.puppet.hand.x, s.puppet.hand.y);
      s.held.rotation = this.gripRot(s, s.puppet.hand.rot, e.fx < 0 ? -1 : 1);
      return;
    }
    if (s.flight && s.puppet) {
      // Touchdown: hand the flying pose to the ragdoll so the body slams and flops.
      const fl = s.flight;
      s.flight = null;
      s.kick = null;
      if (want) {
        if (s.rag) this.dropRagdoll(s);
        s.ragAt = this.now;
        s.rag = new Ragdoll(s.r, sx, sy, e.fx < 0 ? -1 : 1, s.puppet.ragdollSpec());
        s.rag.setPoints(s.puppet.xs, s.puppet.ys);
        s.rag.setVelocity(fl.vx * 0.5, Math.max(0, fl.vy) * 0.3);
      } else s.puppet.settle(260);
    }
    if (want && !s.rag) {
      s.ragAt = this.now;
      if (s.puppet) {
        s.rag = new Ragdoll(s.r, sx, sy, e.fx < 0 ? -1 : 1, s.puppet.ragdollSpec());
        s.rag.setPoints(s.puppet.xs, s.puppet.ys);
      } else {
        s.rag = new Ragdoll(s.r, sx, sy, e.fx < 0 ? -1 : 1);
        s.ragG = new Graphics();
        this.bodies.addChild(s.ragG);
      }
      if (s.kick && this.now - s.kick.at < 400) {
        s.rag.impulse(s.kick.dx, s.kick.dy);
        s.rag.spin = s.kick.spin;
      } else s.rag.impulse((e.fx < 0 ? 1 : -1) * s.r * 0.3, -s.r * 0.2);
      s.kick = null;
    }
    if (!s.rag || (!s.ragG && !s.puppet)) return;
    if (!want) {
      this.dropRagdoll(s);
      return;
    }
    if (s.kick) {
      s.rag.impulse(s.kick.dx, s.kick.dy);
      if (s.kick.spin) s.rag.spin = s.kick.spin;
      s.kick = null;
    }
    if (!airborne) s.rag.spin *= 0.9;
    s.rag.step(dt, sx, sy, floorY, airborne, e.statuses.includes('status.electrified'));
    if (s.puppet) {
      s.puppet.render(s.rag.x, s.rag.y, e.fx < 0 ? -1 : 1);
      s.puppet.root.zIndex = depth + 1;
      s.held.position.set(s.puppet.hand.x, s.puppet.hand.y);
      s.held.rotation = this.gripRot(s, s.puppet.hand.rot, e.fx < 0 ? -1 : 1);
      return;
    }
    if (!s.ragG) return;
    s.rag.draw(s.ragG, { r: s.r, body: s.colors.body, skin: s.colors.skin, hair: s.colors.hair, legs: 0x1f2937, outline: OUTLINE, ko: e.state === 'ko' });
    s.ragG.zIndex = depth + 1;
    s.ragG.alpha = e.state === 'ko' ? 0.75 : 1;
    s.doll.visible = false;
  }

  /**
   * Hand → item rotation. Tools bend at the wrist: across the fist with the arm
   * down or raised (wind-up), dipping forward past the fist as the arm extends
   * into a strike, like a hammer at impact.
   */
  private flipWrap(art: Container): Container {
    const c = new Container();
    c.addChild(art);
    return c;
  }

  private gripRot(s: CharSprite, handRot: number, f: number): number {
    // Keep tool art readable (not mirrored) whichever way they face.
    if (s.heldFlip) s.heldFlip.scale.y = s.held.scale.x < 0 ? -1 : 1;
    if (!s.heldTool) return handRot;
    const theta = handRot + Math.PI / 2; // forearm direction
    const ext = Math.max(0, f * Math.cos(theta));
    return handRot + f * 1.9 * ext;
  }

  /** Posed flight for a launched puppet (see FlightStyle). */
  private fly(s: CharSprite, pu: Puppet, e: FrameEntity, sx: number, sy: number, dt: number): void {
    const r = s.r;
    if (!s.flight) {
      if (s.rag) this.dropRagdoll(s);
      const hint = s.flightHint && this.now - s.flightHint.at < 600 ? s.flightHint.style : null;
      const kick = s.kick && this.now - s.kick.at < 600 ? s.kick : null;
      const style: FlightStyle = hint ?? (kick && Math.abs(kick.spin) >= 1.2 ? 'spin' : kick && Math.abs(kick.spin) >= 0.8 ? 'launch' : Math.random() < 0.5 ? 'launch' : Math.random() < 0.5 ? 'flail' : 'spin');
      const dir = kick && kick.dx !== 0 ? Math.sign(kick.dx) : e.fx < 0 ? 1 : -1;
      s.flight = { style, t0: this.now, dir, spin: (9 + Math.random() * 5) * (kick && kick.spin ? Math.sign(kick.spin) * dir : dir), x: sx, y: sy, vx: 0, vy: 0 };
      s.flightHint = null;
      s.kick = null;
      pu.settle(140);
    }
    const fl = s.flight;
    // Travel direction follows the actual motion once it's clear.
    const k = Math.min(1, dt / 40);
    fl.vx += (sx - fl.x - fl.vx) * k;
    fl.vy += (sy - fl.y - fl.vy) * k;
    fl.x = sx;
    fl.y = sy;
    if (Math.abs(fl.vx) > r * 0.05) fl.dir = Math.sign(fl.vx);
    const age = (this.now - fl.t0) / 1000;
    const f = e.fx < 0 ? -1 : 1;
    // Pose angles are relative to facing; `back` = away from where they're facing.
    const back = fl.dir === f ? -1 : 1;
    const p: Pose = { ...NEUTRAL };
    let angle = 0;
    switch (fl.style) {
      case 'launch': {
        // Knocked flat on their back in mid-air: tip over towards the direction of travel.
        angle = fl.dir * Math.min(1.35, age * 3.2);
        const w = Math.sin(age * 22) * 0.25;
        p.armF = -1.9 * back + w;
        p.armB = -1.4 * back - w;
        p.elbowF = p.elbowB = -0.5 * back;
        p.legF = -0.9 * back;
        p.legB = -0.5 * back;
        p.kneeF = 0.7;
        p.kneeB = 0.4;
        p.headRot = 0.35 * back;
        break;
      }
      case 'spin': {
        // Tucked somersaults.
        angle = fl.spin * age;
        p.legF = -1.5;
        p.legB = -1.2;
        p.kneeF = p.kneeB = 2.3;
        p.armF = -1.1;
        p.elbowF = -1.9;
        p.armB = -0.8;
        p.elbowB = -1.9;
        p.headRot = 0.4;
        break;
      }
      default: {
        // Windmilling arms, running on air.
        angle = fl.dir * (0.3 + Math.sin(age * 7) * 0.15);
        p.armF = age * 17;
        p.armB = age * 17 + Math.PI;
        p.elbowF = p.elbowB = -0.4;
        const run = Math.sin(age * 20);
        p.legF = run * 0.9;
        p.legB = -run * 0.9;
        p.kneeF = Math.max(0, -run) * 1.3;
        p.kneeB = Math.max(0, run) * 1.3;
        p.headRot = Math.sin(age * 11) * 0.25;
      }
    }
    pu.flight(p, sx, sy, f, angle, dt);
  }

  /** Queue a ragdoll impulse for a character (applied now or when their ragdoll starts). */
  private kick(s: CharSprite | undefined, dx: number, dy: number, spin = 0): void {
    if (s) s.kick = { dx, dy, spin, at: this.now };
  }

  /** Small icon describing the current plan, so viewers can read what's about to happen. */
  private intentIcon(e: FrameEntity, byId: Map<number, FrameEntity>): string {
    const [kind, phase] = e.action.split(':');
    if (!kind) return e.panicking ? '😱' : '';
    if (kind.startsWith('ability.')) return phase === 'windup' ? '✨' : '';
    const t = byId.get(e.target);
    switch (kind) {
      case 'throw':
        return '🎯';
      case 'pickUp':
        return '✋';
      case 'push':
        return '💪';
      case 'revive':
        return '🚑';
      case 'retreat':
        return '🏃';
      case 'taunt':
        return '😜';
      case 'use': {
        const def = t ? bundle.props.find((p) => p.id === t.def) : undefined;
        if (def?.ride) return '🛒';
        if (def?.tags.includes('drink')) return '☕';
        if (def?.tags.includes('food')) return '🍩';
        return '⚙️';
      }
      case 'attack':
        return t?.kind === 'prop' ? '💥' : '';
      default:
        return '';
    }
  }

  /** Per-frame status visuals drawn around a character. */
  private drawStatusFx(s: CharSprite, e: FrameEntity, t: number, casting: boolean): void {
    const g = s.fx;
    const r = s.r;
    g.clear();
    const st = e.statuses;
    if (casting) {
      const k = (t * 3) % 1;
      g.ellipse(0, 0, r * (1.2 + k), r * (0.5 + k * 0.4)).stroke({ width: Math.max(2, r * 0.2), color: s.castColor, alpha: 1 - k });
      g.ellipse(0, 0, r * 1.3, r * 0.55).fill({ color: s.castColor, alpha: 0.25 });
    }
    if (st.includes('status.burning')) {
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * r * 0.35;
        const h = r * (1.0 + 0.5 * Math.sin(t * 14 + i * 2));
        const base = -r * (1.2 + (i % 2) * 0.6);
        g.poly([x - r * 0.25, base, x + r * 0.25, base, x, base - h]).fill({ color: i % 2 ? 0xef4444 : 0xfb923c, alpha: 0.9 });
      }
    }
    if (st.includes('status.electrified')) {
      for (let i = 0; i < 3; i++) {
        let x = (Math.random() - 0.5) * r * 2.4;
        let y = -r * (0.5 + Math.random() * 3);
        g.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          x += (Math.random() - 0.5) * r * 1.2;
          y += (Math.random() - 0.5) * r * 1.2;
          g.lineTo(x, y);
        }
      }
      g.stroke({ width: Math.max(1.5, r * 0.12), color: 0xfff176 });
    }
    if (st.includes('status.wet')) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.5 + i / 3) % 1;
        g.ellipse((i - 1) * r * 0.6, -r * (2.4 - k * 2.2), r * 0.1, r * 0.16).fill({ color: 0x60a5fa, alpha: 1 - k });
      }
    }
    if (st.includes('status.stunned') || st.includes('status.electrified') || e.state === 'downed') {
      for (let i = 0; i < 3; i++) {
        const ang = t * 5 + (i * Math.PI * 2) / 3;
        const x = Math.cos(ang) * r * 0.9;
        const y = -r * 4.0 + Math.sin(ang) * r * 0.3;
        star(g, x, y, r * 0.22, 0xfde047);
      }
    }
    if (st.includes('status.foamed')) for (let i = 0; i < 6; i++) g.circle(Math.cos(i * 1.7) * r * 0.8, -r * (0.6 + (i % 3) * 0.7), r * 0.28).fill({ color: 0xffffff, alpha: 0.9 }).stroke({ width: 1, color: 0xcbd5e1 });
    if (st.includes('status.inspired')) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.2 + i / 3) % 1;
        star(g, (i - 1) * r * 0.9, -r * (1 + k * 3), r * 0.18 * (1 - k) + 1, 0xfff3a0);
      }
    }
    if (st.includes('status.caffeinated')) {
      g.moveTo(-r * 1.2, -r * 1.5).lineTo(-r * 1.6, -r * 1.5).moveTo(-r * 1.2, -r * 2.1).lineTo(-r * 1.7, -r * 2.1).stroke({ width: Math.max(1, r * 0.1), color: 0x78350f });
    }
    if (st.includes('status.slipping') && !st.includes('status.knocked-down')) {
      g.moveTo(r * 1.1, 0).arc(0, 0, r * 1.1, 0, Math.PI * (0.6 + Math.sin(t * 8) * 0.3)).stroke({ width: Math.max(1, r * 0.12), color: 0x60a5fa });
    }
    if (e.panicking) {
      for (let i = 0; i < 2; i++) {
        const k = (t * 2 + i / 2) % 1;
        g.ellipse(r * (0.9 + i * 0.3), -r * (3.2 - k * 1.2), r * 0.12, r * 0.2).fill({ color: 0x93c5fd, alpha: 1 - k });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Events → reactions, VFX, sound
  // ---------------------------------------------------------------------------
  private posOf(id: number, byId: Map<number, FrameEntity>): [number, number] | null {
    const e = byId.get(id);
    if (!e) return null;
    return this.px(e.x, e.y, e.z);
  }

  private float(text: string, at: [number, number] | null, color: number, size = 14, rise = 1): void {
    if (!at || this.fx.length > 90) return;
    const tx = new Text({ text, style: { fontFamily: FONT, fontSize: size, fontWeight: '900', fill: color, stroke: { color: OUTLINE, width: 4 } }, resolution: 3 });
    tx.anchor.set(0.5, 1);
    const head = this.scale * 350 * 4.8;
    tx.position.set(at[0] + (Math.random() - 0.5) * 12, at[1] - head);
    this.uiLayer.addChild(tx);
    const y0 = tx.y;
    this.fx.push({
      g: tx,
      life: 1000,
      max: 1000,
      update: (k) => {
        tx.y = y0 - (1 - k) * 30 * rise;
        tx.alpha = Math.min(1, k * 2.5);
      },
    });
  }

  /** Big coloured name badge above the caster. */
  private pill(text: string, at: [number, number], color: number): void {
    const size = this.compact ? 13 : 16;
    const tx = new Text({ text, style: { fontFamily: FONT, fontSize: size, fontWeight: '900', fill: OUTLINE }, resolution: 3 });
    const w = tx.width + 16;
    const h = tx.height + 6;
    const c = new Container();
    const bg = new Graphics().roundRect(-w / 2, -h, w, h, h / 2).fill(color).stroke({ width: 2.5, color: OUTLINE });
    tx.position.set(-w / 2 + 8, -h + 3);
    c.addChild(bg, tx);
    const head = this.scale * 350 * 5.2;
    c.position.set(at[0], at[1] - head);
    this.uiLayer.addChild(c);
    const y0 = c.y;
    this.fx.push({
      g: c,
      life: 1300,
      max: 1300,
      update: (k) => {
        const p = 1 - k;
        c.scale.set(p < 0.12 ? 0.6 + (p / 0.12) * 0.5 : 1.1 - Math.min(0.1, (p - 0.12) * 0.5));
        c.y = y0 - p * 14;
        c.alpha = Math.min(1, k * 3);
      },
    });
  }

  /** Dust puff + motion streaks left behind by a dash or dodge. */
  private speedLines(at: [number, number] | null, dir: number, r: number): void {
    if (!at) return;
    const [x, y] = at;
    const lines = [0.8, 1.6, 2.4, 3.2].map((h) => ({ h, len: r * (1.6 + Math.random() * 1.4) }));
    this.addShape((g, k) => {
      for (const l of lines) {
        const x0 = x - dir * r * 0.6;
        g.moveTo(x0, y - l.h * r).lineTo(x0 - dir * l.len * (1.2 - k * 0.5), y - l.h * r);
      }
      g.stroke({ width: Math.max(1.5, r * 0.18), color: 0xffffff, alpha: 0.7 * k });
      g.ellipse(x - dir * r * 0.4, y, r * (1.4 - k * 0.6), r * 0.35).fill({ color: 0xd6d3d1, alpha: 0.45 * k });
    }, 380);
  }

  private addShape(draw: (g: Graphics, k: number) => void, life: number): void {
    const g = new Graphics();
    this.fxLayer.addChild(g);
    this.fx.push({
      g,
      life,
      max: life,
      update: (k) => {
        g.clear();
        draw(g, k);
      },
    });
  }

  private sparks(at: [number, number] | null, color: number, size: number): void {
    if (!at) return;
    const [x, y0] = at;
    const y = y0 - this.scale * 350 * 2;
    const rays = 7;
    const angles = Array.from({ length: rays }, (_, i) => (i / rays) * Math.PI * 2 + Math.random() * 0.4);
    this.addShape((g, k) => {
      const p = 1 - k;
      for (const a of angles) g.moveTo(x + Math.cos(a) * size * p * 0.5, y + Math.sin(a) * size * p * 0.5).lineTo(x + Math.cos(a) * size * (0.4 + p), y + Math.sin(a) * size * (0.4 + p));
      g.stroke({ width: Math.max(2, size * 0.18), color, alpha: k });
      star(g, x, y, size * 0.5 * k, 0xffffff);
    }, 260);
  }

  private abilityVfx(ab: AbilityDef, caster: FrameEntity, target: FrameEntity | undefined, color: number): void {
    const tg = ab.targeting;
    if (!tg) return;
    const [cx, cy] = this.px(caster.x, caster.y);
    const S = this.scale;
    const ring = (x: number, y: number, rad: number, life = 520) =>
      this.addShape((g, k) => {
        const p = 1 - k;
        g.ellipse(x, y, rad * (0.2 + p * 0.8), rad * (0.2 + p * 0.8) * this.ysq).fill({ color, alpha: 0.25 * k });
        g.ellipse(x, y, rad * (0.2 + p * 0.8), rad * (0.2 + p * 0.8) * this.ysq).stroke({ width: Math.max(2, 5 * k), color, alpha: k });
      }, life);
    switch (tg.type) {
      case 'cone': {
        if (!target) break;
        const ang = Math.atan2((target.y - caster.y) * this.ysq, target.x - caster.x);
        const half = Math.acos(Math.max(-1, Math.min(1, (tg.coneCosBp ?? 7071) / 10000)));
        const R = tg.rangeMm * S;
        this.addShape((g, k) => {
          const p = 1 - k;
          const rr = R * (0.3 + p * 0.7);
          const pts = [cx, cy - 10 * S * 100];
          const n = 10;
          for (let i = 0; i <= n; i++) {
            const a = ang - half + (2 * half * i) / n;
            pts.push(cx + Math.cos(a) * rr, cy - 10 * S * 100 + Math.sin(a) * rr);
          }
          g.poly(pts).fill({ color, alpha: 0.35 * k }).stroke({ width: 2, color, alpha: k });
          for (let i = 0; i < 6; i++) {
            const a = ang - half + Math.random() * 2 * half;
            const d = rr * (0.4 + Math.random() * 0.6);
            g.circle(cx + Math.cos(a) * d, cy - 10 * S * 100 + Math.sin(a) * d, Math.max(1.5, 60 * S)).fill({ color: 0xffffff, alpha: k });
          }
        }, 480);
        break;
      }
      case 'circleSelf':
        ring(cx, cy, (tg.radiusMm ?? tg.rangeMm) * S);
        break;
      case 'circleTarget': {
        if (!target) break;
        const [tx, ty] = this.px(target.x, target.y);
        const rad = (tg.radiusMm ?? 1500) * S;
        this.addShape((g, k) => {
          const p = Math.min(1, (1 - k) * 2.2);
          const x = cx + (tx - cx) * p;
          const y = cy + (ty - cy) * p - Math.sin(p * Math.PI) * 60 * S * 30;
          if (p < 1) g.circle(x, y - 350 * S * 2, Math.max(4, 180 * S)).fill(color).stroke({ width: 2, color: OUTLINE });
        }, 450);
        setTimeout(() => this.ready && ring(tx, ty, rad, 500), 200);
        break;
      }
      case 'self':
        ring(cx, cy, 1600 * S, 600);
        break;
      default: {
        if (!target) break;
        const [tx, ty] = this.px(target.x, target.y);
        const hy = 350 * S * 2;
        const melee = tg.rangeMm < 2200;
        if (melee) {
          this.addShape((g, k) => {
            const a0 = Math.atan2(ty - cy, tx - cx);
            const s0 = a0 - 1.2 + (1 - k) * 0.6;
            g.moveTo(tx + Math.cos(s0) * 500 * S, ty - hy + Math.sin(s0) * 500 * S)
              .arc(tx, ty - hy, 500 * S, s0, a0 + 0.2 + (1 - k) * 1.2)
              .stroke({ width: Math.max(3, 8 * k), color, alpha: k });
          }, 260);
        } else if (color === ABILITY_COLORS.electric) {
          this.addShape((g, k) => {
            g.moveTo(cx, cy - hy);
            for (let i = 1; i <= 8; i++) g.lineTo(cx + ((tx - cx) * i) / 8 + (i < 8 ? (Math.random() - 0.5) * 20 : 0), cy - hy + ((ty - cy) * i) / 8 + (i < 8 ? (Math.random() - 0.5) * 20 : 0));
            g.stroke({ width: Math.max(2, 5 * k), color, alpha: k });
          }, 300);
        } else {
          this.addShape((g, k) => {
            const p = Math.min(1, (1 - k) * 2.5);
            const x = cx + (tx - cx) * p;
            const y = cy - hy + (ty - cy) * p;
            g.moveTo(cx + (tx - cx) * Math.max(0, p - 0.3), cy - hy + (ty - cy) * Math.max(0, p - 0.3)).lineTo(x, y).stroke({ width: Math.max(2, 180 * S), color, alpha: 0.6 * k });
            g.circle(x, y, Math.max(3, 150 * S)).fill(color).stroke({ width: 1.5, color: OUTLINE });
          }, 380);
        }
      }
    }
  }

  private announce(text: string): void {
    this.banner.text = text;
    this.bannerLife = 2200;
  }

  private witnesses(victim: FrameEntity | undefined, fn: (s: CharSprite, sameTeam: boolean) => void): void {
    if (!victim) return;
    for (const s of this.chars.values()) {
      if (s.id === victim.id || !s.root.visible) continue;
      const dx = s.x - this.px(victim.x, victim.y)[0];
      const dy = s.y - this.px(victim.x, victim.y)[1];
      if (Math.hypot(dx, dy) > 7000 * this.scale) continue;
      fn(s, s.team === victim.team);
    }
  }

  private onEvent(ev: BattleEvent, byId: Map<number, FrameEntity>): void {
    const A = this.chars.get(ev.a);
    const B = this.chars.get(ev.b);
    const HEAT: Partial<Record<BattleEvent['type'], number>> = { hit: 1, crit: 2.5, abilityCast: 2, downed: 4, ko: 6, explosion: 4, throw: 1.5, ride: 2, revived: 3, panic: 2, card: 2, statusApplied: 0.6 };
    const h = HEAT[ev.type] ?? 0;
    if (h) {
      if (A) A.heat += h;
      if (B) B.heat += h;
    }
    const ea = byId.get(ev.a);
    const eb = byId.get(ev.b);
    switch (ev.type) {
      case 'attack':
        if (A) {
          A.lungeUntil = this.now + 220;
          if (A.puppet) {
            if (!A.move) A.move = this.pickMove(A, ea, ev.v === 2);
            A.moveUntil = this.now + MOVES[A.move].ms;
            if (MOVES[A.move].hit === 'legs' || MOVES[A.move].turn) this.sfx.play('whoosh', 0.9);
          }
          this.setExpr(A, 'angry', 450);
          if (ev.v === 2) {
            A.heavyUntil = this.now + 900;
            this.vox(A, 'yell', 0.9, true);
            this.sfx.play('whoosh', 1.4);
          } else this.vox(A, Math.random() < 0.5 ? 'yell' : 'grunt', 0.3);
          this.bark(A, Math.random() < 0.5 && bundle.live[`job_${A.career}`] ? `job_${A.career}` : 'bark_attack', 0.14);
        }
        this.sfx.play('whoosh', 0.6);
        break;
      case 'hit':
      case 'crit': {
        const crit = ev.type === 'crit';
        if (crit) this.hitStop(70, 0.18);
        else if (ev.s === 'body') this.hitStop(70, 0.12);
        if (ea && isMover(ea.def)) {
          this.hitStop(90, 0.15);
          this.sfx.play('thud', 1.2);
          this.sfx.play('boing');
          if (B) this.bark(B, 'bark_mover', 0.9, { prop: nameOf(ea.def).toLowerCase() }, true);
        }
        if (B) {
          // Flinch where the blow landed: uppercut snaps the head back, a low kick makes them hop.
          B.hitStyle = A?.move ? MOVES[A.move].hit : ea?.kind === 'prop' ? 'head' : 'side';
          if (A?.move && B.puppet) {
            const style = MOVES[A.move].hit;
            if (style === 'head' && A.move === 'uppercut') this.kick(B, 0, -B.r * 0.8);
          }
          B.hitUntil = this.now + 300;
          B.flashUntil = this.now + 140;
          B.flashColor = 0xff6b6b;
          B.knockX = ea ? (eb && ea.x > eb.x ? -1 : 1) : 1;
          this.setExpr(B, 'hurt', 550);
          const byProp = ea?.kind === 'prop' || (ev.cause >= 0 && ev.s === 'blunt' && !A);
          const hurtKey = !byProp && B.kind === 'char' && Math.random() < 0.45 && bundle.live[`jobhurt_${B.career}`] ? `jobhurt_${B.career}` : byProp ? 'bark_hit_by_prop' : B.kind === 'npc' ? 'bark_ref_card' : 'bark_hurt';
          this.bark(B, hurtKey, crit ? 0.6 : ev.s === 'body' ? 0.8 : 0.2, { prop: ea ? nameOf(ea.def).toLowerCase() : 'thing' });
          if (B.kind === 'char') this.vox(B, byProp && ev.v >= 12 ? 'scream' : 'ouch', crit || ev.s === 'body' ? 0.9 : 0.5, crit);
          // Knock the ragdoll (if they're floppy) away from the hitter.
          const dir = ea && eb ? Math.sign(eb.x - ea.x) || 1 : 1;
          this.kick(B, dir * B.r * (0.4 + ev.v / 25), -B.r * (0.3 + ev.v / 40));
        }
        if (A && A.kind === 'char' && crit) {
          this.setExpr(A, 'happy', 700);
          this.bark(A, 'bark_crit', 0.45);
        }
        if (A && B && A.team === B.team && A.kind === 'char' && A.id !== B.id) this.bark(A, 'bark_friendly', 0.5);
        this.float(crit ? `CRIT -${ev.v}` : `-${ev.v}`, this.posOf(ev.b, byId), crit ? 0xffd000 : 0xff5a5a, crit ? 18 : 13);
        this.sparks(this.posOf(ev.b, byId), crit ? 0xffd000 : 0xffffff, crit ? 22 : 12);
        if (crit) this.shake = Math.max(this.shake, 6);
        if (A && A.heavyUntil > this.now && B) {
          // Heavy weapon connects: WHAM, and they go flying.
          A.heavyUntil = 0;
          this.hitStop(130, 0.25);
          this.shake = Math.max(this.shake, 11);
          this.float('WHAM!', this.posOf(ev.b, byId), 0xfb923c, 24);
          B.flightHint = { style: Math.random() < 0.75 ? 'launch' : 'spin', at: this.now };
          this.sfx.play('thud', 1.4);
          this.vox(B, 'scream', 1, true);
        }
        this.sfx.play(crit ? 'crit' : ev.s === 'electric' ? 'zap' : ev.s === 'fire' ? 'fire' : 'punch', Math.min(1.4, 0.5 + ev.v / 20));
        break;
      }
      case 'heal':
        this.float(`+${ev.v}`, this.posOf(ev.b, byId), 0x4ade80, 13);
        if (B) {
          B.flashUntil = this.now + 200;
          B.flashColor = 0xa7f3d0;
        }
        if (A && B && A.team !== B.team && A.kind === 'char' && B.kind === 'char') this.bark(A, 'bark_heal_enemy', 0.8);
        this.sfx.play('heal');
        break;
      case 'abilityCast': {
        const ab = bundle.abilities.find((x) => x.id === ev.s);
        const color = abilityColor(ab);
        const at = this.posOf(ev.a, byId);
        if (A) {
          A.castColor = color;
          A.throwUntil = this.now + 320;
          A.flashUntil = this.now + 260;
          A.flashColor = color;
          this.setExpr(A, color === ABILITY_COLORS.heal ? 'happy' : 'angry', 700);
        }
        if (at) this.pill(`${nameOf(ev.s)}`, at, color);
        if (ab && ea) this.abilityVfx(ab, ea, eb, color);
        this.sfx.play('power', 0.8);
        this.sfx.play(sfxForAbility(color));
        break;
      }
      case 'statusApplied': {
        if (!B || B.kind !== 'char') {
          if (ev.s === 'status.live') this.sfx.play('zap');
          if (ev.s === 'status.burning') this.sfx.play('fire', 0.6);
          break;
        }
        const map: Record<string, [string, SfxName | null, Expr]> = {
          'status.burning': ['bark_burning', 'fire', 'scared'],
          'status.electrified': ['bark_electrified', 'zap', 'scared'],
          'status.wet': ['bark_wet', 'splash', 'hurt'],
          'status.slipping': ['bark_slip', 'boing', 'scared'],
          'status.caffeinated': ['bark_coffee', 'slurp', 'happy'],
          'status.knocked-down': ['bark_hurt', 'thud', 'hurt'],
          'status.crawling': ['bark_crawl', null, 'scared'],
          'status.embarrassed': ['', 'blah', 'hurt'],
          'status.stunned': ['', null, 'stunned'],
          'status.inspired': ['', 'pop', 'happy'],
          'status.foamed': ['', 'splash', 'hurt'],
        };
        const m = map[ev.s];
        if (m) {
          if (m[0]) this.bark(B, m[0], ev.s === 'status.burning' || ev.s === 'status.electrified' ? 0.8 : 0.4);
          if (m[1]) this.sfx.play(m[1]);
          if (ev.s === 'status.burning' || ev.s === 'status.electrified') this.vox(B, 'scream', 0.6);
          this.setExpr(B, m[2], 700);
        }
        break;
      }
      case 'throw':
        if (A) {
          A.throwUntil = this.now + 320;
          this.vox(A, 'grunt', 0.5);
          this.bark(A, 'bark_throw', 0.25);
        }
        this.sfx.play('whoosh', 1);
        break;
      case 'pickUp':
        if (ev.v === 2) {
          // Picked up a heavy weapon.
          this.float(`${nameOf(ev.s)}!`, this.posOf(ev.a, byId), 0xfacc15, 17);
          if (A) {
            this.bark(A, 'bark_heavy', 0.9, { prop: nameOf(ev.s).toLowerCase() }, true);
            this.vox(A, 'yell', 0.8);
          }
          this.sfx.play('power');
        } else if (ev.v === 1) {
          this.float('REARMED', this.posOf(ev.a, byId), 0x93c5fd, 13);
          if (A) this.bark(A, 'bark_rearmed', 0.5, { item: nameOf(ev.s).toLowerCase() });
          this.sfx.play('pop');
        } else {
          if (A) this.bark(A, 'bark_pickup', 0.3, { prop: nameOf(ev.s).toLowerCase() });
          this.sfx.play('pop');
        }
        break;
      case 'push':
        if (A) A.lungeUntil = this.now + 250;
        this.sfx.play('whoosh', 0.8);
        break;
      case 'ride':
        this.bark(A, 'bark_ride', 0.7);
        this.sfx.play('boing');
        break;
      case 'grab': {
        if (A) {
          A.throwUntil = this.now + 450;
          this.setExpr(A, 'angry', 700);
          this.bark(A, 'bark_thrower', 0.5);
          this.vox(A, 'yell', 0.8);
        }
        if (B) {
          this.setExpr(B, 'scared', 1200);
          this.bark(B, 'bark_thrown', 0.7, {}, true);
          this.vox(B, 'scream', 1, true);
          const dir = ea && eb ? Math.sign(eb.x - ea.x) || 1 : 1;
          const spin = ev.s === 'behind' ? -1.4 * dir : ev.s === 'up' ? 0.6 * dir : 0.9 * dir;
          this.kick(B, dir * B.r * 0.5, -B.r * 1.4, spin);
        }
        this.sfx.play('whoosh', 1.3);
        this.sfx.play('ooh');
        this.shake = Math.max(this.shake, 3);
        break;
      }
      case 'wallHit': {
        const v = this.wallViews[ev.b];
        if (v) {
          v.wobbleUntil = this.now + 300;
          this.sparks([v.cx, v.by - v.h * 0.4], 0xd6d3d1, 10);
          if (A) this.bark(A, 'bark_wall', 0.15);
        }
        this.sfx.play('thud', 0.7);
        break;
      }
      case 'wallBroken': {
        const v = this.wallViews[ev.b];
        if (v) {
          v.dir = ev.v >= 0 ? 1 : -1;
          v.brokenAt = this.now;
          const at: [number, number] = [v.cx, v.by];
          for (let i = 0; i < 3; i++) this.sparks([at[0] + (i - 1) * v.h * 0.5, at[1] - v.h * 0.3], 0xd6d3d1, 26);
          this.float(Math.random() < 0.5 ? 'CRASH!' : 'TIMBER!', [at[0], at[1] + v.h * 0.3], 0xfb923c, 24);
          // Rubble stays where it fell.
          const w = v.h * 1.3;
          const bits = Array.from({ length: 14 }, () => [(Math.random() - 0.5) * w * 1.6, v.dir * Math.random() * v.h * 0.35, 3 + Math.random() * v.h * 0.08, Math.random()] as const);
          this.decal((g) => {
            g.ellipse(at[0], at[1] + v.dir * v.h * 0.15, w * 0.9, v.h * 0.18).fill({ color: 0x78716c, alpha: 0.35 });
            for (const [dx, dy, r, c] of bits) g.rect(at[0] + dx, at[1] + dy, r * 1.6, r).fill(c < 0.5 ? 0x9ca3af : 0xa16207);
          });
        }
        this.hitStop(130, 0.25);
        this.shake = Math.max(this.shake, 14);
        this.sfx.play('boom', 0.8);
        this.sfx.play('glass');
        this.sfx.play('ooh');
        break;
      }
      case 'rivalry': {
        if (A && B) {
          this.bark(A, 'bark_rivalry', 1, {}, true);
          this.setExpr(A, 'angry', 2500);
          this.setExpr(B, 'angry', 2500);
          const pa = this.posOf(ev.a, byId);
          const pb = this.posOf(ev.b, byId);
          this.float('RIVAL!', pa, 0xef4444, 18);
          this.float('RIVAL!', pb, 0xef4444, 18);
          if (pa && pb) {
            this.addShape((g, k) => {
              const n = 10;
              g.moveTo(pa[0], pa[1] - A.r * 3);
              for (let i = 1; i <= n; i++) g.lineTo(pa[0] + ((pb[0] - pa[0]) * i) / n + (i < n ? (Math.random() - 0.5) * 16 : 0), pa[1] - A.r * 3 + ((pb[1] - pa[1]) * i) / n + (i < n ? (Math.random() - 0.5) * 16 : 0));
              g.stroke({ width: 3, color: 0xef4444, alpha: k });
            }, 1600);
          }
          this.sfx.play('zap');
        }
        break;
      }
      case 'revenge': {
        this.hitStop(170, 0.3);
        if (A) {
          this.bark(A, 'bark_revenge', 1, {}, true);
          this.setExpr(A, 'happy', 2000);
        }
        this.float('REVENGE!', this.posOf(ev.b, byId), 0xfacc15, 28);
        this.shake = Math.max(this.shake, 12);
        this.sfx.play('cheer');
        this.sfx.play('fanfare');
        break;
      }
      case 'consume': {
        // A packed item fires: a snack/smoke/pill pops over their head.
        const item = bundle.shopItems.find((i) => i.id === ev.s);
        if (A) {
          this.bark(A, 'bark_consume', ev.v === 0 ? 0.3 : 0.7);
          this.setExpr(A, 'happy', 900);
        }
        this.float(`${item?.icon ?? '🎒'} ${nameOf(ev.s)}`, this.posOf(ev.a, byId), 0x86efac, 15);
        this.sfx.play(item?.effects?.some((f) => f.type === 'heal' || (f.type === 'applyStatus' && f.status === 'status.regen')) ? 'slurp' : 'pop');
        this.sfx.play('heal', 0.6);
        break;
      }
      case 'evade': {
        if (A) {
          A.dashUntil = this.now + 320;
          A.dashDir = ea && eb ? Math.sign(ea.x - eb.x) || 1 : 1;
          if (ev.s !== 'back' && ea && eb) A.dashDir = Math.random() < 0.5 ? 1 : -1;
          this.setExpr(A, 'happy', 700);
          this.bark(A, 'bark_evade', 0.35);
          this.speedLines(this.posOf(ev.a, byId), A.dashDir, A.r);
        }
        if (B) this.setExpr(B, 'angry', 600);
        this.float(ev.s === 'back' ? 'BACKSTEP!' : 'DODGE!', this.posOf(ev.a, byId), 0x67e8f9, 15);
        this.sfx.play('whoosh', 1.4);
        break;
      }
      case 'parry': {
        this.hitStop(60, 0.1);
        if (A) {
          A.parryUntil = this.now + 350;
          this.setExpr(A, 'angry', 600);
          this.bark(A, 'bark_parry', 0.4);
        }
        if (B) {
          B.hitUntil = this.now + 300;
          B.hitStyle = 'head';
          this.setExpr(B, 'stunned', 900);
        }
        this.float('PARRY!', this.posOf(ev.a, byId), 0xfde047, 17);
        this.sparks(this.posOf(ev.a, byId), 0xfde047, 12);
        this.sfx.play('bell', 1.6);
        this.shake = Math.max(this.shake, 3);
        break;
      }
      case 'dash': {
        if (A) {
          A.dashUntil = this.now + 320;
          A.dashDir = ea && eb ? Math.sign(eb.x - ea.x) || 1 : ea && ea.fx < 0 ? -1 : 1;
          if (ev.s === 'retreat') A.dashDir = -A.dashDir;
          this.bark(A, 'bark_dash', 0.12);
          this.speedLines(this.posOf(ev.a, byId), A.dashDir, A.r);
        }
        this.sfx.play('whoosh', 0.8);
        break;
      }
      case 'landed':
        if (ev.v >= 14) {
          this.hitStop(90, 0.16);
          this.vox(this.chars.get(ev.b), 'ouch', 1, true);
          // The floor remembers a good slam.
          const at = this.posOf(ev.b, byId);
          if (at) {
            const r = 420 * this.scale;
            const cracks = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2 + Math.random() * 0.5);
            this.decal((g) => {
              for (const a of cracks) g.moveTo(at[0], at[1]).lineTo(at[0] + Math.cos(a) * r * (0.8 + Math.random() * 0.8), at[1] + Math.sin(a) * r * 0.45);
              g.stroke({ width: Math.max(1, 25 * this.scale), color: 0x1f2937, alpha: 0.45 });
            });
          }
        }
        if (ev.v > 0) {
          this.float(ev.v >= 14 ? 'SLAM!' : 'THUD', this.posOf(ev.b, byId), ev.v >= 14 ? 0xffd000 : 0xffffff, ev.v >= 14 ? 22 : 15);
          this.sparks(this.posOf(ev.b, byId), 0xe5e7eb, 18);
          this.kick(B, 0, B ? -B.r * 0.6 : 0);
          this.shake = Math.max(this.shake, ev.v >= 14 ? 10 : 5);
          this.sfx.play('thud', 1.4);
          if (ev.v >= 14) this.sfx.play('cheer');
          this.witnesses(eb, (s, same) => {
            this.setExpr(s, same ? 'scared' : 'happy', 800);
            if (!same) this.bark(s, 'bark_enemy_down', 0.25);
          });
        }
        break;
      case 'banter': {
        const sy = bundle.synergies.find((x) => x.id === ev.s);
        const line = sy?.lines[ev.v];
        if (A && line) {
          // The banter line is the joke: always show it, and for longer.
          this.say(A, line, 2600);
          const angry = sy?.effects?.some((x) => x.type === 'taunt');
          this.setExpr(A, angry ? 'angry' : sy?.effects?.some((x) => x.type === 'applyStatus' && x.status === 'status.embarrassed') ? 'hurt' : 'happy', 1400);
          A.bubbleUntil = this.now + 2600;
        }
        if (B) this.setExpr(B, 'stunned', 600);
        this.sfx.play('blah');
        break;
      }
      case 'ruleFired':
        if (ev.s === 'rule.stepped-on-rake') {
          this.bark(B, 'bark_rake', 1, {}, true);
          this.sfx.play('thud', 1.3);
          this.sfx.play('boing');
          this.float('THWACK!', this.posOf(ev.b, byId), 0xffffff, 20);
          this.shake = Math.max(this.shake, 5);
        }
        break;
      case 'hazardStart':
        if (isMover(ev.s.replace('hazard.', 'prop.'))) {
          this.announce(`⚠ ${nameOf(ev.s.replace('hazard.', 'prop.'))} incoming!`);
          this.sfx.play('alarm');
        }
        break;
      case 'use': {
        if (ea?.kind === 'prop') {
          this.sfx.play('slurp');
          this.float('gulp', this.posOf(ev.a, byId), 0xe5e7eb, 12);
          break;
        }
        const def = bundle.props.find((p) => p.id === ev.s);
        if (def?.tags.includes('drink')) this.sfx.play('slurp');
        else if (def?.tags.includes('food')) this.bark(A, 'bark_food', 0.6);
        else this.sfx.play('pop');
        break;
      }
      case 'disarm': {
        if (B) {
          this.setExpr(B, 'scared', 900);
          this.bark(B, 'bark_disarmed', 0.8, { item: nameOf(ev.s).toLowerCase() }, true);
        }
        this.float('DISARMED!', this.posOf(ev.b, byId), 0xe5e7eb, 16);
        this.sfx.play('boing', 1.2);
        this.sfx.play('thud', 0.6);
        break;
      }
      case 'choke': {
        if (A) {
          this.setExpr(A, 'angry', 2000);
          this.bark(A, 'bark_choking', 0.7, {}, true);
        }
        if (B) {
          this.setExpr(B, 'stunned', 2000);
          this.vox(B, 'gasp', 1, true);
        }
        this.float('CHOKE HOLD!', this.posOf(ev.b, byId), 0xc084fc, 18);
        this.sfx.play('squeak');
        this.sfx.play('ooh');
        break;
      }
      case 'propBroken': {
        const def = bundle.props.find((p) => p.id === ev.s);
        if (def?.heavy) this.float('BROKE!', this.posOf(ev.b, byId) ?? this.posOf(ev.a, byId), 0xfacc15, 16);
        if (def?.area) break;
        this.splat(this.posOf(ev.b, byId), hex(def?.art.color ?? '#9ca3af'), Math.max(10, (eb?.r ?? 300) * this.scale * 1.6));
        this.sfx.play(def?.tags.includes('material:glass') ? 'glass' : def?.tags.includes('food') || def?.tags.includes('liquid') ? 'splash' : 'thud');
        this.sparks(this.posOf(ev.b, byId), 0xe5e7eb, 16);
        break;
      }
      case 'drop':
        this.sfx.play('thud', 0.5);
        break;
      case 'downed':
        this.hitStop(100, 0.2);
        this.float('DOWN!', this.posOf(ev.b, byId), 0xffffff, 18);
        this.witnesses(eb, (s, same) => {
          this.setExpr(s, same ? 'scared' : 'happy', 800);
          this.bark(s, same ? 'bark_ally_down' : 'bark_enemy_down', 0.35);
        });
        this.sfx.play('down');
        this.sfx.play('ooh');
        this.vox(B, Math.random() < 0.5 ? 'wail' : 'ouch', 1, true);
        if (B) {
          const victim = B;
          setTimeout(() => this.ready && this.bark(victim, 'bark_downed_crawl', 0.6), 1400);
        }
        break;
      case 'ko':
        this.float('KO!', this.posOf(ev.b, byId), 0xff3b3b, 26);
        this.shake = Math.max(this.shake, 9);
        if (A && A.kind === 'char' && B && A.team !== B.team) {
          this.setExpr(A, 'happy', 1200);
          this.bark(A, 'bark_ko_win', 0.8, {}, true);
          this.vox(A, 'cheer', 0.7);
        }
        this.vox(B, 'wail', 1, true);
        this.witnesses(eb, (s, same) => {
          if (s === A) return;
          this.setExpr(s, same ? 'scared' : 'happy', 1000);
          this.bark(s, same ? 'bark_ally_down' : 'bark_enemy_down', 0.5);
        });
        this.sfx.play('bell');
        this.sfx.play('cheer');
        break;
      case 'revived':
        this.float('REVIVED!', this.posOf(ev.b, byId), 0x4ade80, 18);
        this.bark(B, 'bark_revived', 0.8, {}, true);
        this.vox(B, 'gasp', 1, true);
        this.bark(A, 'bark_reviver', 0.4);
        this.sfx.play('heal');
        break;
      case 'panic':
        this.bark(A, 'bark_panic', 0.9, {}, true);
        this.vox(A, 'scream', 0.8, true);
        this.sfx.play('ooh');
        break;
      case 'card': {
        this.float('🟨 CARD', this.posOf(ev.b, byId), 0xffe600, 18);
        this.bark(B, 'bark_card', 0.9, {}, true);
        const ref = this.chars.get(this.refId);
        if (ref) this.bark(ref, 'bark_ref_card', 1, {}, true);
        this.sfx.play('whistle');
        break;
      }
      case 'foul':
        this.sfx.play('whistle', 0.5);
        break;
      case 'taunt':
        if (ev.b < 0) {
          this.bark(A, 'bark_taunt', 0.7);
          this.float('😜', this.posOf(ev.a, byId), 0xffffff, 18);
        } else if (B) this.setExpr(B, 'angry', 800);
        this.sfx.play('blah');
        break;
      case 'refereeDown':
        this.announce('THE REFEREE IS DOWN!');
        for (const s of this.chars.values()) if (s.kind === 'char') this.bark(s, 'bark_ref_down', 0.3);
        this.shake = Math.max(this.shake, 8);
        this.sfx.play('whistle');
        this.sfx.play('ooh');
        break;
      case 'suddenDeath':
        this.announce(ev.v <= 1 ? 'SUDDEN DEATH' : `SUDDEN DEATH ×${ev.v}`);
        this.sfx.play('alarm');
        break;
      case 'hazardWarn':
        this.announce(`⚠ ${nameOf(ev.s).replace(/^Hazard\s*/i, '')}`);
        this.sfx.play('dingdong');
        break;
      case 'explosion': {
        const e = byId.get(ev.b);
        const at = e ? this.px(e.x, e.y) : null;
        if (at) {
          const rad = ev.v * this.scale;
          this.addShape((g, k) => {
            const p = 1 - k;
            g.circle(at[0], at[1], rad * (0.3 + p * 0.8)).fill({ color: 0xff7a00, alpha: 0.55 * k });
            g.circle(at[0], at[1], rad * (0.15 + p * 0.5)).fill({ color: 0xfff176, alpha: 0.7 * k });
            g.circle(at[0], at[1], rad * (0.3 + p)).stroke({ width: 4, color: 0x1b1f2a, alpha: 0.4 * k });
          }, 600);
          this.witnesses(e, (s) => {
            this.setExpr(s, 'scared', 900);
            this.bark(s, 'bark_explosion', 0.4);
          });
        }
        this.announce('BOOM!');
        this.shake = Math.max(this.shake, 14);
        this.sfx.play('boom');
        break;
      }
      case 'battleEnd':
        for (const s of this.chars.values()) {
          if (s.kind !== 'char') continue;
          if (ev.v >= 0 && s.team === ev.v) {
            this.setExpr(s, 'happy', 99999);
            this.bark(s, 'bark_win', 0.6, {}, true);
            this.vox(s, 'cheer', 0.8, true);
          }
        }
        this.announce(ev.v >= 0 ? `${this.input.teams[ev.v]?.playerName ?? 'Winners'} WIN!` : 'DRAW!');
        this.sfx.play('fanfare');
        this.sfx.play('cheer');
        break;
      default:
        break;
    }
  }

  private tickFx(dt: number): void {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]!;
      f.life -= dt;
      if (f.life <= 0) {
        f.g.destroy({ children: true });
        this.fx.splice(i, 1);
        continue;
      }
      f.update?.(f.life / f.max);
    }
    if (this.bannerLife > 0) {
      this.bannerLife -= dt;
      this.banner.alpha = Math.min(1, this.bannerLife / 400);
    } else this.banner.alpha = 0;
  }

  /**
   * Action replay mode (slow motion): zoom lens on the given entities,
   * cinematic bars, a REPLAY badge and lower-pitched sound. Pass null to exit.
   */
  setReplay(ids: number[] | null, label = '● ACTION REPLAY'): void {
    this.replayLabel = label;
    this.replayFocus = ids;
    this.sfx.rate = ids ? 0.5 : 1;
    this.drawOverlay();
  }

  private drawOverlay(): void {
    this.overlay.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.replayBadge = null;
    this.lens = null;
    if (!this.replayFocus) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const bar = Math.round(sh * 0.09);
    this.lens = new Graphics();
    this.lensPos = { x: sw / 2, y: sh / 2 };
    this.drawLens();
    const g = new Graphics();
    g.rect(0, 0, sw, bar).fill(0x000000).rect(0, sh - bar, sw, bar).fill(0x000000);
    this.overlay.addChild(this.lens);
    const badge = new Text({ text: this.replayLabel, style: { fontFamily: FONT, fontSize: Math.max(12, bar * 0.45), fontWeight: '900', fill: 0xffffff, letterSpacing: 2 }, resolution: 2 });
    badge.anchor.set(0, 0.5);
    badge.position.set(12, bar / 2);
    const slow = new Text({ text: '½× SLOW-MO', style: { fontFamily: FONT, fontSize: Math.max(10, bar * 0.35), fontWeight: '800', fill: 0xfde047 }, resolution: 2 });
    slow.anchor.set(1, 0.5);
    slow.position.set(sw - 12, sh - bar / 2);
    this.overlay.addChild(g, badge, slow);
    this.replayBadge = badge;
  }

  private drawLens(): void {
    if (!this.lens) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const bar = Math.round(sh * 0.09);
    const r = Math.min(sw, sh - bar * 2) * 0.46;
    const { x, y } = this.lensPos;
    this.lens.clear();
    this.lens.rect(0, 0, sw, sh).fill({ color: 0x0b0d12, alpha: 0.45 }).circle(x, y, r).cut();
    this.lens.circle(x, y, r).stroke({ width: 3, color: 0xffffff, alpha: 0.6 });
  }

  /**
   * Director camera: follow the "hottest" fight (recent hits, abilities, KOs)
   * and zoom in on it — strongly on phones, gently on desktop. In replay mode,
   * lock onto the replayed characters. Adds screen shake for big moments.
   */
  private updateCamera(dt: number, minX: number): void {
    const [W, H] = this.arena.sizeMm;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const { x0: left, x1: right, y0: top, y1: bottom } = this.bounds;
    const fullW = right - left;
    void W;
    void H;
    const decay = Math.exp(-dt / 2500);
    for (const c of this.chars.values()) c.heat *= decay;
    let tz = 1;
    let tx = (left + right) / 2;
    let ty = (top + bottom) / 2;
    let speed = 600;
    const frame = (xs: CharSprite[], maxZ: number, pad: number) => {
      if (xs.length === 0) return;
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const c of xs) {
        x0 = Math.min(x0, c.x);
        x1 = Math.max(x1, c.x);
        y0 = Math.min(y0, c.y);
        y1 = Math.max(y1, c.y);
      }
      tz = Math.max(1, Math.min(maxZ, sw / (x1 - x0 + pad * 2), sh / (y1 - y0 + pad * 3)));
      tx = (x0 + x1) / 2;
      ty = (y0 + y1) / 2 - 900 * this.scale;
    };
    if (this.replayFocus) {
      frame([...this.chars.values()].filter((c) => this.replayFocus!.includes(c.id) && c.root.visible), this.compact ? 2.4 : 2.6, 1800 * this.scale);
      speed = 250;
      if (this.replayBadge) this.replayBadge.alpha = Math.floor(this.now / 500) % 2 ? 1 : 0.55;
    } else {
      const alive = [...this.chars.values()].filter((c) => c.alive && c.root.visible);
      const hottest = alive.reduce<CharSprite | null>((best, c) => (!best || c.heat > best.heat ? c : best), null);
      if (hottest && hottest.heat > 1.5) {
        const near = alive.filter((c) => Math.hypot(c.x - hottest.x, c.y - hottest.y) < 5500 * this.scale);
        frame(near, this.compact ? 1.7 : 1.3, 3000 * this.scale);
      } else if (this.compact && Number.isFinite(minX)) {
        frame(alive, 1.5, 2500 * this.scale);
      }
      if (!this.compact && tz < 1.05) {
        tz = 1;
        tx = (left + right) / 2;
        ty = (top + bottom) / 2;
      }
    }
    const k = Math.min(1, dt / speed);
    this.cam.z += (tz - this.cam.z) * k;
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    // Keep the view inside the arena (centre it when the arena is smaller than the view).
    const halfW = sw / 2 / this.cam.z;
    const halfH = sh / 2 / this.cam.z;
    const cx = fullW < halfW * 2 ? (left + right) / 2 : Math.min(right - halfW, Math.max(left + halfW, this.cam.x));
    const cy = bottom - top < halfH * 2 ? (top + bottom) / 2 : Math.min(bottom - halfH, Math.max(top + halfH, this.cam.y));
    this.shake = Math.max(0, this.shake - dt * 0.03);
    const jx = (Math.random() - 0.5) * this.shake;
    const jy = (Math.random() - 0.5) * this.shake;
    this.world.scale.set(this.cam.z);
    this.world.x = sw / 2 - cx * this.cam.z + jx;
    this.world.y = sh / 2 - cy * this.cam.z + jy;
    if (this.lens) {
      // Where the replayed action actually is on screen (off-centre when the camera hit an edge).
      const bar = Math.round(sh * 0.09);
      const r = Math.min(sw, sh - bar * 2) * 0.46;
      const lx = Math.min(sw - r * 0.7, Math.max(r * 0.7, sw / 2 + (tx - cx) * this.cam.z));
      const ly = Math.min(sh - bar - r * 0.5, Math.max(bar + r * 0.5, sh / 2 + (ty - cy) * this.cam.z));
      const lk = Math.min(1, dt / 200);
      this.lensPos.x += (lx - this.lensPos.x) * lk;
      this.lensPos.y += (ly - this.lensPos.y) * lk;
      this.drawLens();
    }
  }
}

function star(g: Graphics, x: number, y: number, r: number, color: number): void {
  if (r <= 0.5) return;
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.poly(pts).fill(color).stroke({ width: 1, color: OUTLINE });
}
