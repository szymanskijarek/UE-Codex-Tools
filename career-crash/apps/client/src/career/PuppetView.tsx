// CSP-safe Pixi code paths, same as the battle renderer.
import 'pixi.js/unsafe-eval';
import { Application } from 'pixi.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { extension, MOVES, repertoire } from '../replay/moves';
import { hasPuppet, loadPuppets, NEUTRAL, Puppet, PUPPET_HEIGHT, type Pose } from '../replay/puppet';
import { Portrait } from '../ui/components';
import type { Emotion } from '../replay/face-art';
import { voiceFor } from '../replay/voices';
import { menuSfx } from './menuVoice';
import type { Appearance } from '@cc/sim';

/**
 * Full-body character preview for menus: the fighter's sprite puppet with an
 * idle loop that suits them (a boxer's bounce for parriers, a sway for
 * dodgers, jogging on the spot for dashers, slouching for the lazy, nervous
 * glances for cowards, a proud flex for the confident...) and a selection
 * animation — crouch, jump, their signature move, arms up — whenever `hype`
 * changes. Careers without sprite art fall back to the portrait.
 */
export type IdleStyle = 'bounce' | 'sway' | 'jog' | 'slump' | 'nervous' | 'proud' | 'chaos' | 'breathe';

export function idleStyle(careerId: string, personality: string): IdleStyle {
  if (personality === 'personality.lazy') return 'slump';
  if (personality === 'personality.coward' || personality === 'personality.paranoid') return 'nervous';
  if (personality === 'personality.confident' || personality === 'personality.competitive') return 'proud';
  if (personality === 'personality.chaotic') return 'chaos';
  const d = bundle.careers.find((c) => c.id === careerId)?.defense ?? {};
  if ((d.dashBp ?? 0) >= 1200) return 'jog';
  if ((d.parryBp ?? 0) >= 400 || personality === 'personality.aggressive') return 'bounce';
  if ((d.evadeBp ?? 0) >= 300) return 'sway';
  return 'breathe';
}

function idlePose(style: IdleStyle, t: number, r: number, seed: number): Pose {
  const p: Pose = { ...NEUTRAL };
  const s = Math.sin(t * 2.2 + seed);
  p.bob = s * r * 0.04;
  switch (style) {
    case 'bounce': {
      // Boxer on their toes, guard up, the odd jab.
      const b = Math.abs(Math.sin(t * 5 + seed));
      p.bob = b * r * 0.18;
      p.kneeF = p.kneeB = 0.25 - b * 0.2;
      p.armF = -1.1;
      p.elbowF = -1.9;
      p.armB = -0.9;
      p.elbowB = -2.0;
      p.lean = 0.08;
      const jab = (t + seed) % 3.2;
      if (jab < 0.25) {
        p.armF = -1.55;
        p.elbowF = -0.1;
        p.lean = 0.18;
      }
      break;
    }
    case 'sway':
      p.lean = Math.sin(t * 1.8 + seed) * 0.16;
      p.offX = Math.sin(t * 1.8 + seed) * r * 0.25;
      p.armF = -0.6 + Math.sin(t * 1.8) * 0.2;
      p.elbowF = -1.2;
      p.armB = 0.2;
      p.headRot = -p.lean * 0.6;
      break;
    case 'jog': {
      const w = Math.sin(t * 9 + seed);
      p.bob = Math.abs(w) * r * 0.14;
      p.legF = w * 0.35;
      p.legB = -w * 0.35;
      p.kneeF = Math.max(0, -w) * 1.1;
      p.kneeB = Math.max(0, w) * 1.1;
      p.armF = -w * 0.6 - 0.2;
      p.armB = w * 0.6 + 0.2;
      p.elbowF = -1.2;
      p.elbowB = 1.2;
      break;
    }
    case 'slump': {
      p.lean = 0.12;
      p.headRot = 0.25 + Math.sin(t * 0.7) * 0.05;
      p.armF = 0.05;
      p.armB = -0.05;
      p.bob = Math.sin(t * 1.2) * r * 0.03 - r * 0.08;
      p.kneeF = p.kneeB = 0.15;
      // A big yawn every few seconds.
      const y = (t + seed) % 6;
      if (y < 1.2) {
        const k = Math.sin((y / 1.2) * Math.PI);
        p.armF = -2.6 * k;
        p.armB = 2.6 * k;
        p.headRot = -0.35 * k;
        p.lean = -0.1 * k;
      }
      break;
    }
    case 'nervous':
      p.offX = (Math.sin(t * 37) + Math.sin(t * 23)) * r * 0.02;
      p.armF = -1.3;
      p.elbowF = -2.2;
      p.armB = -1.2;
      p.elbowB = -2.2;
      p.headRot = Math.sin(t * 0.9 + seed) > 0.6 ? 0.45 : Math.sin(t * 0.9 + seed) < -0.6 ? -0.45 : 0;
      p.lean = -0.06;
      break;
    case 'proud': {
      p.lean = -0.06;
      p.armF = 0.5;
      p.elbowF = -2.4;
      p.armB = -0.5;
      p.elbowB = 2.4;
      const f = (t + seed) % 5;
      if (f < 1) {
        const k = Math.sin(f * Math.PI);
        p.armF = -1.6 * k + 0.5 * (1 - k);
        p.elbowF = -2.6;
        p.armB = 1.6 * k - 0.5 * (1 - k);
        p.elbowB = 2.6;
        p.bob = r * 0.1 * k;
      }
      break;
    }
    case 'chaos': {
      p.lean = Math.sin(t * 3.1 + seed) * 0.2;
      p.armF = Math.sin(t * 4.3) * 1.8;
      p.armB = Math.sin(t * 3.7 + 1) * 1.8;
      p.legF = Math.sin(t * 2.9) * 0.25;
      p.headRot = Math.sin(t * 5) * 0.3;
      p.bob = Math.abs(Math.sin(t * 6)) * r * 0.1;
      break;
    }
    default:
      p.armF = -0.15 + s * 0.05;
      p.armB = 0.15 - s * 0.05;
      p.headRot = Math.sin(t * 0.6 + seed) * 0.2;
  }
  return p;
}

