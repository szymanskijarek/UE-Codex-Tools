import { bundle } from '@cc/content';
import { jobTitle, makeOffer, milestonesCrossed } from '@cc/game-rules';
import { describe, expect, it } from 'vitest';
import { acceptOffer, career, draftCharacter, mainChar, save, skipIntro, startCareer, storyCtx, type CareerSave } from '../src/career/model';
import { nextUps } from '../src/career/progress';
import { milestonePost, titlePost } from '../src/career/feed';

const cur = (): CareerSave => career.value!;

function newCareer(): void {
  const careerId = bundle.careers.find((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated)!.id;
  startCareer(draftCharacter('progress-test', careerId), 'normal', { adjective: 0, noun: 0, suffix: 0 } as never);
  skipIntro(cur());
}

function withOffer(chapter: number): string {
  const s = structuredClone(cur());
  const recruit = { ...mainChar(s).c, id: `offer-test-${chapter}`, name: 'Offer Hire' };
  makeOffer(bundle, s.story!, chapter, recruit, storyCtx(s));
  save(s);
  return `offer.ch${chapter}`;
}

describe('career progress (12 §7)', () => {
  it('titles step up a chapter at a time and stick at the top', () => {
    const t = bundle.economy.progress.titles;
    expect(jobTitle(bundle, 0)).toBe(t[0]);
    expect(jobTitle(bundle, 4)).toBe(t[1]);
    expect(jobTitle(bundle, 999)).toBe(t[t.length - 1]);
  });

  it('an offer letter gives one choice, once: the bonus, a perk of guaranteed rarity, or a free hire', () => {
    newCareer();
    const id = withOffer(1);
    const t = cur().story!.threads[id]!;
    expect(t.offer!.choices.map((c) => c.kind)).toEqual(['cash', 'perk', 'hire']);
    expect(t.lines.some((l) => l.art === 'offer-letter')).toBe(true);
    const cash = cur().cash;
    expect(acceptOffer(cur(), id, 0).ok).toBe(true);
    expect(cur().cash).toBe(cash + bundle.economy.progress.offers.cashPerChapter);
    expect(acceptOffer(cur(), id, 1).ok).toBe(false);
    expect(cur().feed![0]!.id).toBe('title-1');

    const perkId = withOffer(2);
    const bag = cur().bag?.length ?? 0;
    expect(acceptOffer(cur(), perkId, 1).ok).toBe(true);
    const item = cur().bag![bag]!;
    const order = ['normal', 'uncommon', 'rare', 'epic', 'legendary'];
    expect(order.indexOf(item.rarity)).toBeGreaterThanOrEqual(order.indexOf(bundle.economy.progress.offers.perkAtLeast));

    const hireId = withOffer(3);
    expect(acceptOffer(cur(), hireId, 2).ok).toBe(true);
    expect(cur().chars['offer-test-3']).toBeDefined();
  });

  it('"Next up" names what opens next and the coming final interview', () => {
    newCareer();
    const items = nextUps(cur(), 5);
    expect(items.length).toBeGreaterThan(1);
    expect(items.some((x) => x.text.includes('Agency temps opens in 2 fights'))).toBe(true);
    expect(items.some((x) => x.text.startsWith('Final interview'))).toBe(true);
  });

  it('milestones are crossed once, and have their own posts', () => {
    expect(milestonesCrossed(bundle, 40, 120)).toEqual([50, 100]);
    expect(milestonesCrossed(bundle, 120, 130)).toEqual([]);
    newCareer();
    expect(milestonePost(cur(), 100).text).toContain('100');
    expect(titlePost(cur(), 'Associate', 1).text).toContain('Associate');
  });

  it('the first stages pay extra XP', () => {
    expect(bundle.economy.progress.earlyXp.bp).toBeGreaterThan(10000);
    expect(bundle.economy.progress.earlyXp.stages).toBeGreaterThan(0);
  });
});
