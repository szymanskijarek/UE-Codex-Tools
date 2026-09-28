// Authoritative game simulation. Runs unchanged in the browser (solo) and in
// Node (multiplayer server). No DOM, no network: feed it inputs, call step().

import {
  CHARACTERS, CHARACTER_BY_ID, OFFENCES, CAR_MODELS, CAR_COLORS, PLATES,
  DRIVER_LINES, RADIO, SUPERVISOR_REVIEWS, STREETS, SHOPS, EVENTS
} from './content.js';

const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const WORLD = { w: 1600, h: 1000 };
export const H_ROADS = [260, 740];
export const V_ROADS = [270, 800, 1330];
export const ROAD_HALF = 40;   // carriageway half-width
export const LANE_OUT = 64;    // outer edge of the parking lane
export const PAVE_OUT = 92;    // outer edge of the pavement (buildings start here)
const SPOT_LEN = 52;
const LANE_MID = (ROAD_HALF + LANE_OUT) / 2;

export const TUNING = {
  shiftLength: 180,
  baseQuota: 18,
  quotaPerDay: 3,
  wardenSpeed: 150,
  wardenRadius: 11,
  writeRange: 58,
  occupancy: 0.55,
  illegalChance: 0.45,
  high5Window: 1.2,
  high5Range: 85
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const an = (s) => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ---------------------------------------------------------------- map ----

function corridorSegments(roads, length) {
  // Stretches of curb between junction corridors.
  const segs = [];
  let start = 0;
  for (const c of roads) {
    segs.push([start, c - PAVE_OUT, start === 0]);
    start = c + PAVE_OUT;
  }
  segs.push([start, length, false, true]);
  return segs.map(([a, b, edgeA, edgeB]) => [a + (edgeA ? 6 : 14), b - (edgeB ? 6 : 14)]);
}

export function buildMap(seed = 1) {
  const rng = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const spots = [];
  const roads = [];
  const streetNames = [...STREETS];

  H_ROADS.forEach((cy, i) => roads.push({ kind: 'h', c: cy, name: streetNames[i] }));
  V_ROADS.forEach((cx, i) => roads.push({ kind: 'v', c: cx, name: streetNames[H_ROADS.length + i] }));

  const zoneWeights = [['meter', 30], ['free', 14], ['resident', 15], ['disabled', 8], ['loading', 9], ['yellow', 16], ['bus', 5]];
  const totalW = zoneWeights.reduce((s, z) => s + z[1], 0);
  const pickZone = () => {
    let r = rng() * totalW;
    for (const [z, wt] of zoneWeights) { if ((r -= wt) < 0) return z; }
    return 'free';
  };

  for (const road of roads) {
    const along = road.kind === 'h' ? WORLD.w : WORLD.h;
    const cross = road.kind === 'h' ? V_ROADS : H_ROADS;
    for (const [a, b] of corridorSegments(cross, along)) {
      const n = Math.floor((b - a) / SPOT_LEN);
      if (n <= 0) continue;
      const offset = a + ((b - a) - n * SPOT_LEN) / 2;
      for (const side of [-1, 1]) {
        let run = 0; let zone = 'free';
        for (let k = 0; k < n; k++) {
          if (run <= 0) {
            zone = pickZone();
            run = zone === 'bus' ? 2 : 2 + Math.floor(rng() * 3);
            if ((k === 0 || k === n - 1) && rng() < 0.35) { zone = 'yellow'; run = 1; }
          }
          run--;
          const u = offset + SPOT_LEN * (k + 0.5);
          const v = road.c + side * LANE_MID;
          spots.push({
            id: spots.length,
            x: road.kind === 'h' ? u : v,
            y: road.kind === 'h' ? v : u,
            o: road.kind,
            side,
            road: road.kind + road.c,
            roadC: road.c,
            street: road.name,
            type: zone,
            segA: a, segB: b
          });
        }
      }
    }
  }

  // Building blocks fill everything that isn't a road corridor.
  const xs = []; let s = 0;
  for (const c of V_ROADS) { xs.push([s, c - PAVE_OUT]); s = c + PAVE_OUT; }
  xs.push([s, WORLD.w]);
  const ys = []; s = 0;
  for (const c of H_ROADS) { ys.push([s, c - PAVE_OUT]); s = c + PAVE_OUT; }
  ys.push([s, WORLD.h]);
  const buildings = [];
  const shops = [...SHOPS].sort(() => rng() - 0.5);
  for (const [x0, x1] of xs) {
    for (const [y0, y1] of ys) {
      const shopCount = Math.max(1, Math.round((x1 - x0) / 170));
      const units = [];
      for (let i = 0; i < shopCount; i++) {
        units.push({ name: shops.pop() || pick(SHOPS), hue: Math.floor(rng() * 360) });
      }
      buildings.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, units });
    }
  }

  return { seed, world: WORLD, hRoads: H_ROADS, vRoads: V_ROADS, roads, spots, buildings, dims: { ROAD_HALF, LANE_OUT, PAVE_OUT, SPOT_LEN } };
}

// ---------------------------------------------------------------- game ---

export function offenceFor(car, spot, shiftT) {
  switch (spot.type) {
    case 'yellow': return 'yellow';
    case 'bus': return 'bus';
    case 'disabled': return car.badge ? null : 'disabled';
    case 'resident': return car.permit ? null : 'resident';
    case 'loading': return car.van ? null : 'loading';
    case 'meter': return shiftT > car.paidUntil ? 'meter' : null;
    default: return null;
  }
}

export class Game {
  constructor({ seed = (Math.random() * 1e9) | 0, quota, shiftLength } = {}) {
    this.seed = seed;
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.map = buildMap(seed);
    this.spotTypes = this.map.spots.map((s) => s.type);
    this.phase = 'lobby';
    this.day = 1;
    this.quotaOverride = quota;
    this.shiftLength = shiftLength || TUNING.shiftLength;
    this.t = 0;
    this.shiftT = 0;
    this.nextId = 1;
    this.wardens = new Map();
    this.cars = new Map();
    this.drivers = new Map();
    this.objects = new Map();
    this.spotCar = new Array(this.map.spots.length).fill(0);
    this.events = [];
    this.radio = null;
    this.results = null;
    this.nextSpawn = 0;
    this.nextRadio = 0;
    this.saidHalfway = false;
    this.saidMinute = false;
    this.event = null;
    this.eventQueue = [];
  }

