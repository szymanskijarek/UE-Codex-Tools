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

const JSON_FILES = import.meta.glob('./{items,obstacles}/*.json', { eager: true, import: 'default' }) as Record<string, Atlas>;
const PNG_FILES = import.meta.glob('./{items,obstacles}/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

interface Sheet {
  atlas: Atlas | null;
  url: string | null;
  base: Texture | null;
  cache: Map<string, Texture>;
}
const sheet = (kind: string): Sheet => ({ atlas: JSON_FILES[`./${kind}/${kind}.json`] ?? null, url: PNG_FILES[`./${kind}/${kind}.png`] ?? null, base: null, cache: new Map() });
const ITEMS = sheet('items');
const OBSTACLES = sheet('obstacles');

/**
 * Two-handed heavy weapons → item sprite names. Add art with these names to the
 * items atlas (tools/art-pipeline `items`) and it replaces the drawn placeholder.
 */
export const HEAVY_ART: Record<string, string> = {
  'prop.frozen-salmon': 'frozen-salmon',
  'prop.sale-sign': 'sale-sign',
  'prop.coat-stand': 'coat-stand',
  'prop.novelty-cheque': 'novelty-cheque',
  'prop.platform-bench': 'platform-bench',
  'prop.platform-sign': 'platform-sign',
  'prop.beer-keg': 'beer-keg',
  'prop.pepper-grinder': 'pepper-grinder',
  'prop.sledgehammer': 'sledgehammer',
  'prop.road-sign': 'road-sign',
  'prop.wooden-pallet': 'wooden-pallet',
  'prop.rolled-carpet': 'rolled-carpet',
};

/** Heavy weapon sprite in hand (grip at the top of the image), `len` px long; null until the art exists. */
export function heavySprite(propId: string, len: number): Sprite | null {
  const t = tex(HEAVY_ART[propId]);
  if (!t) return null;
  const s = new Sprite(t);
  s.scale.set(len / Math.max(t.width, t.height));
  s.anchor.set(0.5, 0.08);
  return s;
}

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

async function load(sh: Sheet): Promise<void> {
  if (sh.base || !sh.atlas || !sh.url) return;
  const img = new Image();
  img.src = sh.url;
  try {
    await img.decode();
    sh.base = Texture.from(img);
  } catch {
    sh.base = null;
  }
}

export async function loadItems(): Promise<void> {
  await Promise.all([load(ITEMS), load(OBSTACLES)]);
}

function tex(name: string | undefined, sh: Sheet = ITEMS): Texture | null {
  if (!name || !sh.base || !sh.atlas) return null;
  const r = sh.atlas.items[name];
  if (!r) return null;
  let t = sh.cache.get(name);
  if (!t) {
    t = new Texture({ source: sh.base.source, frame: new Rectangle(r.x, r.y, r.w, r.h) });
    sh.cache.set(name, t);
  }
  return t;
}

/** Big props drawn from the obstacle atlas; `left` = the art faces left (mirrored so it faces right like other props). */
const BIG_PROPS: Record<string, { name: string; size: number; left?: boolean }> = {
  'prop.forklift': { name: 'forklift', size: 3.4, left: true },
  'prop.floor-scrubber': { name: 'floor-scrubber', size: 3.0, left: true },
  'prop.freezer': { name: 'chest-freezer', size: 3.2 },
  'prop.vending-machine': { name: 'drinks-fridge', size: 3.4 },
  'prop.printer': { name: 'photocopier', size: 3.0 },
  'prop.filing-cabinet': { name: 'filing-cabinets', size: 3.0 },
};

/** Obstacle art by atlas name, `width` px across, standing on its front edge. */
export function wallSprite(art: string, width: number): Sprite | null {
  const t = tex(art, OBSTACLES);
  if (!t) return null;
  const s = new Sprite(t);
  s.scale.set(width / t.width);
  s.anchor.set(0.5, 0.94);
  return s;
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
  const big = BIG_PROPS[propId];
  const bt = big && tex(big.name, OBSTACLES);
  if (big && bt) {
    const s = new Sprite(bt);
    const k = (size / 2.6) * big.size / Math.max(bt.width, bt.height);
    s.scale.set(big.left ? -k : k, k);
    s.anchor.set(0.5, 0.92);
    return s;
  }
  const t = tex(PROPS[propId]);
  if (!t) return null;
  const s = new Sprite(t);
  const k = size / Math.max(t.width, t.height);
  s.scale.set(k);
  s.anchor.set(0.5, 0.92);
  return s;
}
