/**
 * The Broken News desk (10 §3). Each anchor fights with an existing career's
 * moves (`career`) and wears their own painted body in the brawl (`persona`,
 * art brief 02) and their own pictures at the desk (`art`, brief 01).
 */
import type { VoiceType } from '../replay/voices';
import type { Seat } from './episode';

export interface Anchor {
  seat: Seat;
  name: string;
  /** What the lower third calls them. */
  role: string;
  /** The career they fight with (moves, stats); its face stands in for any art they lack. */
  career: string;
  /** Their own brawl puppet (`art/sheets/npc-news-<x>.png`), render only. */
  persona: string;
  voice: VoiceType;
  pitch: number;
  /** Strap colour. */
  color: string;
  /** What they insist BSN stands for (10 §3.4). */
  bsn: string;
  /** Their painted desk-shot pictures, `art/desk-<art>-<face>.webp` (art brief 01 C). */
  art: string;
}

export const ANCHORS: Record<'us' | 'uk', Anchor> = {
  us: {
    seat: 'us',
    name: 'Brock Stetson Jr.',
    role: 'Senior Anchor (self-appointed)',
    career: 'career.tv-host',
    persona: 'npc.news-brock',
    voice: 'deep',
    pitch: 0.9,
    color: '#c8102e',
    bsn: 'Brock Stetson Network',
    art: 'brock',
  },
  uk: {
    seat: 'uk',
    name: 'Philippa Featherstonehaugh',
    role: 'Co-Anchor · pronounced "Fanshaw"',
    career: 'career.journalist',
    persona: 'npc.news-philippa',
    voice: 'bright',
    pitch: 1.05,
    color: '#1d3f8f',
    bsn: 'British Standards Network',
    art: 'philippa',
  },
};

/** A reporter in the field (10 §13): painted close-ups (brief 06), their own fight body and heads (`persona`). */
export interface Reporter {
  seat: 'field';
  name: string;
  role: string;
  career: string;
  persona?: string;
  voice: VoiceType;
  pitch: number;
  color: string;
  bsn: string;
  /** Their painted pictures, `art/field-<art>-<face>.webp` (brief 06), once they exist. */
  art: string;
  /** How tall they stand in the shot (1 = everyone else). Hamish is short, so the props loom (cast bible 11 §4). */
  height?: number;
}

export const FIELD: Record<'chase' | 'rupert' | 'hamish' | 'bev', Reporter> = {
  chase: {
    seat: 'field',
    name: 'Chase Hurley',
    role: 'Field Reporter · in the eye of the storm',
    career: 'career.firefighter',
    persona: 'npc.news-chase',
    voice: 'mid',
    pitch: 1,
    color: '#ea580c',
    bsn: 'Batten Shutters Now',
    art: 'chase',
  },
  rupert: {
    seat: 'field',
    name: 'Rupert Fennimore-Twistleton',
    role: 'Foreign Correspondent · somewhere',
    career: 'career.archaeologist',
    persona: 'npc.news-rupert',
    voice: 'gravel',
    pitch: 0.95,
    color: '#7c6a3c',
    bsn: 'Behind Shellfire, Nominally',
    art: 'rupert',
  },
  // Cast bible 11 §4: always a line behind, already in tomorrow, and short.
  hamish: {
    seat: 'field',
    name: 'Hamish Tuck',
    role: 'Asia-Pacific Bureau (the bureau is him)',
    career: 'career.sailor',
    voice: 'mid',
    pitch: 1.12,
    color: '#0f766e',
    bsn: 'Blown Sideways Nightly',
    art: 'hamish',
    height: 0.72,
  },
  // Cast bible 11 §4: live from the launch party, glass in hand.
  bev: {
    seat: 'field',
    name: 'Bev Fizzwilliam',
    role: 'Entertainment & Lifestyle · live from the launch',
    career: 'career.fashion-designer',
    voice: 'bright',
    pitch: 0.92,
    color: '#be185d',
    bsn: 'Bubbles, Sequins, Nibbles',
    art: 'bev',
  },
};

/**
 * Jeff, the studio technician (cast bible 11 §3): never on screen, not even a
 * hand. He speaks from off (a bubble from the top, no lower third) and drops
 * things on Brock (`drop` on a line).
 */
export const JEFF = {
  seat: 'jeff' as const,
  name: 'Jeff',
  role: 'Studio Technician (off)',
  career: 'career.electrician',
  voice: 'gravel' as VoiceType,
  pitch: 0.85,
  color: '#475569',
};