  // ------------------------------------------------------------- helpers
  r(a = 0, b = 1) { return a + this.rng() * (b - a); }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }
  id() { return this.nextId++; }
  emit(e) { this.events.push(e); }
  float(x, y, text, color = '#fff') { this.emit({ k: 'float', x: Math.round(x), y: Math.round(y), text, color }); }
  sfx(s) { this.emit({ k: 'sfx', s }); }
  feed(text) { this.emit({ k: 'feed', text }); }
  get quota() { return this.quotaOverride || TUNING.baseQuota + TUNING.quotaPerDay * (this.day - 1); }
  spot(id) { return this.map.spots[id]; }

  bark(entity, text, secs = 3, force = false) {
    if (!text) return;
    if (!force && entity.bark && entity.bark.until > this.t + 0.8) return;
    entity.bark = { text, until: this.t + secs };
  }

  charBark(w, kind, chance = 1, force = false) {
    if (this.rng() > chance) return;
    const lines = CHARACTER_BY_ID[w.charId].barks[kind];
    if (lines && lines.length) this.bark(w, this.pick(lines), 3, force);
  }

  say(text, secs = 6) {
    this.radio = { text, until: this.t + secs };
    this.emit({ k: 'sfx', s: 'radio' });
  }

  fill(str, vars) { return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')); }

  // ------------------------------------------------------------- wardens
  addWarden(id, { name, charId, bot = false } = {}) {
    const ch = CHARACTER_BY_ID[charId] || this.pick(CHARACTERS);
    const n = this.wardens.size;
    const w = {
      id, name: (name || ch.name).slice(0, 20), charId: ch.id, bot,
      x: 800 + ((n % 4) - 1.5) * 34, y: 500 + (n >= 4 ? 30 : 0), facing: 0,
      input: { up: false, down: false, left: false, right: false, write: false },
      moving: false,
      score: 0, stats: this.freshStats(),
      writing: null,
      abilityReadyAt: 0,
      stunnedUntil: 0, dazzledUntil: 0,
      buffs: { scrawl: 0, reveal: 0, tea: 0, sprint: 0, synergy: 0, veteran: 0 },
      high5At: null,
      bark: null,
      nextIdle: this.t + this.r(12, 30),
      ai: bot ? { think: 0, target: null, path: [], wander: null, pauseUntil: 0 } : null
    };
    this.wardens.set(id, w);
    this.bark(w, `${ch.name.split(' ')[0]} reporting for duty!`, 2.5);
    this.feed(`${w.name} (${ch.title}) clocked on.`);
    return w;
  }

  addBot(charId) {
    const taken = new Set([...this.wardens.values()].map((w) => w.charId));
    const free = CHARACTERS.filter((c) => !taken.has(c.id));
    const ch = CHARACTER_BY_ID[charId] || this.pick(free.length ? free : CHARACTERS);
    return this.addWarden('bot' + this.id(), { name: ch.name, charId: ch.id, bot: true });
  }

  removeWarden(id) {
    const w = this.wardens.get(id);
    if (!w) return;
    this.wardens.delete(id);
    this.feed(`${w.name} went home early. "Migraine."`);
  }

  freshStats() { return { tickets: 0, complaints: 0, high5s: 0, hanging: 0, abilities: 0, clamps: 0, escaped: 0 }; }

  setInput(id, input) {
    const w = this.wardens.get(id);
    if (!w) return;
    w.input = {
      up: !!input.up, down: !!input.down, left: !!input.left, right: !!input.right, write: !!input.write
    };
  }

  // ------------------------------------------------------------- shift flow
  startShift() {
    if (this.phase === 'ended') this.day++;
    this.phase = 'playing';
    this.shiftT = 0;
    this.results = null;
    this.cars.clear(); this.drivers.clear(); this.objects.clear();
    this.spotCar.fill(0);
    this.spotTypes = this.map.spots.map((s) => s.type);
    this.saidHalfway = false; this.saidMinute = false;
    this.nextRadio = this.r(22, 32);
    this.nextSpawn = 0;
    // Two different events per shift: one early-ish, one late-ish.
    const pool = EVENTS.map((e) => e.id).sort(() => this.rng() - 0.5);
    const L = this.shiftLength;
    this.event = null;
    this.eventQueue = [{ at: L * this.r(0.2, 0.32), id: pool[0] }, { at: L * this.r(0.55, 0.66), id: pool[1] }];
    let k = 0;
    for (const w of this.wardens.values()) {
      w.score = 0; w.stats = this.freshStats();
      w.writing = null; w.abilityReadyAt = 0; w.stunnedUntil = 0; w.dazzledUntil = 0;
      w.buffs = { scrawl: 0, reveal: 0, tea: 0, sprint: 0, synergy: 0, veteran: 0 };
      w.x = 800 + ((k % 4) - 1.5) * 34; w.y = 500 + (k >= 4 ? 30 : 0); k++;
    }
    // Pre-fill the town so the first seconds aren't empty.
    const target = Math.floor(this.map.spots.length * TUNING.occupancy * 0.7);
    for (let i = 0; i < target; i++) this.spawnCar(true);
    const street = this.pick(this.map.roads).name;
    this.say(this.fill(this.pick(RADIO.start), { q: this.quota, street }), 7);
    this.feed(`Day ${this.day}. Shift started. Quota: ${this.quota} points each.`);
    this.sfx('whistle');
  }

  endShift() {
    this.phase = 'ended';
    this.event = null;
    this.eventQueue = [];
    for (const o of this.objects.values()) if (o.type === 'inspector') this.objects.delete(o.id);
    for (const w of this.wardens.values()) { w.writing = null; }
    const list = [...this.wardens.values()];
    const q = this.quota;
    const rows = list.map((w) => {
      const ratio = w.score / q;
      const key = ratio >= 1.5 ? 'star' : ratio >= 1 ? 'met' : ratio >= 0.7 ? 'close' : 'poor';
      let review = this.pick(SUPERVISOR_REVIEWS[key]);
      if (w.stats.complaints >= 2) review += ' ' + this.fill(this.pick(SUPERVISOR_REVIEWS.complaints), { c: w.stats.complaints });
      return { id: w.id, name: w.name, charId: w.charId, bot: w.bot, score: w.score, met: w.score >= q, review, ...w.stats };
    }).sort((a, b) => b.score - a.score);

    const awards = [];
    const best = (key, title, blurb, min = 1) => {
      const top = [...rows].sort((a, b) => b[key] - a[key])[0];
      if (top && top[key] >= min) awards.push({ title, name: top.name, blurb: this.fill(blurb, { n: top[key] }).replace(/\b1 (\w+)s\b/, '1 $1') });
    };
    best('score', 'Warden of the Shift', '{n} points. Terrifying.');
    best('complaints', 'Most Complained About', '{n} complaints. The phone hasn\'t stopped.');
    best('hanging', 'Loneliest Palm', 'Left hanging {n} times. We\'re all very sorry.');
    best('high5s', 'Team Spirit Award', '{n} successful high-fives. HR is concerned.');
    best('clamps', 'Golden Clamp', '{n} clamps. Big Sheila is proud.');
    best('escaped', 'Butterfingers', '{n} drivers escaped mid-ticket.');
    best('abilities', 'Gadget Addict', 'Used their special ability {n} times.', 3);

    const team = rows.reduce((s, r) => s + r.score, 0);
    const teamQuota = q * rows.length;
    this.results = { day: this.day, quota: q, team, teamQuota, teamMet: team >= teamQuota, rows, awards };
    this.say(team >= teamQuota ? 'Control: team quota MET. Biscuits in the depot. Plain ones.' : 'Control: team quota missed. Nobody touch the biscuits.', 8);
    this.sfx('whistle');
  }

  // ------------------------------------------------------------- cars
  spawnCar(prefill = false, { onlyTypes = null, tag = null, model: forcedModel = null, color = null, stay: forcedStay = 0 } = {}) {
    const free = [];
    for (const s of this.map.spots) if (!this.spotCar[s.id]) free.push(s);
    if (!free.length) return null;
    const illegal = onlyTypes ? true : this.rng() < this.mods.illegal;
    const candidates = free.filter((s) => {
      const t = this.spotTypes[s.id];
      if (onlyTypes) return onlyTypes.includes(t);
      return illegal ? t !== 'free' : t !== 'yellow' && t !== 'bus';
    });
    if (onlyTypes && !candidates.length) return null;
    const spot = this.pick(candidates.length ? candidates : free);
    const type = this.spotTypes[spot.id];

    const vanWanted = type === 'loading' ? !illegal : this.rng() < 0.12;
    const models = CAR_MODELS.filter((m) => !!m.van === vanWanted);
    const model = forcedModel || this.pick(models);
    const stay = forcedStay || this.r(28, 58);
    const car = {
      id: this.id(), spotId: spot.id, model: model.name, len: model.len, van: !!model.van,
      color: color || (model.van ? this.pick(['#ecf0f1', '#f5f6fa', '#dfe6e9', '#ffeaa7']) : this.pick(CAR_COLORS)),
      tag,
      plate: this.rng() < 0.35 ? this.pick(PLATES) : this.randomPlate(),
      badge: type === 'disabled' ? !illegal : this.rng() < 0.08,
      permit: type === 'resident' ? !illegal : this.rng() < 0.1,
      paidUntil: 0,
      leaveAt: this.shiftT + stay * (prefill ? this.r(0.4, 1) : 1),
      state: prefill ? 'parked' : 'arriving', anim: prefill ? 1 : 0,
      x: spot.x, y: spot.y, fromX: 0, fromY: 0, toX: spot.x, toY: spot.y,
      ticketedBy: null, wrongTicket: false, clampedUntil: 0, driverId: 0
    };
    if (type === 'meter') {
      car.paidUntil = illegal
        ? this.shiftT + (this.rng() < 0.3 ? -1 : this.r(4, stay * 0.6))
        : car.leaveAt + 20;
    } else {
      car.paidUntil = car.leaveAt + 20;
    }
    if (!prefill) {
      const [lx, ly] = this.laneStart(spot);
      car.fromX = lx; car.fromY = ly; car.x = lx; car.y = ly;
    }
    this.cars.set(car.id, car);
    this.spotCar[spot.id] = car.id;
    return car;
  }

  randomPlate() {
    const L = 'ABCDEFGHJKLMNPRSTVWXY';
    const c = () => L[Math.floor(this.rng() * L.length)];
    return `${c()}${c()}${Math.floor(this.r(10, 74))} ${c()}${c()}${c()}`;
  }

  laneStart(spot) {
    // Cars roll in along the traffic lane, then swing into the bay.
    const lane = spot.roadC + spot.side * 18;
    return spot.o === 'h' ? [spot.x - spot.side * 150, lane] : [lane, spot.y + spot.side * 150];
  }

  laneEnd(spot) {
    const lane = spot.roadC + spot.side * 18;
    return spot.o === 'h' ? [spot.x + spot.side * 170, lane] : [lane, spot.y - spot.side * 170];
  }

  moveCarTo(car, spot) {
    this.spotCar[car.spotId] = 0;
    this.spotCar[spot.id] = car.id;
    car.spotId = spot.id;
    car.state = 'nudged'; car.anim = 0;
    car.fromX = car.x; car.fromY = car.y; car.toX = spot.x; car.toY = spot.y;
    for (const w of this.wardens.values()) if (w.writing && w.writing.carId === car.id) w.writing = null;
  }

  carOffence(car) {
    if (car.state !== 'parked') return null;
    const spot = this.spot(car.spotId);
    return offenceFor(car, { type: this.spotTypes[spot.id] }, this.shiftT);
  }

  beginLeaving(car) {
    const spot = this.spot(car.spotId);
    car.state = 'leaving';
    car.anim = 0;
    car.fromX = car.x; car.fromY = car.y;
    [car.toX, car.toY] = this.laneEnd(spot);
    this.spotCar[car.spotId] = 0;
    if (car.driverId) this.drivers.delete(car.driverId);
    car.driverId = 0;
    for (const w of this.wardens.values()) if (w.writing && w.writing.carId === car.id) w.writing = null;
  }

  updateCars(dt) {
    for (const car of this.cars.values()) {
      if (car.state === 'arriving' || car.state === 'nudged') {
        car.anim = Math.min(1, car.anim + dt / (car.state === 'nudged' ? 0.7 : 1.1));
        const e = 1 - Math.pow(1 - car.anim, 3);
        car.x = car.fromX + (car.toX - car.fromX) * e;
        car.y = car.fromY + (car.toY - car.fromY) * e;
        if (car.anim >= 1) car.state = 'parked';
      } else if (car.state === 'leaving') {
        car.anim = Math.min(1, car.anim + dt / 1.2);
        const e = car.anim * car.anim;
        car.x = car.fromX + (car.toX - car.fromX) * e;
        car.y = car.fromY + (car.toY - car.fromY) * e;
        if (car.anim >= 1) this.cars.delete(car.id);
      } else if (car.state === 'parked') {
        if (!car.driverId && this.shiftT > car.leaveAt - 4) this.spawnDriver(car);
      }
    }
  }

  // ------------------------------------------------------------- drivers
  curbPoint(spot, out) {
    return spot.o === 'h'
      ? [spot.x, spot.roadC + spot.side * out]
      : [spot.roadC + spot.side * out, spot.y];
  }

  spawnDriver(car) {
    const spot = this.spot(car.spotId);
    const [bx, by] = this.curbPoint(spot, PAVE_OUT - 2);
    const along = this.r(-70, 70);
    const d = {
      id: this.id(), carId: car.id,
      x: spot.o === 'h' ? clamp(bx + along, spot.segA, spot.segB) : bx,
      y: spot.o === 'h' ? by : clamp(by + along, spot.segA, spot.segB),
      shirt: this.pick(CAR_COLORS), frozenUntil: 0, waiting: false, bark: null
    };
    car.driverId = d.id;
    this.drivers.set(d.id, d);
  }

  updateDrivers(dt) {
    for (const d of this.drivers.values()) {
      const car = this.cars.get(d.carId);
      if (!car) { this.drivers.delete(d.id); continue; }
      if (d.frozenUntil > this.t) continue;
      const spot = this.spot(car.spotId);
      const [tx, ty] = this.curbPoint(spot, LANE_OUT + 8);
      const dd = dist(d.x, d.y, tx, ty);
      if (dd > 3 && car.state === 'parked') {
        const sp = 60 * this.mods.driverSpeed * dt;
        d.x += ((tx - d.x) / dd) * Math.min(sp, dd);
        d.y += ((ty - d.y) / dd) * Math.min(sp, dd);
        continue;
      }
      if (car.state !== 'parked') continue;
      if (car.clampedUntil > this.t) {
        if (!d.waiting) { d.waiting = true; this.bark(d, this.pick(DRIVER_LINES.clamped), 3.5, true); this.sfx('angry'); }
        continue;
      }
      const writer = [...this.wardens.values()].find((w) => w.writing && w.writing.carId === car.id && w.writing.progress > 0.05);
      if (writer && !car.ticketedBy) {
        writer.stats.escaped++;
        this.bark(d, this.pick(DRIVER_LINES.escaped), 3, true);
        this.float(car.x, car.y - 20, 'ESCAPED!', '#ff7675');
        this.charBark(writer, 'complaint', 0.3);
        this.sfx('escape');
        this.leaveWithBark(car, d);
        continue;
      }
      if (car.ticketedBy && !car.wrongTicket) {
        this.bark(d, this.pick(DRIVER_LINES.ticketed), 3.5, true);
        this.sfx('angry');
      } else if (this.rng() < 0.25) {
        this.bark(d, this.pick(DRIVER_LINES.happy), 2.5);
      }
      this.leaveWithBark(car, d);
    }
  }

  leaveWithBark(car, d) {
    // The driver "gets in" but their speech bubble lingers as a ghost.
    if (d.bark) this.emit({ k: 'bubble', x: Math.round(d.x), y: Math.round(d.y), text: d.bark.text });
    this.beginLeaving(car);
  }

  // ------------------------------------------------------------- movement
  collides(x, y) {
    const r = TUNING.wardenRadius;
    for (const b of this.map.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  }

  speedOf(w) {
    const ch = CHARACTER_BY_ID[w.charId];
    let s = TUNING.wardenSpeed * ch.speed;
    if (w.buffs.tea > this.t) s *= 1.35;
    if (w.buffs.sprint > this.t) s *= 2.2;
    if (w.buffs.synergy > this.t) s *= 1.25;
    if (w.dazzledUntil > this.t) s *= 0.45;
    if (w.bot) s *= 0.62; // bots dawdle, stop to read signs, check their phones
    return s;
  }

  moveWarden(w, dt) {
    let mx = 0; let my = 0;
    if (w.bot) { mx = w.ai.mx || 0; my = w.ai.my || 0; } else {
      mx = (w.input.right ? 1 : 0) - (w.input.left ? 1 : 0);
      my = (w.input.down ? 1 : 0) - (w.input.up ? 1 : 0);
    }
    const len = Math.hypot(mx, my);
    w.moving = len > 0.01 && w.stunnedUntil <= this.t;
    if (!w.moving) return;
    mx /= len; my /= len;
    w.facing = Math.atan2(my, mx);
    const step = this.speedOf(w) * dt;
    const r = TUNING.wardenRadius;
    const nx = clamp(w.x + mx * step, r, WORLD.w - r);
    if (!this.collides(nx, w.y)) w.x = nx;
    const ny = clamp(w.y + my * step, r, WORLD.h - r);
    if (!this.collides(w.x, ny)) w.y = ny;
  }

  // ------------------------------------------------------------- tickets
  nearestCar(w, range, filter = () => true) {
    let best = null; let bd = range;
    for (const car of this.cars.values()) {
      if (car.state !== 'parked' || !filter(car)) continue;
      const d = dist(w.x, w.y, car.x, car.y);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  }

  writeTimeOf(w) {
    let t = CHARACTER_BY_ID[w.charId].writeTime;
    if (w.buffs.tea > this.t) t *= 0.7;
    if (w.buffs.scrawl > this.t) t = 0.12;
    else {
      if (w.bot) t *= 1.7;
      t *= this.mods.write;
    }
    return t;
  }

  updateWriting(w, dt) {
    const canWrite = this.phase === 'playing' && w.input.write && !w.moving && w.stunnedUntil <= this.t;
    if (!canWrite) { w.writing = null; return; }
    let car = w.writing && this.cars.get(w.writing.carId);
    if (!car || car.state !== 'parked' || car.ticketedBy || dist(w.x, w.y, car.x, car.y) > TUNING.writeRange) {
      car = this.nearestCar(w, TUNING.writeRange, (c) => !c.ticketedBy);
      w.writing = car ? { carId: car.id, progress: 0 } : null;
      if (!car) return;
    }
    w.writing.progress += dt / this.writeTimeOf(w);
    if (w.writing.progress >= 1) { this.issueTicket(w, car); w.writing = null; }
  }

  issueTicket(w, car) {
    const off = this.carOffence(car);
    car.ticketedBy = w.id;
    if (off) {
      const o = OFFENCES[off];
      let pts = o.points + (car.tag === 'wedding' ? 2 : car.tag === 'icecream' ? 4 : 0);
      if (w.buffs.veteran > 0) { pts *= 2; w.buffs.veteran--; }
      pts *= this.mods.points;
      w.score += pts;
      w.stats.tickets++;
      if (w.ai) w.ai.pauseUntil = this.t + this.r(2.5, 5); // admire their handiwork
      this.float(car.x, car.y - 18, `+${pts} ${o.name}`, '#ffe066');
      this.charBark(w, 'ticket', 0.45);
      this.sfx('ticket');
      this.feed(`${w.name} fined ${an(car.model)} [${car.plate}]: ${this.pick(o.reasons)}.`);
    } else {
      car.wrongTicket = true;
      const penalty = this.mods.complaint;
      w.score = Math.max(0, w.score - penalty);
      w.stats.complaints++;
      this.float(car.x, car.y - 18, `COMPLAINT -${penalty}`, '#ff7675');
      this.charBark(w, 'complaint', 1, true);
      this.sfx('complaint');
      this.say(this.fill(this.pick(RADIO.complaint), { name: w.name.split(' ')[0] }), 5);
    }
  }

  // ------------------------------------------------------------- abilities
  useAbility(id) {
    const w = this.wardens.get(id);
    if (!w || this.phase !== 'playing') return false;
    if (w.stunnedUntil > this.t || this.t < w.abilityReadyAt) return false;
    const ch = CHARACTER_BY_ID[w.charId];
    const ok = this.abilityEffects[ch.ability.id].call(this, w);
    if (ok === false) { w.abilityReadyAt = this.t + 1; this.sfx('fail'); return false; }
    w.abilityReadyAt = this.t + ch.ability.cooldown;
    w.stats.abilities++;
    this.charBark(w, 'ability', 1, true);
    this.sfx('ability');
    return true;
  }

  rivals(w, range) {
    return [...this.wardens.values()].filter((o) => o !== w && dist(o.x, o.y, w.x, w.y) < range);
  }

  fail(w, text) { this.bark(w, text, 2.5, true); return false; }

  get abilityEffects() {
    return {
      scrawl(w) { w.buffs.scrawl = this.t + 6; },
      smalltalk(w) {
        let n = 0;
        for (const d of this.drivers.values()) {
          if (dist(d.x, d.y, w.x, w.y) < 190) { d.frozenUntil = this.t + 7; this.bark(d, this.pick(DRIVER_LINES.frozen), 4, true); n++; }
        }
        if (!n) return this.fail(w, '...hello? Anyone? Nice weather, pigeon.');
        this.float(w.x, w.y - 30, `${n} trapped in small talk`, '#74b9ff');
      },
      clamp(w) {
        const car = this.nearestCar(w, 75, (c) => c.clampedUntil <= this.t && ((c.ticketedBy && !c.wrongTicket) || this.carOffence(c)));
        if (!car) return this.fail(w, 'Nothing clampable. Big Sheila weeps.');
        car.clampedUntil = this.t + 14;
        w.score += 2; w.stats.clamps++;
        this.float(car.x, car.y - 18, '+2 CLAMPED', '#fdcb6e');
        this.feed(`${w.name} clamped ${an(car.model)}. It had it coming.`);
      },
      nudge(w) {
        const car = this.nearestCar(w, 85, (c) => !c.ticketedBy && c.clampedUntil <= this.t);
        if (!car) return this.fail(w, 'Nothing to nudge. Just... air.');
        const from = this.spot(car.spotId);
        let best = null; let bd = 480;
        for (const s of this.map.spots) {
          const t = this.spotTypes[s.id];
          if (this.spotCar[s.id] || (t !== 'yellow' && t !== 'bus')) continue;
          const d = dist(s.x, s.y, from.x, from.y);
          if (d < bd) { bd = d; best = s; }
        }
        if (!best) return this.fail(w, 'No illegal spots free. Curses.');
        this.moveCarTo(car, best);
        this.float(car.x, car.y - 18, 'REPOSITIONED', '#55efc4');
        this.feed(`${w.name} "repositioned" ${an(car.model)} onto ${this.spotTypes[best.id] === 'bus' ? 'a bus stop' : 'double yellows'}.`);
      },
      meter(w) {
        let n = 0;
        for (const car of this.cars.values()) {
          if (car.state !== 'parked' || this.spotTypes[car.spotId] !== 'meter') continue;
          if (dist(car.x, car.y, w.x, w.y) < 230 && car.paidUntil >= this.shiftT) { car.paidUntil = this.shiftT - 0.01; n++; }
        }
        if (!n) return this.fail(w, 'No meters in earshot. Lonely.');
        this.float(w.x, w.y - 30, `${n} meters expired`, '#e056fd');
      },
      paint(w) {
        let best = null; let bd = 95;
        for (const s of this.map.spots) {
          const t = this.spotTypes[s.id];
          if (t === 'yellow' || t === 'bus') continue;
          const d = dist(s.x, s.y, w.x, w.y);
          if (d < bd) { bd = d; best = s; }
        }
        if (!best) return this.fail(w, 'Nothing left to paint. Artistic block.');
        this.spotTypes[best.id] = 'yellow';
        this.float(best.x, best.y - 18, 'FRESH YELLOWS', '#f9ca24');
      },
      lecture(w) {
        const r = this.rivals(w, 190);
        if (!r.length) return this.fail(w, 'No one to lecture. I\'ll lecture myself.');
        for (const o of r) { o.stunnedUntil = this.t + 3; o.writing = null; this.charBark(o, 'stunned', 1, true); }
        this.float(w.x, w.y - 30, 'SECTION 14b', '#81ecec');
      },
      drone(w) { w.buffs.reveal = this.t + 8; },
      tea(w) {
        const o = { id: this.id(), type: 'urn', x: w.x, y: w.y, owner: w.id, until: this.t + 10 };
        this.objects.set(o.id, o);
      },
      dazzle(w) {
        const r = this.rivals(w, 230);
        if (!r.length) return this.fail(w, 'Dazzling... nobody. As usual.');
        for (const o of r) { o.dazzledUntil = this.t + 3.5; this.charBark(o, 'stunned', 0.6, true); }
      },
      cone(w) {
        for (let i = 0; i < 3; i++) {
          const a = w.facing + Math.PI + (i - 1) * 0.9;
          const o = { id: this.id(), type: 'cone', x: w.x + Math.cos(a) * 34, y: w.y + Math.sin(a) * 34, owner: w.id, until: this.t + 25 };
          this.objects.set(o.id, o);
        }
      },
      veteran(w) { w.buffs.veteran = 3; },
      sprint(w) { w.buffs.sprint = this.t + 3; },
      steal(w) {
        const r = this.rivals(w, 120).filter((o) => o.score > 0).sort((a, b) => dist(a.x, a.y, w.x, w.y) - dist(b.x, b.y, w.x, w.y));
        if (!r.length) return this.fail(w, 'Nobody worth robbing nearby.');
        r[0].score--; w.score++;
        this.float(r[0].x, r[0].y - 30, '-1 (clerical error)', '#ff7675');
        this.float(w.x, w.y - 30, '+1 (definitely mine)', '#badc58');
        this.feed(`${w.name} "found" one of ${r[0].name}'s tickets.`);
      }
    };
  }

  updateObjects() {
    for (const o of this.objects.values()) {
      if (o.until < this.t) { this.objects.delete(o.id); continue; }
      if (o.type === 'urn') {
        for (const w of this.wardens.values()) if (dist(w.x, w.y, o.x, o.y) < 140) w.buffs.tea = Math.max(w.buffs.tea, this.t + 0.3);
      } else if (o.type === 'cone') {
        for (const w of this.wardens.values()) {
          if (w.id === o.owner || w.stunnedUntil > this.t) continue;
          if (dist(w.x, w.y, o.x, o.y) < 20) {
            w.stunnedUntil = this.t + 1.5; w.writing = null;
            this.objects.delete(o.id);
            this.float(w.x, w.y - 30, 'TRIPPED!', '#ff9f43');
            this.charBark(w, 'stunned', 1, true);
            this.sfx('trip');
            break;
          }
        }
      }
    }
  }

  // ------------------------------------------------------------- high fives
  high5(id) {
    const w = this.wardens.get(id);
    if (!w || w.stunnedUntil > this.t) return;
    if (w.high5At !== null && this.t - w.high5At < TUNING.high5Window) return;
    w.high5At = this.t;
    const partner = [...this.wardens.values()].find((o) => o !== w && o.high5At !== null && this.t - o.high5At <= TUNING.high5Window && dist(o.x, o.y, w.x, w.y) < TUNING.high5Range);
    if (!partner) return;
    for (const p of [w, partner]) {
      p.high5At = null;
      p.buffs.synergy = this.t + 6;
      p.stats.high5s++;
      if (this.phase === 'playing') p.score += 1;
    }
    this.charBark(w, 'high5', 1, true);
    this.charBark(partner, 'high5', 1, true);
    this.float((w.x + partner.x) / 2, (w.y + partner.y) / 2 - 30, this.phase === 'playing' ? 'HIGH FIVE! +1 each' : 'HIGH FIVE!', '#55efc4');
    this.emit({ k: 'clap', x: Math.round((w.x + partner.x) / 2), y: Math.round((w.y + partner.y) / 2) });
    this.sfx('clap');
  }

  updateHigh5s() {
    for (const w of this.wardens.values()) {
      if (w.high5At !== null && this.t - w.high5At > TUNING.high5Window) {
        w.high5At = null;
        const anyone = this.rivals(w, TUNING.high5Range * 1.5).length > 0;
        w.stats.hanging++;
        if (anyone) this.charBark(w, 'hanging', 1, true);
        else this.bark(w, this.pick(['*high-fives the air*', '*slowly lowers hand*', '*pretends to fix hair*']), 2.5, true);
        this.float(w.x, w.y - 30, 'LEFT HANGING', '#b2bec3');
        this.sfx('sad');
      }
    }
  }

  // ------------------------------------------------------------- events
  get mods() {
    const id = this.event && this.event.id;
    return {
      points: id === 'inspection' ? 2 : 1,
      complaint: id === 'inspection' ? 3 : 1,
      write: id === 'rain' ? 1.5 : 1,
      driverSpeed: id === 'rain' ? 1.9 : 1,
      illegal: id === 'rushhour' ? 0.8 : TUNING.illegalChance,
      occupancy: id === 'rushhour' ? 0.78 : TUNING.occupancy,
      spawnRate: id === 'rushhour' ? 3 : 1
    };
  }

  startEvent(id) {
    const def = EVENT_BY_ID[id];
    if (!def) return;
    this.event = { id, until: Math.min(this.shiftT + def.duration, this.shiftLength - 1), next: this.shiftT + 9 };
    this.say(this.pick(def.start), 7);
    this.nextRadio = Math.max(this.nextRadio, this.shiftT + 15);
    this.feed(`${def.icon} ${def.name}! ${def.desc}`);
    this.emit({ k: 'event', id });
    this.sfx('event');
    if (id === 'inspection') {
      const road = this.pick(H_ROADS);
      const o = { id: this.id(), type: 'inspector', x: this.rng() < 0.5 ? 20 : WORLD.w - 20, y: road, until: this.t + 999, bark: null, nextBark: this.t + 3 };
      this.objects.set(o.id, o);
    } else if (id === 'wedding') {
      const model = { name: 'Wedding Car (ribbons, honking)', len: 48 };
      for (let i = 0; i < 6; i++) this.spawnCar(false, { onlyTypes: ['yellow', 'bus'], tag: 'wedding', model, color: '#fdfdfd', stay: def.duration - 2 });
    } else if (id === 'icecream') {
      this.spawnCar(false, { onlyTypes: ['yellow', 'bus'], tag: 'icecream', model: { name: 'Mr Whippy (rogue)', len: 50, van: true }, color: '#ffeaa7', stay: def.duration + 5 });
      this.sfx('jingle');
    }
  }

  endEvent() {
    const def = EVENT_BY_ID[this.event.id];
    this.say(this.pick(def.end), 6);
    for (const o of this.objects.values()) if (o.type === 'inspector') this.objects.delete(o.id);
    for (const c of this.cars.values()) {
      if (c.tag === 'icecream' && c.state !== 'leaving' && !c.ticketedBy) {
        this.float(c.x, c.y - 18, '🍦 GOT AWAY', '#ffeaa7');
        this.beginLeaving(c);
      }
    }
    this.event = null;
  }

  updateEvent(dt) {
    const ev = this.event;
    if (!ev) {
      if (this.eventQueue.length && this.shiftT >= this.eventQueue[0].at) this.startEvent(this.eventQueue.shift().id);
      return;
    }
    if (this.shiftT >= ev.until) { this.endEvent(); return; }
    if (ev.id === 'inspection') {
      const def = EVENT_BY_ID.inspection;
      for (const o of this.objects.values()) {
        if (o.type !== 'inspector') continue;
        // Loom behind whichever warden is closest. Menacingly. With a clipboard.
        let target = null; let bd = Infinity;
        for (const w of this.wardens.values()) { const d = dist(w.x, w.y, o.x, o.y); if (d < bd) { bd = d; target = w; } }
        if (target && bd > 45) {
          const sp = 75 * dt;
          o.x += ((target.x - o.x) / bd) * sp;
          o.y += ((target.y - o.y) / bd) * sp;
        }
        if (this.t > o.nextBark) { o.nextBark = this.t + this.r(4, 7); this.bark(o, this.pick(def.barks), 3, true); }
      }
    } else if (ev.id === 'icecream' && this.shiftT >= ev.next) {
      ev.next = this.shiftT + 9;
      for (const c of this.cars.values()) {
        if (c.tag !== 'icecream' || c.state !== 'parked' || c.ticketedBy || c.clampedUntil > this.t) continue;
        const spots = this.map.spots.filter((s) => !this.spotCar[s.id] && ['yellow', 'bus'].includes(this.spotTypes[s.id]));
        if (!spots.length) continue;
        this.float(c.x, c.y - 18, '🍦 *Greensleeves*', '#ffeaa7');
        const dest = this.pick(spots);
        this.moveCarTo(c, dest);
        [c.fromX, c.fromY] = this.laneStart(dest); // pops up round the corner, as they do
        c.x = c.fromX; c.y = c.fromY;
        this.sfx('jingle');
      }
    }
  }

  // ------------------------------------------------------------- bots
  corridorsOf(x, y) {
    const out = [];
    for (const c of H_ROADS) if (Math.abs(y - c) <= PAVE_OUT) out.push('h' + c);
    for (const c of V_ROADS) if (Math.abs(x - c) <= PAVE_OUT) out.push('v' + c);
    return out;
  }

  planPath(w, tx, ty, targetRoad) {
    const here = this.corridorsOf(w.x, w.y);
    if (!here.length || here.includes(targetRoad)) return [[tx, ty]];
    const tKind = targetRoad[0]; const tc = +targetRoad.slice(1);
    const hRoad = here.find((r) => r[0] === 'h'); const vRoad = here.find((r) => r[0] === 'v');
    if (tKind === 'h' && vRoad) return [[+vRoad.slice(1), tc], [tx, ty]];
    if (tKind === 'v' && hRoad) return [[tc, +hRoad.slice(1)], [tx, ty]];
    if (tKind === 'h') {
      const cx = V_ROADS.reduce((b, c) => (Math.abs(c - w.x) < Math.abs(b - w.x) ? c : b));
      return [[cx, +hRoad.slice(1)], [cx, tc], [tx, ty]];
    }
    const cy = H_ROADS.reduce((b, c) => (Math.abs(c - w.y) < Math.abs(b - w.y) ? c : b));
    return [[+vRoad.slice(1), cy], [tc, cy], [tx, ty]];
  }

  standPoint(car) {
    const spot = this.spot(car.spotId);
    return spot.o === 'h' ? [car.x, car.y - spot.side * 28] : [car.x - spot.side * 28, car.y];
  }

  botAbilityWanted(w) {
    const id = CHARACTER_BY_ID[w.charId].ability.id;
    const near = (r) => this.rivals(w, r).length > 0;
    switch (id) {
      case 'scrawl': case 'veteran': case 'drone': return !!w.ai.target;
      case 'sprint': return !!w.ai.target && w.ai.path.length > 1;
      case 'smalltalk': return [...this.drivers.values()].some((d) => dist(d.x, d.y, w.x, w.y) < 150);
      case 'clamp': return !!this.nearestCar(w, 70, (c) => c.clampedUntil <= this.t && ((c.ticketedBy && !c.wrongTicket) || this.carOffence(c)));
      case 'nudge': return !!this.nearestCar(w, 80, (c) => !c.ticketedBy && !this.carOffence(c));
      case 'meter': return [...this.cars.values()].filter((c) => this.spotTypes[c.spotId] === 'meter' && !this.carOffence(c) && dist(c.x, c.y, w.x, w.y) < 220).length >= 2;
      case 'paint': return !!this.nearestCar(w, 70, (c) => !c.ticketedBy && !this.carOffence(c));
      case 'lecture': return near(170);
      case 'dazzle': return near(200);
      case 'steal': return this.rivals(w, 110).some((o) => o.score > 0);
      case 'tea': case 'cone': return this.rng() < 0.3;
      default: return false;
    }
  }

  updateBot(w, dt) {
    const ai = w.ai;
    if (ai.pauseUntil > this.t) { ai.mx = 0; ai.my = 0; w.input.write = false; return; }
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = this.r(0.3, 0.55);
      const claimed = new Set([...this.wardens.values()].filter((o) => o !== w && o.ai && o.ai.target).map((o) => o.ai.target));
      let target = this.cars.get(ai.target);
      if (!target || target.state !== 'parked' || target.ticketedBy || this.phase !== 'playing') target = null;
      if (!target && this.phase === 'playing') {
        let bd = Infinity;
        const sloppy = this.rng() < 0.06; // bots misread signs sometimes. Like people.
        for (const c of this.cars.values()) {
          if (c.state !== 'parked' || c.ticketedBy || claimed.has(c.id)) continue;
          if (!sloppy && !this.carOffence(c)) continue;
          const d = dist(c.x, c.y, w.x, w.y) + this.r(0, 120);
          if (d < bd) { bd = d; target = c; }
        }
      }
      ai.target = target ? target.id : null;
      if (target) {
        const [sx, sy] = this.standPoint(target);
        ai.path = this.planPath(w, sx, sy, this.spot(target.spotId).road);
      } else {
        if (!ai.wander || dist(w.x, w.y, ai.wander[0], ai.wander[1]) < 20) {
          const s = this.pick(this.map.spots);
          ai.wander = this.standPoint({ spotId: s.id, x: s.x, y: s.y });
          ai.wanderRoad = s.road;
        }
        ai.path = this.planPath(w, ai.wander[0], ai.wander[1], ai.wanderRoad);
      }
      if (this.phase === 'playing' && this.t >= w.abilityReadyAt && this.rng() < 0.4 && this.botAbilityWanted(w)) this.useAbility(w.id);
      // Reciprocate (or cruelly ignore) high-fives.
      const offer = [...this.wardens.values()].find((o) => o !== w && o.high5At !== null && o.high5At !== ai.snubbed && this.t - o.high5At > 0.25 && dist(o.x, o.y, w.x, w.y) < TUNING.high5Range);
      if (offer && w.high5At === null) { if (this.rng() < 0.6) this.high5(w.id); else ai.snubbed = offer.high5At; }
      else if (w.high5At === null && this.rng() < 0.01 && this.rivals(w, 60).length) this.high5(w.id);
    }

    ai.mx = 0; ai.my = 0;
    w.input.write = false;
    while (ai.path.length) {
      const [px, py] = ai.path[0];
      const d = dist(w.x, w.y, px, py);
      if (d < (ai.path.length === 1 ? 6 : 12)) { ai.path.shift(); continue; }
      ai.mx = (px - w.x) / d; ai.my = (py - w.y) / d;
      break;
    }
    const target = this.cars.get(ai.target);
    if (target && !ai.path.length && dist(w.x, w.y, target.x, target.y) < TUNING.writeRange) {
      w.input.write = true;
      if (!w.writing || w.writing.carId !== target.id) w.writing = { carId: target.id, progress: 0 };
    }
  }

  // ------------------------------------------------------------- tick
  step(dt) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    if (this.phase === 'playing') {
      this.shiftT += dt;
      this.nextSpawn -= dt;
      const occupied = this.spotCar.filter(Boolean).length;
      const mods = this.mods;
      if (this.nextSpawn <= 0 && occupied < this.map.spots.length * mods.occupancy) {
        this.spawnCar();
        this.nextSpawn = this.r(0.35, 0.9) / (Math.max(1, this.wardens.size * 0.6) * mods.spawnRate);
      }
      if (this.shiftT > this.nextRadio) {
        this.nextRadio = this.shiftT + this.r(25, 40);
        this.say(this.fill(this.pick(RADIO.random), { street: this.pick(this.map.roads).name }));
      }
      const left = this.shiftLength - this.shiftT;
      if (!this.saidHalfway && this.shiftT > this.shiftLength / 2) {
        this.saidHalfway = true;
        const team = [...this.wardens.values()].reduce((s, w) => s + w.score, 0);
        this.say(this.fill(RADIO.halfway[0], { team, teamq: this.quota * this.wardens.size }));
      }
      if (!this.saidMinute && left < 60) { this.saidMinute = true; this.say(RADIO.minute[0]); }
      this.updateEvent(dt);
      this.updateCars(dt);
      this.updateDrivers(dt);
    }

    for (const w of this.wardens.values()) {
      if (w.bot) this.updateBot(w, dt);
      this.moveWarden(w, dt);
      this.updateWriting(w, dt);
      if (this.t > w.nextIdle) {
        w.nextIdle = this.t + this.r(20, 45);
        this.charBark(w, 'idle', 0.7);
      }
    }
    this.updateObjects();
    this.updateHigh5s();

    if (this.phase === 'playing' && this.shiftT >= this.shiftLength) this.endShift();
  }

  // ------------------------------------------------------------- snapshot
  snapshot() {
    const t = this.t;
    const events = this.events; this.events = [];
    const bark = (b) => (b && b.until > t ? b.text : null);
    const q = this.quota;
    return {
      phase: this.phase, day: this.day, t: +t.toFixed(2),
      timeLeft: this.phase === 'playing' ? Math.max(0, this.shiftLength - this.shiftT) : this.shiftLength,
      quota: q,
      spotTypes: this.spotTypes.map((ty, i) => (ty !== this.map.spots[i].type ? [i, ty] : null)).filter(Boolean),
      wardens: [...this.wardens.values()].map((w) => ({
        id: w.id, name: w.name, charId: w.charId, bot: w.bot,
        x: Math.round(w.x), y: Math.round(w.y), f: +w.facing.toFixed(2), moving: w.moving,
        score: w.score, tickets: w.stats.tickets, complaints: w.stats.complaints,
        writing: w.writing ? { carId: w.writing.carId, p: +Math.min(1, w.writing.progress).toFixed(2) } : null,
        cd: Math.max(0, +(w.abilityReadyAt - t).toFixed(1)),
        stunned: w.stunnedUntil > t, dazzled: w.dazzledUntil > t,
        buffs: {
          scrawl: w.buffs.scrawl > t, reveal: w.buffs.reveal > t, tea: w.buffs.tea > t,
          sprint: w.buffs.sprint > t, synergy: w.buffs.synergy > t, veteran: w.buffs.veteran
        },
        h5: w.high5At !== null,
        bark: bark(w.bark)
      })),
      cars: [...this.cars.values()].map((c) => ({
        id: c.id, x: Math.round(c.x), y: Math.round(c.y), o: this.spot(c.spotId).o, spotId: c.spotId,
        len: c.len, van: c.van, color: c.color, model: c.model, plate: c.plate,
        state: c.state, a: c.state === 'leaving' ? +c.anim.toFixed(2) : 1,
        off: this.carOffence(c),
        paid: this.spotTypes[c.spotId] === 'meter' ? this.shiftT <= c.paidUntil : null,
        ticket: c.ticketedBy ? (c.wrongTicket ? 'wrong' : 'ok') : null,
        clamped: c.clampedUntil > t,
        tag: c.tag
      })),
      drivers: [...this.drivers.values()].map((d) => ({
        id: d.id, x: Math.round(d.x), y: Math.round(d.y), shirt: d.shirt, frozen: d.frozenUntil > t, bark: bark(d.bark)
      })),
      objects: [...this.objects.values()].map((o) => ({ id: o.id, type: o.type, x: Math.round(o.x), y: Math.round(o.y), bark: bark(o.bark) })),
      event: this.event ? { id: this.event.id, name: EVENT_BY_ID[this.event.id].name, icon: EVENT_BY_ID[this.event.id].icon, desc: EVENT_BY_ID[this.event.id].desc, left: Math.max(0, Math.ceil(this.event.until - this.shiftT)) } : null,
      radio: this.radio && this.radio.until > t ? this.radio.text : null,
      results: this.results,
      events
    };
  }
}
