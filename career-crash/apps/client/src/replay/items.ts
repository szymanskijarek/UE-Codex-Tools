import { Rectangle, Sprite, Texture } from 'pixi.js';

/**
 * Item art (tools/art-pipeline `items` → items/items.png + items.json): the
 * sprites for held equipment and for throwable/pickable props. Anything not
 * listed keeps its procedural drawing.
 */
interface Atlas {
  w: number;
  h: number;
  items: Record<string, { x: number; y: number; w: number; h: number }>;
}

const JSON_FILES = import.meta.glob('./items/items.json', { eager: true, import: 'default' }) as Record<string, Atlas>;
const PNG_FILES = import.meta.glob('./items/items.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const ATLAS = Object.values(JSON_FILES)[0] ?? null;
const URL_ = Object.values(PNG_FILES)[0] ?? null;

/** Held equipment → item sprite. */
const HELD: Record<string, string> = {
  'equipment.clipboard': 'binder',
  'equipment.frying-pan': 'frying-pan',
  'equipment.laptop': 'keyboard',
  'equipment.selfie-stick': 'ring-light',
  'equipment.wrench': 'wrench',
  'equipment.book': 'books',
  'equipment.briefcase': 'toolbox',
  'equipment.notepad': 'notepad',
  'equipment.plunger': 'plunger',
  'equipment.microphone': 'news-mic',
  'equipment.umbrella': 'umbrella',
  'equipment.megaphone': 'megaphone',
  'equipment.traffic-cone': 'traffic-cone',
  'equipment.fire-extinguisher-held': 'fire-extinguisher',
  'equipment.steering-lock': 'taxi-sign',
  'equipment.first-aid-kit': 'first-aid-kit',
  'equipment.pitchfork': 'pitchfork',
  'equipment.parcel-scanner': 'parcel',
  'equipment.dental-drill': 'dental-mirror',
  'equipment.portafilter': 'milk-jug',
  'equipment.scissors': 'hairspray',
  'equipment.rescue-tube-item': 'rescue-tube',
  'equipment.kettlebell': 'kettlebell',
  'equipment.trowel': 'watering-can',
  'equipment.headphones': 'speaker',
  'equipment.torch': 'desk-lamp',
};

/** Sim props → item sprite (world objects that can be picked up / thrown / pushed). */
const PROPS: Record<string, string> = {
  'prop.cardboard-box': 'parcel',
  'prop.watermelon': 'melon',
  'prop.mop-bucket': 'mop-bucket',
  'prop.fire-extinguisher': 'fire-extinguisher',
  'prop.gas-canister': 'oxygen-tank',
  'prop.office-chair': 'office-chair',
  'prop.power-strip': 'cable-reel',
  'prop.paper-stack': 'paper-ream',
  'prop.scrap-metal': 'brick',
  'prop.ketchup': 'ketchup',
  'prop.coffee-pot': 'coffee-pot',
  'prop.diner-tray': 'diner-tray',
  'prop.diner-stool': 'diner-stool',
  'prop.suitcase': 'suitcase',
  'prop.umbrella': 'umbrella',
  'prop.luggage-trolley': 'luggage-trolley',
  'prop.traffic-cone': 'traffic-cone',
  'prop.brick': 'brick',
  'prop.paint-bucket': 'paint-bucket',
  'prop.hard-hat': 'hard-hat',
  'prop.toolbox': 'toolbox',
  'prop.crate': 'crate',
  'prop.cable-spool': 'cable-spool',
  'prop.road-barrier': 'road-barrier',
  'prop.tin-cans': 'tin-cans',
  'prop.shopping-basket': 'shopping-basket',
  'prop.soda-crate': 'soda-crate',
  'prop.desk-lamp': 'desk-lamp',
  'prop.waste-bin': 'waste-bin',
  'prop.binder': 'binder',
  'prop.keyboard': 'keyboard',
  'prop.hay-bale': 'hay-bale',
  'prop.speaker': 'speaker',
};

let base: Texture | null = null;
const cache = new Map<string, Texture>();

export async function loadItems(): Promise<void> {
  if (base || !ATLAS || !URL_) return;
  const img = new Image();
  img.src = URL_;
  try {
    await img.decode();
    base = Texture.from(img);
  } catch {
    base = null;
  }
}

function tex(name: string | undefined): Texture | null {
  if (!name || !base || !ATLAS) return null;
  const r = ATLAS.items[name];
  if (!r) return null;
  let t = cache.get(name);
  if (!t) {
    t = new Texture({ source: base.source, frame: new Rectangle(r.x, r.y, r.w, r.h) });
    cache.set(name, t);
  }
  return t;
}

/** Sprite for a held item, sized to `len` px along its long side, anchored at the grip. */
export function heldSprite(equipmentId: string, len: number): Sprite | null {
  const t = tex(HELD[equipmentId]);
  if (!t) return null;
  const s = new Sprite(t);
  const k = len / Math.max(t.width, t.height);
  s.scale.set(k);
  s.anchor.set(0.5, 0.15);
  return s;
}

/** Sprite for a world prop, standing on its footprint, `size` px across. */
export function propSprite(propId: string, size: number): Sprite | null {
  const t = tex(PROPS[propId]);
  if (!t) return null;
  const s = new Sprite(t);
  const k = size / Math.max(t.width, t.height);
  s.scale.set(k);
  s.anchor.set(0.5, 0.92);
  return s;
}
