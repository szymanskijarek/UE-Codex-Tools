import { bundle } from '@cc/content';
import { hasUnlock, stageInfo } from '@cc/game-rules';
import { describe, expect, it } from 'vitest';
import { career, draftCharacter, replyStory, save, skipIntro, startCareer, storyProgress, type CareerSave } from '../src/career/model';
import { fightPosts } from '../src/career/feed';
import { VOICE } from '../src/news/voice';

const cur = (): CareerSave => career.value!;

function at(stage: number): void {
  const s = structuredClone(cur());
  s.stage = stage;
  s.wins = stage;
  s.story!.fights = Math.max(s.story!.fights, stage);
  s.cash = 5000;
  storyProgress(s);
}

describe('career story chapters 2–4 and the cameos (12 §8)', () => {
  it('Broken News characters keep their voice: Brock and Bev pass the voice checks, Kevin never speaks', () => {
    const who: Record<string, string> = { 'contact.brock': 'brock', 'contact.bev': 'bev', 'contact.kevin': 'kevin' };
    for (const b of bundle.story) {
      const v = VOICE[who[b.contact] ?? ''];
      if (!v) continue;
      const lines = [...b.lines.flat(), ...b.effects.flatMap((e) => (e.kind === 'post' ? e.lines : []))];
      for (const l of lines) for (const r of v.rules) expect(r.test(l, 0), `${b.id}: ${v.name} ${r.why}: "${l}"`).toBe(false);
    }
  });

  it('chapter 2: Gavin pitches with a trading-floor link, Bev opens BSN, Brock runs your quote', () => {
    const careerId = bundle.careers.find((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated)!.id;
    startCareer(draftCharacter('chapters-test', careerId), 'normal', { adjective: 0, noun: 0, suffix: 0 } as never);
    skipIntro(cur());
    at(5);
    expect(cur().story!.threads['contact.gavin']).toBeDefined();
    replyStory(cur(), 'contact.gavin', 1);
    expect(cur().story!.threads['contact.gavin']!.lines.some((l) => l.link === 'crypto')).toBe(true);
    expect(cur().story!.gates).not.toContain('news');
    at(6);
    expect(cur().story!.gates).toContain('news');
    expect(cur().feed!.some((p) => p.author === 'Bev Fizzwilliam' && p.link)).toBe(true);
    at(8);
    replyStory(cur(), 'contact.brock', 1);
    const post = cur().feed!.find((p) => p.author === 'Brock Stetson Jr.')!;
    expect(post.text).toContain("I'd do it again.");
    expect(post.text).toContain(stageInfo(bundle, 7).bossName!);
    expect(post.text).not.toContain('{');
  });

  it('chapter 3: the delegate opens nationality and the Summit posts; Kevin types forever', () => {
    expect(hasUnlock(cur().story!, 'nationality')).toBe(false);
    const before = fightPosts(cur(), { stage: 8, outcome: 'win', cash: 0, pay: {}, board: [], growth: [] } as never);
    expect(before.some((p) => p.by === 'delegate')).toBe(false);
    at(9);
    expect(hasUnlock(cur().story!, 'nationality')).toBe(true);
    expect(cur().story!.gates).toContain('delegate');
    expect(cur().story!.threads['contact.delegate']!.name).not.toContain('{');
    at(10);
    const kevin = cur().story!.threads['contact.kevin']!;
    expect(kevin.typing).toBe(true);
    expect(kevin.lines.every((l) => l.text.startsWith('('))).toBe(true);
  });

  it('chapter 4: the friend comes back from the DAO as a free hire', () => {
    const friend = cur().story!.friend!;
    at(13);
    replyStory(cur(), 'contact.friend', 0);
    expect(cur().chars[friend.c.id]).toBeDefined();
    expect(cur().feed!.some((p) => p.art === 'rugpull-card')).toBe(true);
  });

  it('Karen names the boss you just beat, not the next one', () => {
    const careerId = bundle.careers.find((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated)!.id;
    startCareer(draftCharacter('karen-test', careerId), 'normal', { adjective: 0, noun: 0, suffix: 0 } as never);
    skipIntro(cur());
    const s = structuredClone(cur());
    s.story!.fights = 4;
    save(s);
    at(4);
    const karen = cur().story!.threads['contact.karen']!;
    expect(karen.lines.some((l) => l.text.includes(stageInfo(bundle, 3).bossName!))).toBe(true);
  });
});
