import type { Pose } from './puppet';

/**
 * Cosmetic melee move set for sprite puppets. The simulation only says "an
 * attack happened"; the renderer picks how it looks. Each character has a
 * small repertoire (job + personality + whether they hold something), the
 * move is chosen when the wind-up starts so the wind-up telegraphs it, and
 * the victim's flinch matches the blow (uppercut snaps the head back, low
 * kick makes them hop, a body blow folds them).
 *
 * Arm/leg angles: 0 = hanging down, −π/2 = pointing forward, −π = straight
 * up, +π/2 = behind. `lean` > 0 tilts towards the facing direction.
 */
export type Move =
  | 'straight'
  | 'hook'
  | 'uppercut'
  | 'elbow'
  | 'headbutt'
  | 'shoulder'
  | 'lowKick'
  | 'frontKick'
  | 'backKick'
  | 'sweep'
  | 'overhead'
  | 'swing'
  | 'jab';

export type HitStyle = 'head' | 'gut' | 'legs' | 'side';

interface MoveDef {
  /** Strike duration (ms). */
  ms: number;
  hit: HitStyle;
  /** Body turned away from the target during the strike (spinning back kick). */
  turn?: boolean;
  wind: (p: Pose, r: number) => void;
  strike: (p: Pose, r: number, ext: number) => void;
}

const guard = (p: Pose) => {
  p.armB = -1.0;
  p.elbowB = -1.9;
};

