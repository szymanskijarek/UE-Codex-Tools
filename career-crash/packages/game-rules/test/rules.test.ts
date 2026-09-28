import { bundle } from '@cc/content';
import { Rng } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import {
  addXp,
  allocatePoints,
  botTeam,
  canSpend,
  careerOffers,
  careerSlots,
  chooseCareer,
  cumulativeXp,
  evaluateTraits,
  generateRecruit,
  leagueFor,
  newMasteries,
  offlinePay,
  pickOpponents,
  ratingChange,
  regenTickets,
  SPEND_GRAPH,
  teamPower,
  toSnapshot,
} from '../src/index';

const econ = bundle.economy;

describe('XP and career milestones (03 §3)', () => {
  it('matches the documented cumulative XP table', () => {
    expect(cumulativeXp(econ, 5)).toBe(920);
    expect(cumulativeXp(econ, 12)).toBe(5764);
    expect(cumulativeXp(econ, 22)).toBe(24584);
    expect(cumulativeXp(econ, 35)).toBe(81940);
  });

  it('career slots unlock at 1/5/12/22/35', () => {
    expect([1, 4, 5, 11, 12, 22, 35, 50].map((l) => careerSlots(econ, l))).toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
  });

  it('levels up and grants stat points', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('x'), 'c1');
    expect(addXp(econ, c, 920)).toBe(4);
    expect(c.level).toBe(5);
    expect(c.unspentPoints).toBe(4);
    expect(allocatePoints(bundle, c, { strength: 2, luck: 2 })).toBeNull();
    expect(allocatePoints(bundle, c, { strength: 1 })).toMatch(/not enough/);
  });

  it('offers coherent careers deterministically and unlocks masteries', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('y'), 'c2');
    c.careers = ['career.chef'];
    c.level = 12;
    const unlocked = bundle.careers.map((x) => x.id);
    const offers = careerOffers(bundle, c, unlocked, 'seed1');
    expect(offers).toHaveLength(3);
    expect(careerOffers(bundle, c, unlocked, 'seed1')).toEqual(offers);
    expect(offers).not.toContain('career.chef');

    c.careers = ['career.chef', 'career.firefighter'];
    c.pendingOffer = ['career.paramedic'];
    const res = chooseCareer(bundle, c, 'career.paramedic');
    expect(res.masteries).toEqual(['mastery.emergency-response-expert']);
  });

  it('ordered masteries require the right order', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('z'), 'c3');
    c.careers = ['career.life-coach', 'career.teacher', 'career.psychologist'];
    expect(newMasteries(bundle, c)).not.toContain('mastery.motivational-speaker');
    c.careers = ['career.teacher', 'career.psychologist', 'career.life-coach'];
    expect(newMasteries(bundle, c)).toContain('mastery.motivational-speaker');
  });

  it('earns traits from lifetime counters', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('t'), 'c4');
    c.lifetime.counters['used:prop.coffee-cup'] = 5;
    expect(evaluateTraits(bundle, c)).toContain('trait.coffee-addict');
  });
});

describe('economy (03 §5–7)', () => {
  it('rating: winners gain, defence losses are softened', () => {
    const r = ratingChange(econ, 1000, 1000, 1);
    expect(r.attacker).toBe(16);
    expect(r.defender).toBe(-8);
    expect(ratingChange(econ, 1000, 1000, 0).defender).toBe(16);
  });

  it('leagues by rating', () => {
    expect(leagueFor(econ, 999)).toBe('intern');
    expect(leagueFor(econ, 1260)).toBe('associate');
    expect(leagueFor(econ, 2500)).toBe('ceo');
  });

  it('offline pay caps at 12 hours', () => {
    const roster = [generateRecruit(bundle, Rng.fromSeed('o'), 'o1')];
    expect(offlinePay(bundle, roster, 0, 3 * 3_600_000).hours).toBe(3);
    expect(offlinePay(bundle, roster, 0, 48 * 3_600_000)).toEqual({ cash: 2 * 12, hours: 12 });
  });

  it('tickets regenerate to the cap', () => {
    expect(regenTickets(econ, 0, 0, 60 * 60_000).tickets).toBe(3);
    expect(regenTickets(econ, 9, 0, 10 * 3_600_000).tickets).toBe(10);
  });

  it('picks easy/even/hard opponents deterministically', () => {
    const pool = Array.from({ length: 30 }, (_, i) => ({ playerId: `p${i}`, playerName: `P${i}`, rating: 850 + i * 15, power: 200, ghost: false }));
    const picks = pickOpponents(pool, 1000, 200, 's', new Set());
    expect(picks.map((p) => p.difficulty)).toEqual(['easy', 'even', 'hard']);
    expect(pickOpponents(pool, 1000, 200, 's', new Set())).toEqual(picks);
    expect(picks[0]!.rating).toBeLessThan(picks[2]!.rating);
  });

  it('bot teams scale with rating', () => {
    const lo = botTeam(bundle, 'b', 900, 3);
    const hi = botTeam(bundle, 'b', 1700, 3);
    expect(teamPower(bundle, hi.characters)).toBeGreaterThan(teamPower(bundle, lo.characters));
  });

  it('monetisation guard: premium currency never buys power (03 §6.1)', () => {
    const power = ['recruit', 'equipment', 'reroll', 'retrain', 'roster_slot', 'career_unlock', 'arena_unlock', 'rated_attack'];
    for (const p of power) expect(canSpend('stars', p)).toBe(false);
    for (const target of SPEND_GRAPH.stars) expect(power).not.toContain(target);
  });

  it('snapshots carry relationships as rivals/friends', () => {
    const c = generateRecruit(bundle, Rng.fromSeed('r'), 'c5');
    c.relationships = { a: -4, b: 5, c: 1 };
    const s = toSnapshot(c);
    expect(s.rivals).toEqual(['a']);
    expect(s.friends).toEqual(['b']);
  });
});
