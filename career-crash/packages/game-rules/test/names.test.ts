import { bundle } from '@cc/content';
import { Rng } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { formatName, isNameParts, partsFromName, randomNameParts, shortName } from '../src/names';

describe('picked names', () => {
  it('formats titles before and after', () => {
    const n = { pre: ['MA', 'BA'], first: 'Andrew', last: 'White', post: ['MD', 'Dog Dad'] };
    expect(formatName(n)).toBe('MA BA Andrew White, MD, Dog Dad');
    expect(isNameParts(bundle, n)).toBe(true);
    expect(shortName(bundle, formatName(n))).toBe('Andrew');
  });

  it('rejects anything not on the lists, repeats and too many titles', () => {
    expect(isNameParts(bundle, { pre: [], first: 'Andrew', last: 'typed text', post: [] })).toBe(false);
    expect(isNameParts(bundle, { pre: ['Dr', 'Dr'], first: 'Andrew', last: 'White', post: [] })).toBe(false);
    expect(isNameParts(bundle, { pre: ['Dr', 'Sir', 'Lord', 'Baron'], first: 'Andrew', last: 'White', post: [] })).toBe(false);
    expect(isNameParts(bundle, { first: 'Andrew', last: 'White' })).toBe(false);
  });

  it('short names skip multi-word titles and keep plain names', () => {
    expect(shortName(bundle, 'His Majesty Dr Priya Patel, PhD')).toBe('Priya');
    expect(shortName(bundle, 'Priya Patel')).toBe('Priya');
  });

  it('no first name doubles as a title (short names stay right)', () => {
    for (const f of bundle.names.first) expect(bundle.names.prefixes).not.toContain(f);
  });

  it('random names are valid; old plain names convert', () => {
    for (let i = 0; i < 50; i++) expect(isNameParts(bundle, randomNameParts(bundle, Rng.fromSeed(`n${i}`), true))).toBe(true);
    expect(partsFromName(bundle, 'Priya Patel')).toEqual({ pre: [], first: 'Priya', last: 'Patel', post: [] });
    expect(partsFromName(bundle, 'Somebody Typed')).toBeNull();
  });
});