export const MOVES: Record<Move, MoveDef> = {
  straight: {
    ms: 230,
    hit: 'head',
    wind: (p) => {
      guard(p);
      p.armF = -0.9;
      p.elbowF = -1.9;
      p.lean = -0.08;
    },
    strike: (p, r, x) => {
      guard(p);
      p.armF = -0.9 - 0.67 * x;
      p.elbowF = -1.9 * (1 - x);
      p.lean = 0.22 * x;
      p.offX = r * 0.55 * x;
      p.legB = 0.45 * x;
    },
  },
  hook: {
    ms: 260,
    hit: 'side',
    wind: (p) => {
      guard(p);
      p.armF = 0.5;
      p.elbowF = -1.6;
      p.lean = -0.15;
    },
    strike: (p, r, x) => {
      guard(p);
      p.armF = 0.5 - 2.0 * x;
      p.elbowF = -1.6 + 0.3 * x;
      p.lean = 0.3 * x;
      p.offX = r * 0.4 * x;
      p.headRot = 0.15 * x;
    },
  },
  uppercut: {
    ms: 280,
    hit: 'head',
    wind: (p, r) => {
      guard(p);
      p.armF = 0.35;
      p.elbowF = -2.1;
      p.bob = -r * 0.25;
      p.legF = -0.35;
      p.kneeF = 0.7;
      p.legB = 0.3;
      p.kneeB = 0.6;
      p.lean = 0.15;
    },
    strike: (p, r, x) => {
      guard(p);
      p.armF = 0.35 - 3.0 * x;
      p.elbowF = -2.1 + 1.3 * x;
      p.bob = -r * 0.25 + r * 0.55 * x;
      p.lean = 0.15 - 0.3 * x;
      p.offX = r * 0.3 * x;
    },
  },
  elbow: {
    ms: 220,
    hit: 'head',
    wind: (p) => {
      guard(p);
      p.armF = 0.4;
      p.elbowF = -2.5;
      p.lean = -0.1;
    },
    strike: (p, r, x) => {
      guard(p);
      p.armF = 0.4 - 1.1 * x;
      p.elbowF = -2.5;
      p.lean = 0.3 * x;
      p.offX = r * 0.45 * x;
    },
  },
  headbutt: {
    ms: 260,
    hit: 'head',
    wind: (p) => {
      p.lean = -0.35;
      p.armF = 0.5;
      p.armB = 0.5;
    },
    strike: (p, r, x) => {
      p.lean = -0.35 + 0.95 * x;
      p.armF = 0.5 + 0.4 * x;
      p.armB = 0.5 + 0.4 * x;
      p.offX = r * 0.6 * x;
      p.headRot = 0.25 * x;
      p.legB = 0.5 * x;
    },
  },
  shoulder: {
    ms: 300,
    hit: 'gut',
    wind: (p, r) => {
      p.lean = 0.2;
      p.bob = -r * 0.15;
      p.kneeF = 0.5;
      p.kneeB = 0.5;
      p.armF = 0.4;
      p.armB = -0.3;
    },
    strike: (p, r, x) => {
      p.lean = 0.2 + 0.35 * x;
      p.offX = r * 0.9 * x;
      p.armF = 0.4;
      p.armB = -0.3;
      p.legB = 0.6 * x;
    },
  },
  lowKick: {
    ms: 260,
    hit: 'legs',
    wind: (p) => {
      guard(p);
      p.armF = -0.8;
      p.elbowF = -1.9;
      p.legF = 0.5;
      p.kneeF = 0.9;
      p.lean = -0.1;
    },
    strike: (p, r, x) => {
      guard(p);
      p.armF = -0.8;
      p.elbowF = -1.9;
      p.legF = 0.5 - 1.5 * x;
      p.kneeF = 0.9 * (1 - x);
      p.lean = -0.25 * x;
      p.offX = r * 0.25 * x;
    },
  },
  frontKick: {
    ms: 320,
    hit: 'gut',
    wind: (p) => {
      guard(p);
      p.armF = -0.9;
      p.elbowF = -1.8;
      p.legF = -1.3;
      p.kneeF = 1.8;
      p.lean = -0.2;
    },
    strike: (p, r, x) => {
      guard(p);
      p.armF = -0.9;
      p.elbowF = -1.8;
      p.legF = -1.3 - 0.3 * x;
      p.kneeF = 1.8 * (1 - x);
      p.lean = -0.2 - 0.25 * x;
      p.offX = r * 0.2 * x;
    },
  },
  backKick: {
    ms: 360,
    hit: 'gut',
    turn: true,
    wind: (p) => {
      // Already turned away from the target, knee chambered.
      p.lean = 0.25;
      p.legF = 0.8;
      p.kneeF = -1.6;
      p.armF = -0.7;
      p.armB = -0.5;
      p.headRot = -0.3;
    },
    strike: (p, r, x) => {
      p.lean = 0.25 + 0.35 * x;
      p.legF = 0.8 + 0.9 * x;
      p.kneeF = -1.6 * (1 - x);
      p.armF = -0.7 - 0.5 * x;
      p.armB = -0.5;
      p.headRot = -0.3;
      p.offX = -r * 0.25 * x;
    },
  },
  sweep: {
    ms: 340,
    hit: 'legs',
    wind: (p, r) => {
      p.bob = -r * 0.55;
      p.legF = -0.6;
      p.kneeF = 1.2;
      p.legB = 0.6;
      p.kneeB = 1.4;
      p.lean = 0.35;
      p.armB = -0.6;
    },
    strike: (p, r, x) => {
      p.bob = -r * 0.55;
      p.legF = -0.6 - 0.9 * x;
      p.kneeF = 1.2 * (1 - x);
      p.legB = 0.6;
      p.kneeB = 1.4;
      p.lean = 0.35;
      p.armB = -0.6;
      p.armF = 0.4 * x;
      p.offX = r * 0.2 * x;
    },
  },
  overhead: {
    ms: 300,
    hit: 'head',
    wind: (p) => {
      p.armF = -3.0;
      p.elbowF = -0.7;
      p.armB = -2.6;
      p.elbowB = -0.6;
      p.lean = -0.18;
    },
    strike: (p, r, x) => {
      p.armF = -3.0 + 2.2 * x;
      p.elbowF = -0.7 * (1 - x);
      p.armB = -2.6 + 2.0 * x;
      p.lean = -0.18 + 0.5 * x;
      p.offX = r * 0.45 * x;
    },
  },
  swing: {
    ms: 280,
    hit: 'side',
    wind: (p) => {
      p.armF = 1.4;
      p.elbowF = -0.3;
      p.lean = -0.15;
      p.headRot = -0.1;
    },
    strike: (p, r, x) => {
      p.armF = 1.4 - 3.1 * x;
      p.elbowF = -0.3;
      p.lean = -0.15 + 0.35 * x;
      p.offX = r * 0.35 * x;
    },
  },
  jab: {
    ms: 200,
    hit: 'gut',
    wind: (p) => {
      p.armF = -0.6;
      p.elbowF = -1.5;
      p.lean = -0.05;
    },
    strike: (p, r, x) => {
      p.armF = -0.6 - 0.95 * x;
      p.elbowF = -1.5 * (1 - x);
      p.lean = 0.25 * x;
      p.offX = r * 0.6 * x;
      p.legB = 0.4 * x;
    },
  },
};

const UNARMED: Move[] = ['straight', 'hook', 'uppercut', 'lowKick', 'frontKick'];

