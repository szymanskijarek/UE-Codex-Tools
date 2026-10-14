import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { agencyTemp, answerGig, difficulty, expireGigs, fireBeat, gigFighters, ladderOpponents, ladderSize, makeFriend, newStory, offerGig, progressDue, replyTo, rollGig, stageInfo, tempCost, uiDue, type StoryCtx } from '../src';

const ctx = (over: Partial<StoryCtx> = {}): StoryCtx => ({ seed: 's', fights: 0, stage: 0, cash: 300, slots: { first: 'Sam', me: 'Sam Lee', company: 'Acme' }, ...over });
const statSum = (c: { c: { stats: Record<string, number> } }) => Object.values(c.c.stats).reduce((a, b) => a + b, 0);

describe('ladder sizes (12 §5)', () => {
  it('every stage has 1 to 3 interviewers, the boss counted, and the first stages are 2v2', () => {
    for (let st = 0; st < 60; st++) {
      const n = ladderSize(bundle, st);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
      const team = ladderOpponents(bundle, 'seed', st, difficulty('normal'));
      expect(team).toHaveLength(n);
      if (stageInfo(bundle, st).boss && stageInfo(bundle, st).bossCareer) expect(team[0]!.c.careers).toContain(stageInfo(bundle, st).bossCareer);
    }
    expect([ladderSize(bundle, 0), ladderSize(bundle, 1)]).toEqual([2, 2]);
  });

  it('a lone interviewer is stronger than one on a panel', () => {
    const solo = Array.from({ length: 60 }, (_, i) => i).find((st) => ladderSize(bundle, st) === 1 && !stageInfo(bundle, st).boss && st >= 8)!;
    const one = ladderOpponents(bundle, 'x', solo, difficulty('normal'))[0]!;
    const panelStage = Array.from({ length: 60 }, (_, i) => i).find((st) => ladderSize(bundle, st) === 3 && !stageInfo(bundle, st).boss && Math.abs(st - solo) <= 4)!;
    const panel = ladderOpponents(bundle, 'x', panelStage, difficulty('normal'))[1]!;
    expect(one.c.level - stageInfo(bundle, solo).level).toBeGreaterThan(panel.c.level - stageInfo(bundle, panelStage).level);
  });
});

describe('temps (12 §6.1)', () => {
  it('are weaker than the friend at the same level: lower level, fewer skills, fewer stat points, nothing packed', () => {
    for (let i = 0; i < 20; i++) {
      const t = agencyTemp(bundle, `t${i}`, 0, 8);
      const f = makeFriend(bundle, `t${i}`, 'career.teacher', 8, 3);
      expect(t.temp).toBe(true);
      expect(t.c.level).toBe(8 + bundle.economy.temps.levelOffset);
      expect(t.loadout).toEqual([]);
      expect(t.nodes.length).toBeLessThan(f.nodes.length + 1);
      expect(statSum(t)).toBeLessThan(statSum(f));
    }
    expect(tempCost(bundle, 5)).toBeGreaterThan(tempCost(bundle, 0));
  });
});

describe('story beats (12 §4)', () => {
  it('fire once, in order, and replies lead on', () => {
    const st = newStory(makeFriend(bundle, 's', 'career.teacher', 1, 1));
    const first = uiDue(bundle, st);
    expect(first.map((b) => b.id)).toEqual(['story.ch1-01-hello']);
    fireBeat(bundle, st, first[0]!, ctx());
    expect(fireBeat(bundle, st, first[0]!, ctx())).toEqual([]);
    expect(st.threads['contact.friend']!.lines.length).toBe(3);
    const r = replyTo(bundle, st, 'contact.friend', 1, ctx());
    expect(r.beat?.id).toBe('story.ch1-02-network');
    expect(st.flags).toEqual(['friend.cold']);
    expect(r.effects.map((e) => e.kind).sort()).toEqual(['post', 'starterFeed']);
    expect(replyTo(bundle, st, 'contact.friend', 0, ctx()).beat).toBeUndefined();
    expect(progressDue(bundle, st, { fights: 9, stage: 9, cash: 0 })).toEqual([]);
  });
});

describe('gigs (12 §8.2)', () => {
  it('come after the first few fights, one open at a time, and can be answered once', () => {
    const st = newStory();
    st.unlocks.push('easyApply');
    expect(rollGig(bundle, st, ctx({ fights: 1, stage: 9 }))).toBeNull();
    let offered = null;
    for (let f = 4; f < 40 && !offered; f++) offered = rollGig(bundle, st, ctx({ fights: f, stage: 9 }));
    expect(offered).not.toBeNull();
    offerGig(bundle, st, offered!, ctx({ fights: 10 }));
    expect(rollGig(bundle, st, ctx({ fights: 30, stage: 9 }))).toBeNull();
    expect(answerGig(bundle, st, offered!.id, false, ctx())).toBe(true);
    expect(answerGig(bundle, st, offered!.id, true, ctx())).toBe(false);
  });

  it('lapse if left open', () => {
    const st = newStory();
    const g = bundle.gigs[0]!;
    offerGig(bundle, st, g, ctx({ fights: 5 }));
    expect(st.threads[g.id]!.lines.some((l) => l.text.includes(String(g.pay.win)))).toBe(true);
    expect(st.threads[g.id]!.lines.some((l) => l.text.includes('{'))).toBe(false);
    expect(st.threads[g.id]!.gig!.state).toBe('open');
    expect(st.threads[g.id]!.lines.at(-1)!.text).not.toContain('expired');
    expect(st.threads[g.id]!.gig!.state).toBe('open');
    expect(st.threads[g.id]!.gig!.fight).toBe(5);
    expireGigs(bundle, st, 5 + bundle.economy.gigs.expiresAfter);
    expect(st.threads[g.id]!.gig!.state).toBe('expired');
  });

  it('field their own named cast with personas', () => {
    for (const g of bundle.gigs) {
      const opp = gigFighters(bundle, 's', g, 'opponents', 6, 2);
      expect(opp.map((c) => c.name)).toEqual(g.opponents.map((o) => o.name));
      opp.forEach((c, i) => expect(c.careers).toEqual([g.opponents[i]!.career]));
      if (g.side === 'cast') expect(gigFighters(bundle, 's', g, 'allies', 6, 2)).toHaveLength(g.allies!.length);
    }
  });
});
