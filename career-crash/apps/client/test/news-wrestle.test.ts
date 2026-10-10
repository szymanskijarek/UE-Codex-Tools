import { describe, expect, it } from 'vitest';
import { ANSWER, bout, judge, landed, pace, resultLine, WRESTLE } from '../src/news/minigames/wrestle/rules';

describe('Wrestle the Bird (Man vs Emu minigame)', () => {
  it('only gets faster and tighter', () => {
    for (let i = 1; i < WRESTLE.attacks; i++) {
      const a = pace(i - 1);
      const b = pace(i);
      expect(b.fallMs).toBeLessThanOrEqual(a.fallMs);
      expect(b.windowMs).toBeLessThanOrEqual(a.windowMs);
      expect(b.gapMs).toBeLessThanOrEqual(a.gapMs);
    }
    expect(pace(0).windowMs).toBe(WRESTLE.windowMs[0]);
    expect(pace(WRESTLE.attacks - 1).windowMs).toBe(WRESTLE.windowMs[1]);
  });

  it('never throws the same attack three times running', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < 50; n++) {
      const b = bout(rand);
      expect(b).toHaveLength(WRESTLE.attacks);
      for (let i = 2; i < b.length; i++) expect(b[i] === b[i - 1] && b[i] === b[i - 2]).toBe(false);
    }
  });

  it('judges a press against the beat', () => {
    const w = 200;
    expect(judge('peck', ANSWER.peck, 0, w)).toBe('perfect');
    expect(judge('kick', 'block', 150, w)).toBe('good');
    expect(judge('kick', 'grab', 0, w)).toBe('wrong');
    expect(judge('slam', 'duck', -300, w)).toBe('early');
    expect(judge('slam', 'duck', -500, w)).toBeNull();
    expect(judge('slam', 'duck', 250, w)).toBe('miss');
    expect(['wrong', 'early', 'miss'].every((v) => landed(v as never))).toBe(true);
    expect(landed('good')).toBe(false);
  });

  it('has a sign-off line for every state of the trousers', () => {
    for (let h = 0; h <= WRESTLE.trousers; h++) expect(resultLine(h).length).toBeLessThanOrEqual(50);
  });
});