/** Signature moves by career (mixed into the generic set). */
const BY_CAREER: Record<string, Move[]> = {
  'personal-trainer': ['uppercut', 'frontKick', 'backKick', 'straight'],
  'police-officer': ['straight', 'lowKick', 'elbow'],
  'security-guard': ['shoulder', 'straight', 'headbutt'],
  firefighter: ['shoulder', 'hook', 'headbutt'],
  builder: ['headbutt', 'hook', 'shoulder'],
  lifeguard: ['frontKick', 'backKick', 'straight'],
  dj: ['backKick', 'elbow', 'sweep'],
  farmer: ['hook', 'headbutt', 'lowKick'],
  mechanic: ['hook', 'uppercut', 'lowKick'],
  'taxi-driver': ['elbow', 'hook', 'headbutt'],
  'delivery-driver': ['shoulder', 'frontKick', 'straight'],
  chef: ['hook', 'elbow', 'shoulder'],
  mime: ['straight', 'backKick', 'sweep'],
  astronaut: ['frontKick', 'backKick', 'uppercut'],
  influencer: ['lowKick', 'backKick', 'straight'],
  hairdresser: ['lowKick', 'elbow', 'straight'],
  teacher: ['straight', 'lowKick', 'elbow'],
  librarian: ['lowKick', 'straight', 'sweep'],
  lawyer: ['straight', 'elbow', 'lowKick'],
  accountant: ['straight', 'lowKick', 'hook'],
  programmer: ['straight', 'lowKick', 'elbow'],
  politician: ['elbow', 'hook', 'lowKick'],
  'conspiracy-podcaster': ['sweep', 'headbutt', 'hook'],
  gardener: ['frontKick', 'hook', 'lowKick'],
  janitor: ['sweep', 'lowKick', 'hook'],
};

const BY_PERSONALITY: Record<string, Move[]> = {
  'personality.aggressive': ['headbutt', 'uppercut', 'shoulder'],
  'personality.chaotic': ['backKick', 'sweep', 'headbutt'],
  'personality.coward': ['lowKick', 'jab'],
  'personality.confident': ['backKick', 'uppercut'],
  'personality.competitive': ['uppercut', 'frontKick'],
  'personality.clumsy': ['sweep', 'headbutt'],
};

/** A character's repertoire: career signatures + personality flavour + generics. */
export function repertoire(career: string, personality: string, armed: boolean): Move[] {
  if (armed) return ['overhead', 'swing', 'jab', 'overhead', 'swing', ...(BY_PERSONALITY[personality]?.includes('backKick') ? (['backKick'] as Move[]) : [])];
  const sig = BY_CAREER[career] ?? [];
  // Signature moves count double so a character's style is recognisable.
  return [...sig, ...sig, ...(BY_PERSONALITY[personality] ?? []), ...UNARMED];
}

/** 0 → 1 → 0 over the strike: fast snap out (35% of the time), slower retract. */
export function extension(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 0;
  return u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65;
}

/** Victim flinch poses keyed by where the blow landed; k fades 1 → 0. */
export function hitPose(p: Pose, style: HitStyle, r: number, k: number, away: number): void {
  switch (style) {
    case 'head':
      p.lean = -0.45 * k * away;
      p.headRot = -0.5 * k;
      p.armF = -2.2 * k;
      p.armB = 1.6 * k;
      p.offX = -r * 0.35 * k * away;
      break;
    case 'gut':
      p.lean = 0.5 * k;
      p.headRot = 0.3 * k;
      p.armF = -0.6 * k;
      p.elbowF = -1.4 * k;
      p.armB = -0.6 * k;
      p.elbowB = -1.4 * k;
      p.kneeF = 0.5 * k;
      p.kneeB = 0.5 * k;
      p.bob = -r * 0.2 * k;
      p.offX = -r * 0.45 * k * away;
      break;
    case 'legs':
      // Hopping on one leg, arms windmilling.
      p.legF = -0.6 * k;
      p.kneeF = 1.4 * k;
      p.bob = r * 0.2 * Math.abs(Math.sin(k * 12)) * k;
      p.armF = -2.4 * k;
      p.armB = 2.4 * k;
      p.lean = -0.2 * k * away;
      break;
    default:
      p.lean = -0.3 * k * away;
      p.headRot = 0.45 * k;
      p.armF = -1.4 * k - 0.1;
      p.armB = 1.4 * k + 0.1;
      p.offX = -r * 0.3 * k * away;
  }
}
