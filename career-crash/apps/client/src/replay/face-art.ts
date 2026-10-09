import atlas from './faces/faces.json';

/**
 * Career faces in four emotions (tools/art-pipeline `faces` → faces/). No Pixi
 * here, so the UI (portraits) can use it too; puppet.ts loads the texture.
 */
export type Emotion = 'neutral' | 'angry' | 'surprised' | 'hurt';
/** Extra pain/shock heads (optional art, see tools/art-pipeline faces.ts). */
export type FaceVariant = 'hurt2' | 'hurt3' | 'hurt4' | 'surprised2' | 'surprised3';
/** Animation frames derived from the neutral face (not every career has both), plus the variants. */
export type FaceFrame = Emotion | FaceVariant | 'blink' | 'talk';

/** Every painted head for an emotion, the base one first. */
export const EMOTION_FRAMES: Record<Emotion, FaceFrame[]> = {
  neutral: ['neutral'],
  angry: ['angry'],
  surprised: ['surprised', 'surprised2', 'surprised3'],
  hurt: ['hurt', 'hurt2', 'hurt3', 'hurt4'],
};

export interface FaceRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The art is this much taller than the head itself (dizzy stars above it): scale by height ÷ k. */
  k?: number;
}

const FACES = (atlas as unknown as { w: number; h: number; faces: Record<string, FaceRect> }).faces;
const URLS = import.meta.glob('./faces/faces.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const FACE_ATLAS = { url: URLS['./faces/faces.webp'] ?? '', w: (atlas as { w: number }).w, h: (atlas as { h: number }).h };

export function faceRect(careerId: string, emotion: FaceFrame = 'neutral'): FaceRect | null {
  const rc = FACES[`${careerId}:${emotion}`];
  if (rc) return rc;
  // A head set still missing an emotion (art arriving in parts) shows its neutral face; variant frames stay optional.
  return emotion === 'angry' || emotion === 'surprised' || emotion === 'hurt' ? (FACES[`${careerId}:neutral`] ?? null) : null;
}

/** Height correction for a face frame (1 for most; >1 when the art has extras above the head). */
export function faceScale(careerId: string, frame: FaceFrame): number {
  return FACES[`${careerId}:${frame}`]?.k ?? 1;
}

export function hasFaces(careerId: string): boolean {
  return !!FACES[`${careerId}:neutral`];
}

/** Battle expressions → the four painted emotions. */
export function emotionFor(expr: string): Emotion {
  switch (expr) {
    case 'angry':
      return 'angry';
    case 'scared':
    case 'stunned':
      return 'surprised';
    case 'hurt':
    case 'ko':
      return 'hurt';
    default:
      return 'neutral';
  }
}
