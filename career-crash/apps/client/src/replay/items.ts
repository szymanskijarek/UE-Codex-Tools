import { Rectangle, Sprite, Texture } from 'pixi.js';

/**
 * Item art (tools/art-pipeline `items` → items/items.webp + items.json): the
 * sprites for held equipment and for throwable/pickable props. Anything not
 * listed keeps its procedural drawing.
 */
interface Atlas {
  w: number;
  h: number;
  items: Record<string, { x: number; y: number; w: number; h: number }>;
}

const JSON_FILES = import.meta.glob('./{items,obstacles}/*.json', { eager: true, import: 'default' }) as Record<string, Atlas>;
const SHEET_FILES = import.meta.glob('./{items,obstacles}/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

interface Sheet {
  atlas: Atlas | null;
  url: string | null;
  base: Texture | null;
  cache: Map<string, Texture>;
}
const sheet = (kind: string): Sheet => ({ atlas: JSON_FILES[`./${kind}/${kind}.json`] ?? null, url: SHEET_FILES[`./${kind}/${kind}.webp`] ?? null, base: null, cache: new Map() });
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

/**
 * Where heavy weapons are held on their (diagonal) art: grip point and the far
 * end of the business end, as fractions of the image. The sprite is anchored
 * on the grip and turned so grip → head points across the fists (+x).
 */
const HEAVY_GRIP: Record<string, [number, number, number, number]> = {
  'beer-keg': [0.55, 0.12, 0.4, 0.9],
  'coat-stand': [0.2, 0.8, 0.7, 0.12],
  'frozen-salmon': [0.65, 0.72, 0.2, 0.12],
  'novelty-cheque': [0.12, 0.93, 0.6, 0.3],
  'pepper-grinder': [0.6, 0.15, 0.4, 0.85],
  'platform-bench': [0.2, 0.2, 0.8, 0.8],
  'platform-sign': [0.35, 0.93, 0.62, 0.2],
  'road-sign': [0.1, 0.93, 0.72, 0.2],
  'rolled-carpet': [0.72, 0.1, 0.3, 0.88],
  'sale-sign': [0.2, 0.92, 0.6, 0.3],
  sledgehammer: [0.1, 0.94, 0.78, 0.13],
  'wooden-pallet': [0.2, 0.2, 0.8, 0.8],
};

/** Heavy weapon sprite in hand, `len` px along its longest side; null until the art exists. */
export function heavySprite(propId: string, len: number): Sprite | null {
  const name = HEAVY_ART[propId];
  const t = tex(name);
  if (!t) return null;
  const s = new Sprite(t);
  s.scale.set(len / Math.max(t.width, t.height));
  const [gu, gv, hu, hv] = HEAVY_GRIP[name!] ?? [0.5, 0.08, 0.5, 0.95];
  s.anchor.set(gu, gv);
  s.rotation = -Math.atan2((hv - gv) * t.height, (hu - gu) * t.width);
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
  'equipment.dig-trowel': 'tool-archaeologist',
  'equipment.rolling-pin': 'tool-baker',
  'equipment.smoker': 'tool-beekeeper',
  'equipment.ticket-punch': 'tool-bus-driver',
  'equipment.claw-hammer': 'tool-carpenter',
  'equipment.sweep-brush': 'tool-chimney-sweep',
  'equipment.clown-mallet': 'tool-clown',
  'equipment.slicker-brush': 'tool-dog-groomer',
  'equipment.shears': 'tool-fashion-designer',
  'equipment.serving-tray': 'tool-flight-attendant',
  'equipment.pruning-shears': 'tool-florist',
  'equipment.crystal-ball': 'tool-fortune-teller',
  'equipment.service-bell': 'tool-hotel-concierge',
  'equipment.ice-cream-scoop': 'tool-ice-cream-vendor',
  'equipment.magic-wand': 'tool-magician',
  'equipment.specimen-net': 'tool-marine-biologist',
  'equipment.magnifying-glass': 'tool-museum-curator',
  'equipment.medical-clipboard': 'tool-nurse',
  'equipment.paint-roller': 'tool-painter',
  'equipment.camera': 'tool-photographer',
  'equipment.mail-bag': 'tool-postal-worker',
  'equipment.belaying-pin': 'tool-sailor',
  'equipment.flask': 'tool-scientist',
  'equipment.iron': 'tool-tailor',
  'equipment.tattoo-gun': 'tool-tattoo-artist',
  'equipment.signal-paddle': 'tool-train-conductor',
  'equipment.vet-kit': 'tool-veterinarian',
  'equipment.welding-torch': 'tool-welder',
  'equipment.squeegee': 'tool-window-cleaner',
  'equipment.feed-bucket': 'tool-zookeeper',
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
  'prop.potted-plant': 'lobby-plant',
  // Hospital
  'prop.first-aid-case': 'first-aid-case',
  'prop.stethoscope': 'stethoscope',
  'prop.spray-bottle': 'spray-bottle',
  'prop.towel-stack': 'towel-stack',
  'prop.bedpan': 'bedpan',
  'prop.iv-bag': 'iv-bag',
  // Museum
  'prop.marble-bust': 'marble-bust',
  'prop.scroll': 'scroll',
  'prop.rope-barrier': 'rope-barrier',
  'prop.amphora': 'amphora',
  'prop.placard': 'placard',
  'prop.dust-brush': 'dust-brush',
  // Hotel
  'prop.desk-bell': 'desk-bell',
  'prop.table-lamp': 'table-lamp',
  'prop.key-rack': 'key-rack',
  'prop.ice-bucket': 'ice-bucket',
  // Airport
  'prop.carry-on': 'carry-on',
  'prop.neck-pillow': 'neck-pillow',
  'prop.security-tray': 'security-tray',
  'prop.duty-free-bag': 'duty-free-bag',
  'prop.passport': 'passport',
  // Docks
  'prop.rope-coil': 'rope-coil',
  'prop.life-ring': 'life-ring',
  'prop.buoy': 'buoy',
  'prop.fish-crate': 'fish-crate',
  'prop.tackle-box': 'tackle-box',
  'prop.grappling-hook': 'grappling-hook',
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
/**
 * How each held item sits in the fist: grip point (fraction of the image), the
 * direction from the grip to the business end in image space (degrees, 0 =
 * right, 90 = down), and the style: `tool` — gripped across the fist, head
 * sticking out perpendicular to the forearm (hammers, pans, plungers); `hang`
 * — carried by a handle, hanging along the forearm (cases, kits, bells).
 */
const GRIP: Record<string, [number, number, number, 'tool' | 'hang']> = {
  binder: [0.12, 0.5, 0, 'tool'],
  books: [0.15, 0.5, 0, 'tool'],
  'dental-mirror': [0.5, 0.9, -95, 'tool'],
  'desk-lamp': [0.5, 0.88, -100, 'tool'],
  'fire-extinguisher': [0.55, 0.1, 90, 'hang'],
  'first-aid-kit': [0.5, 0.06, 90, 'hang'],
  'frying-pan': [0.92, 0.12, 136, 'tool'],
  hairspray: [0.5, 0.65, -90, 'tool'],
  kettlebell: [0.5, 0.1, 90, 'hang'],
  keyboard: [0.06, 0.5, 0, 'tool'],
  megaphone: [0.3, 0.82, -25, 'tool'],
  'milk-jug': [0.78, 0.3, 90, 'hang'],
  'news-mic': [0.62, 0.88, -115, 'tool'],
  notepad: [0.1, 0.5, 0, 'tool'],
  parcel: [0.5, 0.08, 90, 'hang'],
  pitchfork: [0.22, 0.95, -71, 'tool'],
  plunger: [0.72, 0.06, 101, 'tool'],
  'rescue-tube': [0.75, 0.1, 111, 'tool'],
  'ring-light': [0.5, 0.65, -90, 'tool'],
  speaker: [0.5, 0.08, 90, 'hang'],
  'taxi-sign': [0.06, 0.6, 0, 'tool'],
  toolbox: [0.5, 0.08, 90, 'hang'],
  'traffic-cone': [0.5, 0.06, 90, 'tool'],
  umbrella: [0.62, 0.08, 99, 'tool'],
  'watering-can': [0.4, 0.15, 90, 'hang'],
  wrench: [0.6, 0.9, -100, 'tool'],
  'tool-archaeologist': [0.8, 0.85, -130, 'tool'],
  'tool-baker': [0.85, 0.9, -135, 'tool'],
  'tool-beekeeper': [0.4, 0.1, 90, 'hang'],
  'tool-bus-driver': [0.7, 0.9, -120, 'tool'],
  'tool-carpenter': [0.4, 0.95, -85, 'tool'],
  'tool-chimney-sweep': [0.1, 0.95, -45, 'tool'],
  'tool-clown': [0.25, 0.92, -62, 'tool'],
  'tool-dog-groomer': [0.2, 0.92, -52, 'tool'],
  'tool-fashion-designer': [0.3, 0.85, -59, 'tool'],
  'tool-flight-attendant': [0.2, 0.93, -61, 'tool'],
  'tool-florist': [0.4, 0.95, -77, 'tool'],
  'tool-fortune-teller': [0.5, 0.9, 90, 'hang'],
  'tool-hotel-concierge': [0.5, 0.1, 90, 'hang'],
  'tool-ice-cream-vendor': [0.2, 0.92, -54, 'tool'],
  'tool-magician': [0.15, 0.9, -49, 'tool'],
  'tool-marine-biologist': [0.85, 0.95, -128, 'tool'],
  'tool-museum-curator': [0.2, 0.95, -56, 'tool'],
  'tool-nurse': [0.1, 0.5, 0, 'tool'],
  'tool-painter': [0.15, 0.9, -59, 'tool'],
  'tool-photographer': [0.5, 0.1, 90, 'hang'],
  'tool-postal-worker': [0.5, 0.05, 90, 'hang'],
  'tool-sailor': [0.15, 0.9, -55, 'tool'],
  'tool-scientist': [0.5, 0.1, 90, 'hang'],
  'tool-tailor': [0.55, 0.1, 90, 'hang'],
  'tool-tattoo-artist': [0.25, 0.8, -55, 'tool'],
  'tool-train-conductor': [0.5, 0.95, -85, 'tool'],
  'tool-veterinarian': [0.5, 0.1, 90, 'hang'],
  'tool-welder': [0.6, 0.95, -118, 'tool'],
  'tool-window-cleaner': [0.25, 0.95, -60, 'tool'],
  'tool-zookeeper': [0.5, 0.05, 90, 'hang'],
};

/** Whether a held item is gripped like a tool (true) or carried hanging by a handle. */
export function heldIsTool(equipmentId: string): boolean {
  const g = GRIP[HELD[equipmentId] ?? ''];
  return !g || g[3] === 'tool';
}

/**
 * Held equipment sprite, `len` px along its longest side, anchored on its grip
 * and turned so that in the hand container's space (+y = along the forearm)
 * tools point across the fist (+x) and hanging items hang along the arm (+y).
 */
export function heldSprite(equipmentId: string, len: number): Sprite | null {
  const name = HELD[equipmentId];
  const t = tex(name);
  if (!t) return null;
  const s = new Sprite(t);
  const k = len / Math.max(t.width, t.height);
  s.scale.set(k);
  const [u, v, deg, style] = GRIP[name!] ?? [0.5, 0.15, 90, 'hang'];
  s.anchor.set(u, v);
  const a = (deg * Math.PI) / 180;
  s.rotation = style === 'tool' ? -a : Math.PI / 2 - a;
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
