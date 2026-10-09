import { describe, expect, it } from 'vitest';
import { ANCHORS } from '../src/news/cast';
import { BSN_OFFICIAL, checkEpisode, cueAt, FORMAT, spellsBsn, timeline, type Episode } from '../src/news/episode';
import { EPISODES } from '../src/news/episodes';
import pilot from '../src/news/episodes/2026-w41-printers.json';

const MINIGAMES = ['test-card'];
const ep = pilot as Episode;

describe('Broken News episodes (10 §4)', () => {
  it('the pilot follows the format', () => {
    expect(checkEpisode(ep, MINIGAMES)).toEqual([]);
  });

  it('runs ident, desk, brawl, standby, hand-off in order, under a minute', () => {
    const { cues, totalMs } = timeline(ep);
    expect(cues.map((c) => c.phase).filter((p, i, a) => p !== a[i - 1])).toEqual(['ident', 'desk', 'brawl', 'standby', 'handoff']);
    expect(totalMs).toBeLessThanOrEqual(FORMAT.maxMs);
    expect(cueAt(cues, 0).phase).toBe('ident');
    expect(cueAt(cues, totalMs + 5000).phase).toBe('handoff');
  });

  it('catches a script that cools down, overruns or skips the swing', () => {
    const bad: Episode = {
      ...ep,
      beats: [
        { who: 'us', heat: 1, text: 'x' },
        { who: 'uk', heat: 2, text: 'x'.repeat(400) },
        { who: 'guest', heat: 1, text: 'x' },
        { who: 'us', heat: 2, text: 'x'.repeat(400) },
        ...Array.from({ length: 10 }, () => ({ who: 'uk' as const, heat: 2 as const, text: 'x'.repeat(200) })),
      ],
      guest: { ...ep.guest!, enters: 5 },
      brawl: { seconds: 12 },
      minigame: 'nope',
    };
    const p = checkEpisode(bad, MINIGAMES).join('\n');
    for (const want of ['heat 0', 'heat 3', 'cools down', 'before walking on', 'brawl must last', 'unknown minigame', 'over the 60 s limit']) expect(p).toContain(want);
  });

  it('every episode file follows the format', () => {
    for (const e of EPISODES) expect([e.id, checkEpisode(e, MINIGAMES)]).toEqual([e.id, []]);
  });

  it('BSN never means the same thing twice (10 §3.4)', () => {
    for (const p of [BSN_OFFICIAL, ...Object.values(ANCHORS).map((a) => a.bsn), 'Bureau of Selective Narratives', 'Brawling Since Nineteen-something']) expect([p, spellsBsn(p)]).toEqual([p, true]);
    for (const p of ['British Broadcasting Corporation', 'Bad News', 'Big Shouty Network Now']) expect([p, spellsBsn(p)]).toEqual([p, false]);
    const used = [BSN_OFFICIAL, ...Object.values(ANCHORS).map((a) => a.bsn), ...EPISODES.flatMap((e) => [e.bsn, e.guest?.bsn ?? []].flat())].map((x) => x.toLowerCase());
    expect(used.length).toBe(new Set(used).size);
  });
});
