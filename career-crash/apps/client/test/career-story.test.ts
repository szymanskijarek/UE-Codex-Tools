import { bundle } from '@cc/content';
import { generateRecruit, hasUnlock, offerGig, rollGig } from '@cc/game-rules';
import { Rng } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import {
  acceptGig,
  bookTemps,
  canApply,
  career,
  collectResults,
  draftCharacter,
  interviewers,
  lineup,
  migrate,
  nextOpponents,
  prepareFight,
  replyStory,
  fireStoryBeat,
  save,
  skipIntro,
  startCareer,
  storyCtx,
  type CareerSave,
} from '../src/career/model';

const cur = (): CareerSave => career.value!;
const ask = () => Object.values(cur().story!.threads).find((t) => t.ask);
const fight = () => {
  prepareFight(cur());
  return collectResults(cur());
};

function newCareer(): void {
  const careerId = bundle.careers.find((c) => c.tier === 1 && c.unlock.type === 'default' && !c.deprecated)!.id;
  startCareer(draftCharacter('story-test', careerId), 'normal', { adjective: 0, noun: 0, suffix: 0 } as never);
}

describe('career story: the first session (12 §2)', () => {
  it('starts empty, and the friend, the network and the recruiter open it up one message at a time', () => {
    newCareer();
    expect(cur().feed).toEqual([]);
    expect(canApply(cur())).toBe(false);
    expect(lineup(cur())).toHaveLength(1);

    fireStoryBeat(cur(), 'story.ch1-01-hello');
    expect(cur().story!.pings).toContain('contact.friend');
    expect(ask()?.id).toBe('contact.friend');
    replyStory(cur(), 'contact.friend', 0);
    expect(hasUnlock(cur().story!, 'feed')).toBe(true);
    expect(cur().story!.connections).toBe(12);
    expect(cur().feed!.some((p) => p.id === 'story-story.ch1-02-network')).toBe(true);
    expect(cur().feed!.length).toBeGreaterThan(3);

    fireStoryBeat(cur(), 'story.ch1-03-opportunity');
    expect(canApply(cur())).toBe(true);
    replyStory(cur(), 'contact.recruiter', 1);
    expect(cur().story!.flags).toContain('recruiter.scam');
    expect(cur().story!.partner).toBe(true);
    // Two of you against two of theirs.
    expect(lineup(cur())).toHaveLength(2);
    expect(interviewers(cur())).toBe(2);
    expect(nextOpponents(cur())).toHaveLength(2);
  });

  it('after two fights the friend leaves; temps cost money; hiring opens after the third', () => {
    const friendId = cur().story!.friend!.c.id;
    const xp0 = cur().story!.friend!.c.xp;
    fight();
    expect(cur().story!.friend!.c.xp).toBeGreaterThan(xp0);
    expect(lineup(cur()).some((c) => c.c.id === friendId)).toBe(true);
    fight();
    expect(cur().story!.partner).toBe(false);
    expect(cur().story!.gates).toContain('bro');
    expect(cur().feed!.some((p) => p.id === 'story-story.ch1-06-poached' && p.link)).toBe(true);
    expect(lineup(cur())).toHaveLength(1);

    fireStoryBeat(cur(), 'story.ch1-07-agency');
    expect(hasUnlock(cur().story!, 'temps')).toBe(true);
    save({ ...cur(), cash: 1000 });
    bookTemps(cur(), 2);
    expect(lineup(cur()).filter((c) => c.temp)).toHaveLength(2);
    const before = cur().cash;
    prepareFight(cur());
    expect(cur().cash).toBeLessThan(before);
    expect(cur().story!.tempSpend).toBe(before - cur().cash);
    collectResults(cur());
    expect(hasUnlock(cur().story!, 'hiring')).toBe(true);
    expect(cur().story!.squadSlots).toBe(1);
    expect(cur().story!.threads['contact.karen']!.lines.some((l) => l.text.includes(`💵 ${cur().story!.tempSpend}`))).toBe(true);
  });

  it('a gig is accepted once, fought off the ladder, and signed off in its thread', () => {
    const gig = bundle.gigs.find((g) => g.side === 'cast')!;
    const s = structuredClone(cur());
    offerGig(bundle, s.story!, gig, storyCtx(s));
    save(s);
    const stage = cur().stage;
    const input = acceptGig(cur(), gig.id);
    expect(input).not.toBeNull();
    expect(input!.arenaId).toBe(gig.arena);
    expect(input!.teams[0]!.characters).toHaveLength(1 + gig.allies!.length);
    expect(input!.teams[1]!.characters.map((c) => c.name)).toEqual(gig.opponents.map((o) => o.name));
    expect(acceptGig(cur(), gig.id)).toBeNull();
    const after = collectResults(cur());
    expect(after.stage).toBe(stage);
    expect(after.last!.gig?.id).toBe(gig.id);
    expect(after.story!.threads[gig.id]!.gig!.state).toBe('done');
    expect(after.feed![0]!.id.endsWith('-gig')).toBe(true);
    // Never offered again.
    const st = structuredClone(after.story!);
    st.gigs.lastOffer = -100;
    for (let i = 0; i < 50; i++) expect(rollGig(bundle, st, { ...storyCtx(after), fights: 100 + i, stage: 30 })?.id).not.toBe(gig.id);
  });

  it('"Skip the intro" opens Easy Apply with the friend on board', () => {
    newCareer();
    skipIntro(cur());
    expect(canApply(cur())).toBe(true);
    expect(cur().story!.partner).toBe(true);
    expect(cur().story!.pings).toEqual([]);
  });
});

describe('career story: saves from before it (12 §10)', () => {
  it('get everything open, the same line-up with paid temps, and Karen\'s bonus', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('legacy'), 'main-legacy');
    const old = { v: 1, seed: 'legacy', difficulty: 'normal', mainId: c.id, chars: { [c.id]: { c, careerXp: {}, nodes: [] } }, squad: [], stage: 6, cash: 100, applicants: [], pending: null, last: null, wins: 6, losses: 2, inventory: {} } as unknown as CareerSave;
    const s = migrate(old)!;
    expect(canApply(s)).toBe(true);
    expect(s.cash).toBe(600);
    expect(s.story!.temps).toBe(2);
    expect(s.story!.squadSlots).toBe(2);
    expect(s.story!.threads['contact.karen']).toBeDefined();
    expect(s.story!.fired.filter((f) => f.startsWith('story.ch1-')).length).toBeGreaterThan(5);
  });
});
