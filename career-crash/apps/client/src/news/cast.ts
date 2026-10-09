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
}

export const FIELD: Record<'chase' | 'rupert', Reporter> = {
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
};
