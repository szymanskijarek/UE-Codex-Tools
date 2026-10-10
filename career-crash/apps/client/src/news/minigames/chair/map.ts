/**
 * The BSN building, top down (Spinning With Intent). World units: the view
 * shows about 1000 × 560 of a 2400 × 1600 floor. The route is a U: out of
 * the props store, east through the newsroom, north into the green room,
 * west into Studio 1, and into Brock at the anchor desk.
 *
 * Everything solid is an axis-aligned rectangle. `walls` are the building;
 * `props` are furniture (same physics, drawn as sprites once art brief 14
 * lands, labelled boxes until then).
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Prop extends Rect {
  /** Sprite name (`art/<kind>.webp`, brief 14); also its label in the block-out. */
  kind: PropKind;
}
export type PropKind = 'news-desk' | 'sofa' | 'plant' | 'water-cooler' | 'camera' | 'light' | 'anchor-desk' | 'coffee-cart' | 'cable-reel' | 'shelves';

export interface Room extends Rect {
  name: string;
  floor: 'concrete' | 'carpet' | 'lounge' | 'studio';
}

export const WORLD = { w: 2400, h: 1600 } as const;
const T = 40; // wall thickness

export const ROOMS: Room[] = [
  { name: 'PROPS STORE', floor: 'concrete', x: 0, y: 800, w: 700, h: 800 },
  { name: 'NEWSROOM', floor: 'carpet', x: 700, y: 800, w: 1700, h: 800 },
  { name: 'GREEN ROOM', floor: 'lounge', x: 1500, y: 0, w: 900, h: 800 },
  { name: 'STUDIO 1', floor: 'studio', x: 0, y: 0, w: 1500, h: 800 },
];

/** Walls, with doorways left as gaps. */
export const WALLS: Rect[] = [
  // The outside.
  { x: 0, y: 0, w: WORLD.w, h: T },
  { x: 0, y: WORLD.h - T, w: WORLD.w, h: T },
  { x: 0, y: 0, w: T, h: WORLD.h },
  { x: WORLD.w - T, y: 0, w: T, h: WORLD.h },
  // Props store | newsroom, door at y 1260–1460.
  { x: 700 - T / 2, y: 800, w: T, h: 460 },
  { x: 700 - T / 2, y: 1460, w: T, h: 140 },
  // Ground floor | top: door into the green room at x 1940–2160.
  { x: 0, y: 800 - T / 2, w: 1940, h: T },
  { x: 2160, y: 800 - T / 2, w: 240, h: T },
  // Studio | green room, door at y 300–520.
  { x: 1500 - T / 2, y: 0, w: T, h: 300 },
  { x: 1500 - T / 2, y: 520, w: T, h: 280 },
];

export const PROPS: Prop[] = [
  // Props store: shelving the chair has to get round.
  { kind: 'shelves', x: 120, y: 1040, w: 300, h: 70 },
  { kind: 'shelves', x: 300, y: 1260, w: 300, h: 70 },
  { kind: 'cable-reel', x: 520, y: 1480, w: 80, h: 80 },
  // Newsroom: rows of desks.
  { kind: 'news-desk', x: 860, y: 960, w: 220, h: 110 },
  { kind: 'news-desk', x: 860, y: 1320, w: 220, h: 110 },
  { kind: 'news-desk', x: 1240, y: 1140, w: 220, h: 110 },
  { kind: 'news-desk', x: 1600, y: 960, w: 220, h: 110 },
  { kind: 'news-desk', x: 1600, y: 1320, w: 220, h: 110 },
  { kind: 'water-cooler', x: 2240, y: 1460, w: 60, h: 60 },
  { kind: 'coffee-cart', x: 1980, y: 1180, w: 140, h: 80 },
  // Green room.
  { kind: 'sofa', x: 1900, y: 380, w: 240, h: 100 },
  { kind: 'plant', x: 2260, y: 80, w: 70, h: 70 },
  { kind: 'plant', x: 1560, y: 680, w: 70, h: 70 },
  { kind: 'coffee-cart', x: 1620, y: 120, w: 140, h: 80 },
  // Studio 1: cameras and lights between the door and the desk.
  { kind: 'camera', x: 1120, y: 200, w: 110, h: 110 },
  { kind: 'camera', x: 1120, y: 520, w: 110, h: 110 },
  { kind: 'light', x: 820, y: 360, w: 70, h: 70 },
  { kind: 'light', x: 760, y: 90, w: 70, h: 70 },
  { kind: 'light', x: 760, y: 640, w: 70, h: 70 },
  { kind: 'cable-reel', x: 960, y: 420, w: 80, h: 80 },
  // The anchor desk: Brock sits on its open (east) side, facing the cameras.
  { kind: 'anchor-desk', x: 160, y: 250, w: 160, h: 300 },
];

/** Where the chair starts (props store, facing the door), and where Brock sits. */
export const START = { x: 200, y: 1460, angle: 0 };
export const BROCK = { x: 400, y: 400, r: 46 };
