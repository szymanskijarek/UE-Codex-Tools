// CSP-safe Pixi code paths, same as the battle renderer.
import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { useEffect, useRef } from 'preact/hooks';
import { bundle } from '@cc/content';
import { drawHeavy, heavyLength } from '../replay/heavy-art';
import { heavySprite, heldIsTool, heldSprite, loadItems } from '../replay/items';
import { loadPuppets, NEUTRAL, Puppet, PUPPET_HEIGHT, type Pose } from '../replay/puppet';
import { hypePose, idlePose, type IdleStyle } from '../career/PuppetView';

/**
 * Pose lab (#/lab, not linked): checks art against the puppet rig — every held
 * weapon in three arm positions, the heavy weapons, and frames from each
 * airborne style. Handy when new item or weapon art arrives.
 */
const ARMS: [string, Partial<Pose>][] = [
  ['rest', {}],
  ['guard', { armF: -1.2, elbowF: -1.4 }],
  ['strike', { armF: -1.55, elbowF: -0.1, lean: 0.12 }],
  ['overhead', { armF: -2.7, elbowF: -0.4 }],
];

function holdIn(pu: Puppet, layer: Container, f: number, tool: boolean, draw: (c: Container, g: Graphics) => void): void {
  const c = new Container();
  const g = new Graphics();
  g.rotation = -Math.PI / 2;
  c.addChild(g);
  // Tools are mirrored back across their own axis when facing left, as in battle.
  const inner = new Container();
  if (tool) inner.scale.y = f;
  c.addChild(inner);
  draw(inner, g);
  c.position.set(pu.hand.x, pu.hand.y);
  // Same wrist bend as the battle renderer (gripRot).
  c.rotation = pu.hand.rot + (tool ? f * 1.9 * Math.max(0, f * Math.cos(pu.hand.rot + Math.PI / 2)) : 0);
  c.scale.x = f;
  layer.addChild(c);
}

