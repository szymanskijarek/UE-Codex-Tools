/**
 * The Broken News desk (10 §3). Both anchors borrow an existing career's face
 * and puppet until their own art lands (art/news/); swap `career` for their
 * own puppet id then.
 */
import type { VoiceType } from '../replay/voices';
import type { Seat } from './episode';

export interface Anchor {
  seat: Seat;
  name: string;
  /** What the lower third calls them. */
  role: string;
  /** Stand-in career (face, brawl puppet). */
  career: string;
  voice: VoiceType;
  pitch: number;
  /** Strap colour. */
  color: string;
}

export const ANCHORS: Record<'us' | 'uk', Anchor> = {
  us: {
    seat: 'us',
    name: 'Brock Stetson Jr.',
    role: 'Senior Anchor (self-appointed)',
    career: 'career.tv-host',
    voice: 'deep',
    pitch: 0.9,
    color: '#c8102e',
  },
  uk: {
    seat: 'uk',
    name: 'Philippa Featherstonehaugh',
    role: 'Co-Anchor · pronounced "Fanshaw"',
    career: 'career.journalist',
    voice: 'bright',
    pitch: 1.05,
    color: '#1d3f8f',
  },
};
