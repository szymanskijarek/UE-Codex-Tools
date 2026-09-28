import { describe, expect, it } from 'vitest';
import { dir1000, idiv, isqrt } from '../src/core/math';
import { hash64, Rng } from '../src/core/rng';

describe('integer math', () => {
  it('idiv truncates toward zero', () => {
    expect(idiv(7, 2)).toBe(3);
    expect(idiv(-7, 2)).toBe(-3);
    expect(idiv(0, 5)).toBe(0);
  });

  it('isqrt is exact floor sqrt', () => {
    for (let n = 0; n < 5000; n++) {
      const r = isqrt(n);
      expect(r * r).toBeLessThanOrEqual(n);
      expect((r + 1) * (r + 1)).toBeGreaterThan(n);
    }
    expect(isqrt(2 ** 40)).toBe(2 ** 20);
  });

  it('dir1000 returns ~unit vectors scaled by 1000', () => {
    for (const [x, y] of [
      [3, 4],
      [-100, 7],
      [0, -9],
      [123456, 654321],
    ] as const) {
      const [dx, dy] = dir1000(x, y);
      const len = isqrt(dx * dx + dy * dy);
      expect(Math.abs(len - 1000)).toBeLessThanOrEqual(2);
    }
    expect(dir1000(0, 0)).toEqual([0, 0]);
  });
});

describe('sfc32 PRNG', () => {
  it('is reproducible from a seed', () => {
    const a = Rng.fromSeed('deadbeef');
    const b = Rng.fromSeed('deadbeef');
    for (let i = 0; i < 100; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('produces a known sequence (guards against accidental algorithm changes)', () => {
    const r = Rng.fromSeed('00000000000000000000000000000001');
    expect([r.nextU32(), r.nextU32(), r.nextU32()]).toMatchSnapshot();
  });

  it('forks are independent and do not advance the parent', () => {
    const a = Rng.fromSeed('cafe');
    const before = { ...a.s };
    const f1 = a.fork('ai');
    const f2 = a.fork('env');
    expect(a.s).toEqual(before);
    expect(f1.nextU32()).not.toBe(f2.nextU32());
  });

  it('int() stays in range and chance() respects bounds', () => {
    const r = Rng.fromSeed('1234');
    for (let i = 0; i < 1000; i++) {
      const v = r.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    expect(r.chance(0)).toBe(false);
    expect(r.chance(10000)).toBe(true);
  });

  it('hash64 is stable', () => {
    expect(hash64('career crash')).toBe(hash64('career crash'));
    expect(hash64('a')).not.toBe(hash64('b'));
    expect(hash64('')).toMatch(/^[0-9a-f]{16}$/);
  });
});
