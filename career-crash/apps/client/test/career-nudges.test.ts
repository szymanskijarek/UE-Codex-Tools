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
      store ||= ['contact.store-alldi', 'contact.store-liddle'].some((id) => !!st.threads[id]);
    }
    expect(coach && store).toBe(true);
    const c = st.threads['contact.coach']!;
    expect(c.lines.some((l) => l.action?.to === 'skills' && l.action.id === mainChar(s).c.id)).toBe(true);
    expect(c.lines.every((l) => !l.text.includes('{'))).toBe(true);
    const shop = (st.threads['contact.store-alldi'] ?? st.threads['contact.store-liddle'])!;
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
    const before = Object.keys(st.threads).filter((k) => k.startsWith('contact.store')).length;
    for (let f = 100; f < 120; f++) {
      st.fights = f;
      storyNudges(s, st, 'loss');
    }
    expect(Object.keys(st.threads).filter((k) => k.startsWith('contact.store')).length).toBe(before);
  });

  it('the shops move up-market with the career: discounters first, food halls at the top', () => {
    const want: [number, string[]][] = [
      [0, ['contact.store-alldi', 'contact.store-liddle']],
      [10, ['contact.store', 'contact.store-asdo']],
      [22, ['contact.store-morrisoffs']],
      [34, ['contact.store-waitrows', 'contact.store-ns']],
    ];
    for (const [stage, ids] of want) {
      const s = structuredClone(cur());
      s.stage = stage;
      s.cash = 1000;
      const st = s.story!;
      for (const k of Object.keys(st.threads)) if (k.startsWith('contact.store')) delete st.threads[k];
      st.nudged = {};
      for (let f = 200; f < 260; f++) {
        st.fights = f;
        storyNudges(s, st, 'loss');
      }
      const seen = Object.keys(st.threads).filter((k) => k.startsWith('contact.store'));
      expect(seen.length).toBeGreaterThan(0);
      for (const k of seen) expect(ids, `stage ${stage}`).toContain(k);
      for (const k of seen) expect(st.threads[k]!.lines.every((l) => !l.text.includes('{'))).toBe(true);
    }
  });
});
