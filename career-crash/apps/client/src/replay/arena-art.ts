/**
 * Painted arena backdrops (art/arenas → replay/arenas/*.webp). Each painting
 * has an open floor seen in perspective; `floor` is that trapezoid in image
 * fractions — the top edge at `top` with half-width `topHalf`, the bottom edge
 * at `bottom` with half-width `bottomHalf`, both centred horizontally. The
 * renderer maps the arena rectangle onto it, so fighters walk on the painted
 * tiles and shrink a little towards the back.
 */
export interface ArenaArt {
  url: string;
  w: number;
  h: number;
  floor: { top: number; topHalf: number; bottom: number; bottomHalf: number };
}

const URLS = import.meta.glob('./arenas/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const DEFS: Record<string, Omit<ArenaArt, 'url'> & { file: string }> = {
  'arena.supermarket': { file: 'supermarket', w: 1672, h: 941, floor: { top: 0.21, topHalf: 0.33, bottom: 0.8, bottomHalf: 0.5 } },
  'arena.office': { file: 'office', w: 1774, h: 887, floor: { top: 0.24, topHalf: 0.34, bottom: 0.8, bottomHalf: 0.47 } },
  'arena.station': { file: 'station', w: 1672, h: 941, floor: { top: 0.29, topHalf: 0.36, bottom: 0.78, bottomHalf: 0.38 } },
  'arena.diner': { file: 'diner', w: 1774, h: 887, floor: { top: 0.27, topHalf: 0.31, bottom: 0.92, bottomHalf: 0.34 } },
  'arena.construction': { file: 'construction', w: 1672, h: 941, floor: { top: 0.43, topHalf: 0.31, bottom: 0.76, bottomHalf: 0.37 } },
  'arena.warehouse': { file: 'warehouse', w: 1774, h: 887, floor: { top: 0.34, topHalf: 0.35, bottom: 0.82, bottomHalf: 0.37 } },
  'arena.docks': { file: 'docks', w: 1672, h: 941, floor: { top: 0.3, topHalf: 0.4, bottom: 0.77, bottomHalf: 0.46 } },
  'arena.theatre': { file: 'theatre', w: 1672, h: 940, floor: { top: 0.28, topHalf: 0.33, bottom: 0.84, bottomHalf: 0.45 } },
  'arena.hotel': { file: 'hotel', w: 1672, h: 940, floor: { top: 0.27, topHalf: 0.4, bottom: 0.8, bottomHalf: 0.4 } },
  'arena.hospital': { file: 'hospital', w: 1672, h: 941, floor: { top: 0.28, topHalf: 0.36, bottom: 0.86, bottomHalf: 0.38 } },
  'arena.museum': { file: 'museum', w: 1672, h: 940, floor: { top: 0.27, topHalf: 0.38, bottom: 0.82, bottomHalf: 0.4 } },
  'arena.airport': { file: 'airport', w: 1672, h: 941, floor: { top: 0.33, topHalf: 0.36, bottom: 0.84, bottomHalf: 0.4 } },
  // The Summit Hall (09) borrows the office until its own painting arrives (art/incident/01-summit-hall.md).
  'arena.summit-hall': { file: 'office', w: 1774, h: 887, floor: { top: 0.24, topHalf: 0.34, bottom: 0.8, bottomHalf: 0.47 } },
  'arena.trading-floor': { file: 'trading-floor', w: 1774, h: 887, floor: { top: 0.34, topHalf: 0.32, bottom: 0.84, bottomHalf: 0.42 } },
};

export function arenaArt(arenaId: string): ArenaArt | null {
  const d = DEFS[arenaId];
  const url = d && URLS[`./arenas/${d.file}.webp`];
  return d && url ? { url, w: d.w, h: d.h, floor: d.floor } : null;
}