/** Selection animation over 1.6 s: crouch, jump with arms up, signature move, triumphant pose. */
function hypePose(u: number, r: number, move: keyof typeof MOVES): Pose {
  const p: Pose = { ...NEUTRAL };
  if (u < 0.15) {
    const k = u / 0.15;
    p.bob = -r * 0.35 * k;
    p.kneeF = p.kneeB = 1.0 * k;
    p.legF = -0.4 * k;
    p.legB = 0.4 * k;
    p.armF = 0.6 * k;
    p.armB = 0.6 * k;
  } else if (u < 0.4) {
    const k = (u - 0.15) / 0.25;
    p.bob = Math.sin(k * Math.PI) * r * 1.3;
    p.armF = -2.9;
    p.armB = 2.9;
    p.elbowF = p.elbowB = 0;
    p.kneeF = p.kneeB = 0.6 * Math.sin(k * Math.PI);
  } else if (u < 0.75) {
    const k = (u - 0.4) / 0.35;
    const def = MOVES[move];
    if (k < 0.3) def.wind(p, r);
    else def.strike(p, r, extension((k - 0.3) / 0.7));
  } else {
    const k = (u - 0.75) / 0.25;
    p.armF = -2.8;
    p.armB = 2.8;
    p.elbowF = p.elbowB = -0.3;
    p.bob = Math.abs(Math.sin(k * Math.PI * 2)) * r * 0.2;
    p.lean = -0.1;
  }
  return p;
}

