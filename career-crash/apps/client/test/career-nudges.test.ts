import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { career, draftCharacter, mainChar, skipIntro, startCareer, storyNudges, type CareerSave } from '../src/career/model';

const cur = (): CareerSave => career.value!;

describe('nudges (12 §8.3)', () => {
  it('the coach nags about unspent points and the store pushes a snack after a loss, each with a button, and both wait out their cooldowns', () => {
    const careerId = bundle.careers.find((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated)!.id;
    startCareer(draftCharacter('nudge-test', careerId), 'normal', { adjective: 0, noun: 0, suffix: 0 } as never);
    skipIntro(cur());
    const s = structuredClone(cur());
    s.cash = 1000;
    mainChar(s).c.unspentPoints = 3;
    mainChar(s).nodes = mainChar(s).nodes.slice(0, 1);
    const st = s.story!;
    let coach = false;
    let store = false;
    for (let f = 10; f < 40 && !(coach && store); f++) {
      st.fights = f;
      storyNudges(s, st, 'loss');
      coach ||= !!st.threads['contact.coach'];
      store ||= !!st.threads['contact.store'];
    }
    expect(coach && store).toBe(true);
    const c = st.threads['contact.coach']!;
    expect(c.lines.some((l) => l.action?.to === 'skills' && l.action.id === mainChar(s).c.id)).toBe(true);
    expect(c.lines.every((l) => !l.text.includes('{'))).toBe(true);
    const shop = st.threads['contact.store']!;
    expect(shop.lines.some((l) => l.action?.to === 'shop')).toBe(true);
    expect(shop.lines.some((l) => /💵 \d+/.test(l.text))).toBe(true);
    // Cooldown: the same fight again writes nothing new.
    const n = c.lines.length + shop.lines.length;
    storyNudges(s, st, 'loss');
    expect(c.lines.length + shop.lines.length).toBe(n);
  });

  it('the store stays quiet when nobody can afford anything', () => {
    const s = structuredClone(cur());
    s.cash = 0;
    const st = s.story!;
    delete st.threads['contact.store'];
    for (let f = 100; f < 120; f++) {
      st.fights = f;
      storyNudges(s, st, 'loss');
    }
    expect(st.threads['contact.store']).toBeUndefined();
  });
});
