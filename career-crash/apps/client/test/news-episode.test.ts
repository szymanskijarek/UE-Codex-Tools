import { describe, expect, it } from 'vitest';
import { ANCHORS } from '../src/news/cast';
import type { Beat } from '../src/news/episode';
import { beatMs, BSN_OFFICIAL, checkEpisode, cueAt, deskFace, shownText, typeMs, FORMAT, spellsBsn, timeline, type Episode } from '../src/news/episode';
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

  it('desk faces follow the spiral (art brief 01 C)', () => {
    expect(deskFace({ who: 'us', heat: 0, text: '' }, 'us')).toBe('talk');
    expect(deskFace({ who: 'us', heat: 0, text: '' }, 'uk')).toBe('neutral');
    expect(deskFace({ who: 'us', heat: 1, text: '' }, 'us')).toBe('smug');
    expect(deskFace({ who: 'us', heat: 1, text: '' }, 'uk')).toBe('surprised');
    expect(deskFace({ who: 'uk', heat: 1, mood: 'surprised', text: '' }, 'uk')).toBe('surprised');
    expect(deskFace({ who: 'uk', heat: 2, text: '' }, 'us')).toBe('angry');
    expect(deskFace({ who: 'us', heat: 3, text: '' }, 'us')).toBe('lunge');
    expect(deskFace({ who: 'us', heat: 3, text: '' }, 'uk')).toBe('angry');
  });

  it('a rogue chair hurts its target, and only a guest who is there', () => {
    expect(deskFace({ who: 'us', heat: 2, chair: 'us', text: '' }, 'us')).toBe('hurt');
    expect(deskFace({ who: 'us', heat: 2, chair: 'uk', text: '' }, 'uk')).toBe('hurt');
    const bad: Episode = { ...ep, beats: ep.beats.map((b, i) => (i === 1 ? { ...b, chair: 'guest' as const } : b)) };
    expect(checkEpisode(bad, MINIGAMES).join('\n')).toContain("the chair hits a guest who isn't there");
  });

  it('the argument speeds up as it heats, and named pauses land the jokes (10 §4.4)', () => {
    const line = (heat: 0 | 1 | 2 | 3, extra: Partial<Beat> = {}): Beat => ({ who: 'us', heat, text: 'x'.repeat(50), ...extra });
    const gaps = ([0, 1, 2, 3] as const).map((h) => beatMs(line(h)) - typeMs(line(h)));
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]!).toBeLessThan(gaps[i - 1]!);
    expect(beatMs(line(2, { pause: 'beat' }))).toBeGreaterThan(beatMs(line(2)));
    expect(beatMs(line(2, { pause: 'long' }))).toBeGreaterThan(beatMs(line(2, { pause: 'beat' })));
    expect(beatMs(line(2, { pause: 'awkward' }))).toBeGreaterThan(beatMs(line(2, { pause: 'long' })));
    const cut = line(2, { pause: 'cut', text: 'Quick weather break! Paper jams moving in' });
    expect(beatMs(cut)).toBe(typeMs(cut));
    expect(shownText(cut, 99_999).endsWith('—')).toBe(true);
    expect(shownText(cut, 99_999).length).toBeLessThan(cut.text.length);
  });
});