export function Lab() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = new Application();
    let alive = true;
    void (async () => {
      await Promise.all([loadPuppets(), loadItems()]);
      const weapons = bundle.equipment.filter((x) => x.slot === 'held' && x.attack);
      const heavies = bundle.props.filter((p) => p.heavy);
      const r = 18;
      const cellW = 96;
      const cellH = r * PUPPET_HEIGHT + 40;
      const cols = ARMS.length * 2;
      const rows = weapons.length + heavies.length + 3 + 4 + 9;
      await app.init({ width: cols * cellW + 150, height: rows * cellH, background: 0xf3efe6, antialias: true, preference: 'webgl' });
      if (!alive || !host.current) return;
      host.current.appendChild(app.canvas);
      const careers = ['career.builder', 'career.chef', 'career.teacher', 'career.lawyer'];
      const label = (t: string, x: number, y: number) => {
        const tx = new Text({ text: t, style: { fontSize: 11, fill: 0x1b1f2a } });
        tx.position.set(x, y);
        app.stage.addChild(tx);
      };
      let row = 0;
      const cell = (i: number, fn: (pu: Puppet, x: number, y: number, f: number) => void, career: string) => {
        const x = 150 + i * cellW + cellW / 2;
        const y = row * cellH + cellH - 12;
        const f = i % 2 === 0 ? 1 : -1;
        const pu = new Puppet(career, r);
        app.stage.addChild(pu.root);
        fn(pu, x, y, f);
      };
      for (const w of weapons) {
        label(w.id.replace('equipment.', ''), 4, row * cellH + cellH / 2);
        const len = r * ((w.attack?.rangeMm ?? 1000) > 1500 ? 1.9 : 1.2) * 1.25;
        for (let i = 0; i < cols; i++) {
          cell(i, (pu, x, y, f) => {
            pu.pose({ ...NEUTRAL, ...ARMS[i >> 1]![1] }, x, y, f);
            pu.render(pu.xs, pu.ys, f);
            holdIn(pu, app.stage, f, heldIsTool(w.id), (c) => {
              const s = heldSprite(w.id, len);
              if (s) c.addChild(s);
            });
          }, careers[row % careers.length]!);
        }
        row++;
      }
      for (const h of heavies) {
        label(h.id.replace('prop.', ''), 4, row * cellH + cellH / 2);
        for (let i = 0; i < cols; i++) {
          cell(i, (pu, x, y, f) => {
            const arms = i >> 1 === 0 ? { armF: -0.9, elbowF: -1.9, armB: -0.7, elbowB: -2.0 } : ARMS[i >> 1]![1];
            pu.pose({ ...NEUTRAL, ...arms }, x, y, f);
            pu.render(pu.xs, pu.ys, f);
            holdIn(pu, app.stage, f, true, (c, g) => {
              const len = heavyLength(h.id, r);
              const s = heavySprite(h.id, len);
              if (s) c.addChild(s);
              else drawHeavy(g, h.id, len);
            });
          }, careers[row % careers.length]!);
        }
        row++;
      }
      // Menu idles (one row per style, frames through the loop) and the selection animation.
      const STYLES: IdleStyle[] = ['bounce', 'sway', 'jog', 'slump', 'nervous', 'proud', 'chaos', 'breathe'];
      for (const st of STYLES) {
        label(`idle: ${st}`, 4, row * cellH + cellH / 2);
        for (let i = 0; i < cols; i++) {
          cell(i, (pu, x, y, f) => {
            pu.pose(idlePose(st, i * 0.37, r, 1.3), x, y, f);
            pu.render(pu.xs, pu.ys, f);
          }, careers[i % careers.length]!);
        }
        row++;
      }
      label('selection', 4, row * cellH + cellH / 2);
      for (let i = 0; i < cols; i++) {
        cell(i, (pu, x, y, f) => {
          pu.pose(hypePose(i / (cols - 1), r, 'hook'), x, y, f);
          pu.render(pu.xs, pu.ys, f);
        }, careers[i % careers.length]!);
      }
      row++;
      // Painted faces: each emotion on a few careers (both facings).
      const EMO = ['neutral', 'angry', 'surprised', 'hurt'] as const;
      for (const group of [['career.builder', 'career.chef', 'career.teacher', 'career.mime'], ['career.astronaut', 'career.influencer', 'career.police-officer', 'career.politician'], ['career.farmer', 'career.dj', 'career.firefighter', 'career.librarian'], ['career.accountant', 'career.plumber', 'career.hairdresser', 'career.tv-host']]) {
        label(group.map((g) => g.replace('career.', '')).join(', '), 4, row * cellH + 8);
        for (let i = 0; i < cols; i++) {
          cell(i, (pu, x, y, f) => {
            pu.setEmotion(EMO[i % 4]!);
            pu.pose({ ...NEUTRAL }, x, y, f);
            pu.render(pu.xs, pu.ys, f);
          }, group[i >> 1]!);
        }
        row++;
      }
      // Airborne styles: frames through the flight.
      const flights: [string, (t: number) => [Pose, number]][] = [
        ['launch', (t) => [{ ...NEUTRAL, armF: -1.9, armB: -1.4, elbowF: -0.5, elbowB: -0.5, legF: -0.9, legB: -0.5, kneeF: 0.7, kneeB: 0.4, headRot: 0.35 }, Math.min(1.35, t * 3.2)]],
        ['spin', (t) => [{ ...NEUTRAL, legF: -1.5, legB: -1.2, kneeF: 2.3, kneeB: 2.3, armF: -1.1, elbowF: -1.9, armB: -0.8, elbowB: -1.9, headRot: 0.4 }, 11 * t]],
        ['flail', (t) => [{ ...NEUTRAL, armF: t * 17, armB: t * 17 + Math.PI, elbowF: -0.4, elbowB: -0.4, legF: Math.sin(t * 20) * 0.9, legB: -Math.sin(t * 20) * 0.9, kneeF: Math.max(0, -Math.sin(t * 20)) * 1.3, kneeB: Math.max(0, Math.sin(t * 20)) * 1.3 }, 0.3 + Math.sin(t * 7) * 0.15]],
      ];
      for (const [name, at] of flights) {
        label(name, 4, row * cellH + cellH / 2);
        for (let i = 0; i < cols; i++) {
          cell(i, (pu, x, y, f) => {
            const [p, a] = at(i * 0.08);
            // Launched bodies travel away from the way they face, so they tip backwards.
            const { cx, cy } = pu.flight(p, x, y - 10, f, name === 'launch' ? -a * f : a * f, 0);
            const g = new Graphics().circle(cx, cy, 2.5).fill(0xef4444);
            app.stage.addChild(g);
          }, careers[i % careers.length]!);
        }
        row++;
      }
    })();
    return () => {
      alive = false;
      app.destroy(true, { children: true });
    };
  }, []);
  return (
    <section>
      <h1>Pose lab</h1>
      <p class="muted small">Held weapons in rest / guard / strike / overhead (facing right, then left), heavy weapons, and airborne styles through their flight (red dot = pivot).</p>
      <div ref={host} />
    </section>
  );
}
