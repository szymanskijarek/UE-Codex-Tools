import { describe, expect, it } from 'vitest';
import { ANCHORS, FIELD } from '../src/news/cast';
import type { Beat } from '../src/news/episode';
import { BLEEP, bleepsAt, beatMs, shotOf, BSN_OFFICIAL, checkEpisode, cueAt, deskFace, shownText, typeMs, FORMAT, spellsBsn, timeline, type Episode } from '../src/news/episode';
import { EPISODES, ON_AIR, pickEpisode } from '../src/news/episodes';
import { voiceFlags } from '../src/news/voice';
import pilot from '../src/news/episodes/2026-w41-printers.json';

const MINIGAMES = ['test-card', 'wrestle', 'chair'];
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

  it('everyone stays in character (cast bible 11 §10)', () => {
    for (const e of EPISODES) expect([e.id, voiceFlags(e)]).toEqual([e.id, []]);
    const slips: Episode = {
      ...ep,
      guest: { name: 'Kevin', role: 'The Intern', career: 'career.intern', enters: 0, art: 'kevin' },
      beats: [
        { who: 'uk', heat: 1, text: 'The only casualty was a pair of pants.' },
        { who: 'us', heat: 1, text: 'Thank you, Philippa Featherstonehaugh.' },
        { who: 'guest', heat: 1, text: 'Can I just say something?' },
        { who: 'guest', heat: 1, text: '(picks up the light)' },
        { who: 'uk', heat: 2, text: 'Brock, you idiot.' },
        { who: 'uk', heat: 2, text: 'Pants. On purpose.', offVoice: 'quoting Brock' },
      ],
    };
    const f = voiceFlags(slips).join('\n');
    for (const want of ['line 1: Philippa is British', 'line 2: Brock never gets her surname right', 'line 3: Kevin never speaks', 'line 5: Philippa is never cruel']) expect(f).toContain(want);
    expect(f).not.toMatch(/line [46]:/);
  });

  it('only episodes on air are offered, but any one plays by id', () => {
    expect(ON_AIR.every((e) => e.active !== false)).toBe(true);
    expect(ON_AIR[0]).toBe(pickEpisode(''));
    const off = EPISODES.find((e) => e.active === false);
    if (off) expect(pickEpisode(`?ep=${off.id}`)).toBe(off);
  });

  it('BSN never means the same thing twice (10 §3.4)', () => {
    for (const p of [BSN_OFFICIAL, ...Object.values(ANCHORS).map((a) => a.bsn), 'Bureau of Selective Narratives', 'Brawling Since Nineteen-something']) expect([p, spellsBsn(p)]).toEqual([p, true]);
    for (const p of ['British Broadcasting Corporation', 'Bad News', 'Big Shouty Network Now']) expect([p, spellsBsn(p)]).toEqual([p, false]);
    const used = [BSN_OFFICIAL, ...Object.values(ANCHORS).map((a) => a.bsn), ...Object.values(FIELD).map((r) => r.bsn), ...EPISODES.flatMap((e) => [e.bsn, e.guest?.bsn ?? []].flat())].map((x) => x.toLowerCase());
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

  it('field reports: the camera follows who talks to whom, and the field rules hold (10 §13)', () => {
    const storm = EPISODES.find((e) => e.id === '2026-w41-storm-gerald')!;
    const shots = storm.beats.map((_, i) => shotOf(storm, i));
    expect(shots.slice(0, 3)).toEqual(['split', 'split', 'field']);
    expect(shots[shots.length - 1]).toBe('desk');
    expect(shotOf(ep, 0)).toBe('desk');
    const bad: Episode = { ...storm, beats: storm.beats.map((b, i) => (i === 0 ? { ...b, pause: 'delay' as const, who: 'us' as const } : i === 1 ? { ...b, who: 'uk' as const } : b)) };
    expect(checkEpisode(bad, MINIGAMES).join('\n')).toContain('satellite delay needs the reporter');
    const early: Episode = { ...storm, field: { ...storm.field!, enters: 5 } };
    expect(checkEpisode(early, MINIGAMES).join('\n')).toContain('before the throw');
  });

  it('the cast bible\'s devices: Jeff off screen, his drops, bleeps (11 §3–4)', () => {
    // Jeff's drop lands on Brock (only Brock), and holds the line long enough to read.
    const drop: Beat = { who: 'us', heat: 1, text: 'Thirty years and never', drop: 'light' };
    expect(deskFace(drop, 'us')).toBe('hurt');
    expect(deskFace(drop, 'uk')).not.toBe('hurt');
    expect(beatMs(drop)).toBeGreaterThanOrEqual(FORMAT.chairBeatMs);
    // Jeff never moves the camera.
    const toast = EPISODES.find((e) => e.id === '2026-w41-toasters')!;
    const withJeff: Episode = { ...toast, beats: [...toast.beats.slice(0, 2), { who: 'jeff', heat: 0, text: 'Sorry!' }, ...toast.beats.slice(2)] };
    expect(shotOf(withJeff, 2)).toBe(shotOf(withJeff, 1));
    // A drop needs Brock in the shot; Jeff is never on screen.
    const bad: Episode = { ...toast, beats: toast.beats.map((b, i) => (i === 1 ? { ...b, drop: 'light' as const } : i === 2 ? { ...b, photobomb: 'jeff' } : b)) };
    const p = checkEpisode(bad, MINIGAMES).join('\n');
    expect(p).toContain('a drop needs the desk shot');
    expect(p).toContain('Jeff is never on screen');
    // A bleep is a censor bar on screen, timed where the word falls.
    const bev: Beat = { who: 'field', heat: 1, text: 'It has a {bleep}.' };
    expect(shownText(bev, 99_999)).toBe(`It has a ${BLEEP}.`);
    expect(bleepsAt(bev)).toHaveLength(1);
    expect(bleepsAt(bev)[0]!).toBeGreaterThan(0.5);
    expect(checkEpisode({ ...toast, beats: toast.beats.map((b, i) => (i === 2 ? { ...b, text: 'a {beep}' } : b)) }, MINIGAMES).join('\n')).toContain('unknown {…} tag');
  });
});
