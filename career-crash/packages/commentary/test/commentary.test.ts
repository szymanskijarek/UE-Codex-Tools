import { bundle } from '@cc/content';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, type BattleInput } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/index';

function input(seed: string): BattleInput {
  const rng = Rng.fromSeed(seed);
  const team = (id: string) => ({ playerId: id, playerName: `Team ${id}`, rating: 1000, characters: [0, 1, 2].map((i) => toSnapshot(generateRecruit(bundle, rng, `${id}${i}`))) });
  return { schemaVersion: 1, contentHash: bundle.hash, simVersion: SIM_VERSION, seed, arenaId: 'arena.supermarket', mode: 'duel_3v3', teams: [team('A'), team('B')], modifiers: [] };
}

describe('commentary', () => {
  it('is deterministic for the same battle', () => {
    const i = input('c1');
    const out = simulate(i, bundle);
    expect(buildReport(bundle, i, out)).toEqual(buildReport(bundle, i, simulate(i, bundle)));
  });

  it('produces a headline and fills every template slot', () => {
    let headlines = 0;
    for (let k = 0; k < 20; k++) {
      const i = input(`c-${k}`);
      const rep = buildReport(bundle, i, simulate(i, bundle));
      if (rep.headline) headlines++;
      for (const m of [rep.headline, ...rep.highlights]) if (m) expect(m.text).not.toMatch(/\{\w+\}/);
      expect(rep.lines).toHaveLength(6);
    }
    expect(headlines).toBeGreaterThan(15);
  });
});

describe('live commentary', () => {
  it('produces a steady, fully-filled feed and is deterministic', async () => {
    const { LiveCommentator } = await import('../src/live');
    for (let k = 0; k < 10; k++) {
      const i = input(`live-${k}`);
      const out = simulate(i, bundle);
      const a = new LiveCommentator(bundle, i).consume(out.events, out.events);
      const b = new LiveCommentator(bundle, i).consume(out.events, out.events);
      expect(a).toEqual(b);
      const seconds = out.result.ticks / 20;
      expect(a.length).toBeGreaterThan(seconds / 4);
      for (const l of a) expect(l.text).not.toMatch(/\{\w+\}/);
      expect(a.some((l) => l.importance === 3)).toBe(true);
    }
  });

  it('every bark and live template kind referenced by the client exists', () => {
    for (const k of ['bark_hurt', 'bark_attack', 'bark_ko_win', 'bark_ally_down', 'bark_burning', 'bark_panic', 'bark_win', 'intro', 'ko', 'ability', 'end_win']) {
      expect(bundle.live[k]?.length, k).toBeGreaterThan(0);
    }
  });
});
