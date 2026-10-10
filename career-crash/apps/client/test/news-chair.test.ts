import { describe, expect, it } from 'vitest';
import { BROCK, PROPS, ROOMS, START, WALLS, WORLD } from '../src/news/minigames/chair/map';
import { CHAIR, newChair, resultLine, step } from '../src/news/minigames/chair/rules';

const AWAY = { x: -1e6, y: -1e6, r: 1 };
const run = (s: ReturnType<typeof newChair>, input: Parameters<typeof step>[1], secs: number, solids: typeof WALLS = []) => {
  const evs = [];
  for (let t = 0; t < secs; t += 1 / 120) evs.push(step(s, input, 1 / 120, solids, AWAY));
  return evs;
};

describe('Spinning With Intent (Chairs Recalled minigame)', () => {
  it('keeps rolling after you stop pushing (inertia), and slows down by itself', () => {
    const s = newChair(0, 0, 0);
    run(s, { dx: 0, dy: 0, thrust: true }, 1);
    const v1 = s.vx;
    expect(v1).toBeGreaterThan(400);
    run(s, { dx: 0, dy: 0, thrust: false }, 0.5);
    expect(s.vx).toBeGreaterThan(v1 * 0.5);
    expect(s.vx).toBeLessThan(v1);
  });

  it('turns towards the steering at a fixed rate, while still sliding the old way', () => {
    const s = newChair(0, 0, 0);
    run(s, { dx: 0, dy: 0, thrust: true }, 0.8);
    run(s, { dx: 0, dy: 1, thrust: false }, 0.1);
    expect(s.angle).toBeCloseTo(CHAIR.turn * 0.1, 1);
    expect(s.vx).toBeGreaterThan(Math.abs(s.vy));
    run(s, { dx: 0, dy: 1, thrust: false }, 1);
    expect(s.angle).toBeCloseTo(Math.PI / 2, 2);
  });

  it('a hard hit costs integrity and bounces back; a gentle one is free', () => {
    const wall = [{ x: 200, y: -500, w: 40, h: 1000 }];
    const soft = newChair(150, 0, 0);
    soft.vx = 100;
    run(soft, { dx: 0, dy: 0, thrust: false }, 1, wall);
    expect(soft.hp).toBe(CHAIR.hp);
    const hard = newChair(0, 0, 0);
    hard.vx = 600;
    const evs = run(hard, { dx: 0, dy: 0, thrust: false }, 1, wall);
    expect(hard.hp).toBeLessThan(CHAIR.hp - 20);
    expect(hard.vx).toBeLessThan(0);
    expect(evs.some((e) => e.damage > 0)).toBe(true);
    expect(hard.x).toBeLessThanOrEqual(200 - CHAIR.r + 0.01);
  });

  it('knocks Brock over only when it arrives fast', () => {
    const until = (s: ReturnType<typeof newChair>) => {
      for (let t = 0; t < 2; t += 1 / 120) {
        const b = step(s, { dx: 0, dy: 0, thrust: false }, 1 / 120, [], BROCK).brock;
        if (b) return b;
      }
    };
    const fast = newChair(BROCK.x + 300, BROCK.y, Math.PI);
    fast.vx = -500;
    expect(until(fast)).toBe('hit');
    const slow = newChair(BROCK.x + 120, BROCK.y, Math.PI);
    slow.vx = -120;
    expect(until(slow)).toBe('bump');
  });

  it('the building: start and Brock are clear of everything, inside the walls, and in their rooms', () => {
    const inside = (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }, pad = 0) => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;
    for (const p of [START, BROCK]) {
      expect(p.x > 0 && p.x < WORLD.w && p.y > 0 && p.y < WORLD.h).toBe(true);
      for (const r of [...WALLS, ...PROPS]) expect(inside(p, r, CHAIR.r)).toBe(false);
    }
    expect(inside(START, ROOMS.find((r) => r.name === 'PROPS STORE')!)).toBe(true);
    expect(inside(BROCK, ROOMS.find((r) => r.name === 'STUDIO 1')!)).toBe(true);
  });

  it('there is a way through: the chair fits from the props store to Brock', () => {
    // Flood-fill the floor on a 20-unit grid, keeping the chair's whole radius clear of anything solid.
    const cell = 20, cols = WORLD.w / cell, rows = WORLD.h / cell;
    const free = (x: number, y: number) =>
      [...WALLS, ...PROPS].every((r) => Math.hypot(x - Math.max(r.x, Math.min(x, r.x + r.w)), y - Math.max(r.y, Math.min(y, r.y + r.h))) >= CHAIR.r);
    const seen = new Set<number>();
    const queue = [Math.round(START.y / cell) * cols + Math.round(START.x / cell)];
    let reached = false;
    while (queue.length && !reached) {
      const i = queue.pop()!;
      if (seen.has(i)) continue;
      seen.add(i);
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      if (Math.hypot(x - BROCK.x, y - BROCK.y) < CHAIR.r + BROCK.r + cell) reached = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx * cell, ny = y + dy * cell;
        if (nx > 0 && ny > 0 && nx < WORLD.w && ny < WORLD.h && free(nx, ny)) queue.push((ny / cell) * cols + nx / cell);
      }
    }
    expect(reached).toBe(true);
    expect(rows).toBeGreaterThan(0);
  });

  it('has a short sign-off line for every ending', () => {
    for (const [won, hp] of [[false, 0], [true, 100], [true, 60], [true, 10]] as const) expect(resultLine(won, hp, 23.4).length).toBeLessThanOrEqual(50);
  });
});