/** Pick a line for a menu preview: their job's catchphrase or a generic one from `lines`. */
function menuLine(careerId: string, lines: string): string {
  const job = bundle.live[`job_${careerId.replace('career.', '')}`];
  const pool = lines === 'menu_hello' && job?.length && Math.random() < 0.4 ? job : (bundle.live[lines] ?? bundle.live.menu_hello ?? ['Hi!']);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function PuppetView({
  careerId,
  personality,
  appearance,
  size = 180,
  hype = 0,
  flip = false,
  talk = true,
  lines = 'menu_hello',
  voiceId = '',
  mood = 'neutral',
}: {
  careerId: string;
  personality: string;
  appearance: Appearance;
  size?: number;
  hype?: number;
  flip?: boolean;
  /** Say a line (bubble + babble) with the selection animation. */
  talk?: boolean;
  /** live.json template list to pick the line from. */
  lines?: string;
  /** Character id, for their personal voice pitch. */
  voiceId?: string;
  /** Resting face (painted face art). */
  mood?: Emotion;
}) {
  const [bubble, setBubble] = useState<{ text: string; key: number } | null>(null);
  const voice = voiceFor(careerId.replace('career.', ''), voiceId || careerId, personality);
  useEffect(() => {
    if (!talk || hype <= 0) return;
    // Yell on the jump, then say the line as the move lands.
    const yell = window.setTimeout(() => menuSfx.shout('yell', voice), 260);
    const say = window.setTimeout(() => {
      const text = menuLine(careerId, lines);
      setBubble({ text, key: Date.now() });
      menuSfx.speak(text, voice, true);
    }, 900);
    const hide = window.setTimeout(() => setBubble(null), 3200);
    return () => {
      window.clearTimeout(yell);
      window.clearTimeout(say);
      window.clearTimeout(hide);
    };
  }, [hype]);
  const host = useRef<HTMLDivElement>(null);
  // 0 = play the selection animation from the next rendered frame (so it isn't
  // lost while the sprites load); >0 = when it started; -1 = idle.
  const hypeAt = useRef(hype > 0 ? 0 : -1);
  const hypeCount = useRef(hype);
  if (hype !== hypeCount.current) {
    hypeCount.current = hype;
    hypeAt.current = 0;
  }
  const [loaded, setLoaded] = useState(() => hasPuppet(careerId));
  useEffect(() => {
    void loadPuppets().then(() => setLoaded(true));
  }, []);
  const art = hasPuppet(careerId);

  useEffect(() => {
    let alive = true;
    const app = new Application();
    let ready = false;
    void (async () => {
      await loadPuppets();
      if (!alive || !host.current || !hasPuppet(careerId)) return;
      const w = Math.round(size * 0.8);
      await app.init({ width: w, height: size, backgroundAlpha: 0, antialias: true, preference: 'webgl', resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
      if (!alive) {
        app.destroy(true);
        return;
      }
      ready = true;
      host.current.appendChild(app.canvas);
      const r = (size * 0.78) / PUPPET_HEIGHT;
      const pu = new Puppet(careerId, r);
      app.stage.addChild(pu.root);
      const style = idleStyle(careerId, personality);
      const moves = repertoire(careerId.replace('career.', ''), personality, false);
      const seed = careerId.length * 1.7 + personality.length;
      const f = flip ? -1 : 1;
      let last = performance.now();
      app.ticker.add(() => {
        const now = performance.now();
        const dt = now - last;
        last = now;
        const t = now / 1000;
        if (hypeAt.current === 0) hypeAt.current = now;
        const since = hypeAt.current < 0 ? Infinity : (now - hypeAt.current) / 1600;
        const p = since < 1 ? hypePose(since, r, moves[Math.floor(seed) % moves.length]!) : idlePose(style, t, r, seed);
        // Angry face on the signature move, their mood otherwise.
        pu.setEmotion(since >= 0.4 && since < 0.8 ? 'angry' : mood);
        pu.poseBlended(p, w / 2 - f * r * 0.2, size - r * 0.25, f, dt);
      });
    })();
    return () => {
      alive = false;
      if (ready) app.destroy(true, { children: true });
    };
  }, [careerId, personality, size, flip, loaded, mood]);

  if (!loaded) return <div class="puppet-view" style={{ width: `${Math.round(size * 0.8)}px`, height: `${size}px` }} />;
  const say = bubble && (
    <div class="menu-bubble" key={bubble.key}>
      {bubble.text}
    </div>
  );
  if (!art)
    return (
      <div class="puppet-wrap">
        <Portrait c={{ careers: [careerId], appearance }} size={Math.round(size * 0.6)} mood={mood} />
        {say}
      </div>
    );
  return (
    <div class="puppet-wrap">
      <div class="puppet-view" ref={host} style={{ width: `${Math.round(size * 0.8)}px`, height: `${size}px` }} />
      {say}
    </div>
  );
}
