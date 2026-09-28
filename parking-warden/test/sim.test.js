import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, buildMap, offenceFor } from '../shared/sim.js';
import { CHARACTERS } from '../shared/content.js';

function freshGame(charId = 'brenda') {
  const g = new Game({ seed: 123 });
  g.addWarden('me', { name: 'Tester', charId });
  g.startShift();
  return g;
}

// Park a specific car in a spot of the given type, right next to the warden.
function parkAt(g, type, attrs = {}) {
  const spot = g.map.spots.find((s) => g.spotTypes[s.id] === type && !g.spotCar[s.id]);
  const car = g.spawnCar(true);
  g.spotCar[car.spotId] = 0;
  Object.assign(car, { spotId: spot.id, x: spot.x, y: spot.y, state: 'parked', leaveAt: 999, badge: false, permit: false, van: false, paidUntil: 999 }, attrs);
  g.spotCar[spot.id] = car.id;
  const me = g.wardens.get('me');
  me.x = spot.x; me.y = spot.roadC + spot.side * 20;
  if (spot.o === 'v') { me.x = spot.roadC + spot.side * 20; me.y = spot.y; }
  return car;
}

function clearOtherCars(g) { g.cars.clear(); g.spotCar.fill(0); g.drivers.clear(); }

function holdWrite(g, secs) {
  g.setInput('me', { write: true });
  for (let t = 0; t < secs; t += 1 / 30) g.step(1 / 30);
  g.setInput('me', {});
}

test('map is deterministic and has every bay type', () => {
  const a = buildMap(5); const b = buildMap(5);
  assert.deepEqual(a.spots.map((s) => s.type), b.spots.map((s) => s.type));
  assert.ok(a.spots.length > 80);
  const types = new Set(a.spots.map((s) => s.type));
  for (const t of ['meter', 'yellow', 'free', 'resident']) assert.ok(types.has(t), `missing ${t}`);
});

test('parking spots never overlap buildings', () => {
  const m = buildMap(9);
  for (const s of m.spots) {
    for (const b of m.buildings) {
      const inside = s.x > b.x && s.x < b.x + b.w && s.y > b.y && s.y < b.y + b.h;
      assert.ok(!inside, `spot ${s.id} inside building`);
    }
  }
});

test('offence rules', () => {
  assert.equal(offenceFor({}, { type: 'yellow' }, 0), 'yellow');
  assert.equal(offenceFor({}, { type: 'bus' }, 0), 'bus');
  assert.equal(offenceFor({ badge: true }, { type: 'disabled' }, 0), null);
  assert.equal(offenceFor({ badge: false }, { type: 'disabled' }, 0), 'disabled');
  assert.equal(offenceFor({ van: true }, { type: 'loading' }, 0), null);
  assert.equal(offenceFor({ paidUntil: 10 }, { type: 'meter' }, 5), null);
  assert.equal(offenceFor({ paidUntil: 10 }, { type: 'meter' }, 11), 'meter');
  assert.equal(offenceFor({}, { type: 'free' }, 0), null);
});

test('ticketing an offender scores points', () => {
  const g = freshGame(); clearOtherCars(g);
  const car = parkAt(g, 'yellow');
  holdWrite(g, 1.6);
  const me = g.wardens.get('me');
  assert.equal(car.ticketedBy, 'me');
  assert.equal(me.score, 1);
  assert.equal(me.stats.tickets, 1);
});

test('ticketing a legal car earns a complaint', () => {
  const g = freshGame(); clearOtherCars(g);
  const car = parkAt(g, 'free');
  g.wardens.get('me').score = 3;
  holdWrite(g, 1.6);
  const me = g.wardens.get('me');
  assert.equal(car.wrongTicket, true);
  assert.equal(me.score, 2);
  assert.equal(me.stats.complaints, 1);
});

test('moving interrupts writing', () => {
  const g = freshGame(); clearOtherCars(g);
  const car = parkAt(g, 'bus');
  g.setInput('me', { write: true });
  for (let i = 0; i < 20; i++) g.step(1 / 30);
  g.setInput('me', { write: true, left: true });
  g.step(1 / 30);
  assert.equal(g.wardens.get('me').writing, null);
  assert.equal(car.ticketedBy, null);
});

test('every character ability runs without throwing', () => {
  for (const ch of CHARACTERS) {
    const g = new Game({ seed: 3 });
    g.addWarden('me', { charId: ch.id });
    g.addBot();
    g.startShift();
    parkAt(g, 'meter', { paidUntil: 999 });
    const bot = [...g.wardens.values()].find((w) => w.bot);
    const me = g.wardens.get('me');
    bot.x = me.x + 20; bot.y = me.y; bot.score = 2;
    assert.doesNotThrow(() => g.useAbility('me'), ch.id);
    for (let i = 0; i < 30; i++) g.step(1 / 30);
  }
});

test('abilities respect cooldowns', () => {
  const g = freshGame('barry');
  assert.equal(g.useAbility('me'), true);
  assert.equal(g.useAbility('me'), false);
  for (let i = 0; i < 13 * 30; i++) g.step(1 / 30);
  assert.equal(g.useAbility('me'), true);
});

test('meter whisperer expires nearby meters', () => {
  const g = freshGame('maureen'); clearOtherCars(g);
  const car = parkAt(g, 'meter', { paidUntil: 999 });
  assert.equal(g.carOffence(car), null);
  g.useAbility('me');
  assert.equal(g.carOffence(car), 'meter');
});

test('mutual high-five scores; a lonely one is logged', () => {
  const g = new Game({ seed: 1 });
  g.addWarden('a', { charId: 'kevin' });
  g.addWarden('b', { charId: 'sandra' });
  g.startShift();
  const [a, b] = [g.wardens.get('a'), g.wardens.get('b')];
  b.x = a.x + 30; b.y = a.y;
  g.high5('a'); g.step(0.2); g.high5('b');
  assert.equal(a.score, 1); assert.equal(b.score, 1);
  assert.equal(a.stats.high5s, 1);
  g.high5('a');
  for (let i = 0; i < 60; i++) g.step(1 / 30);
  assert.equal(a.stats.hanging, 1);
});

test('a full bot shift ends with results and awards', () => {
  const g = new Game({ seed: 77 });
  for (let i = 0; i < 3; i++) g.addBot();
  g.startShift();
  let guard = 0;
  while (g.phase === 'playing' && guard++ < 200 * 30) g.step(1 / 30);
  assert.equal(g.phase, 'ended');
  const r = g.results;
  assert.equal(r.rows.length, 3);
  assert.ok(r.team > 0, 'bots should write at least some tickets');
  assert.ok(r.awards.some((a) => a.title === 'Warden of the Shift'));
  g.startShift();
  assert.equal(g.day, 2);
  assert.equal(g.quota, 21);
});

test('snapshot is JSON-serialisable and drains events', () => {
  const g = freshGame();
  for (let i = 0; i < 30; i++) g.step(1 / 30);
  const s = g.snapshot();
  assert.ok(JSON.stringify(s).length > 100);
  assert.equal(g.snapshot().events.length, 0);
});
