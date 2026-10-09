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
