import { bundle } from '@cc/content';
import { createBattle, simulate } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { addInfluence, countriesDef, countryKeys, derbyOf, emptyInfluence, hostOf, log2x100, sampleTally, scoreLikes, sessionInput, sessionLineup, tallySession } from '../src/incident';

const def = countriesDef(bundle);
const HOUR = '2026-10-06T14';

describe('Diplomatic Incident (09)', () => {
  it('has forty delegates, each with a flag and moves of their own', () => {
    const keys = countryKeys(def);
    expect(keys).toHaveLength(40);
    for (const k of ['ENG', 'SCO', 'WAL', 'PL', 'DE', 'MX']) expect(keys).toContain(k);
    for (const k of keys) {
      expect(def.cast[k]!.flag).toBeTruthy();
      expect(def.cast[k]!.moves?.length).toBeGreaterThan(0);
    }
  });

  it('log2 in integers matches Math.log2 to a hundredth', () => {
    for (const n of [1, 2, 3, 7, 10, 100, 999, 1024, 12345, 1_000_000]) expect(Math.abs(log2x100(n) - Math.log2(n) * 100)).toBeLessThanOrEqual(1);
  });

  it('scores likes on a log scale, against the field', () => {
    const tally = Object.fromEntries(countryKeys(def).map((k, i) => [k, 50 + i]));
    tally.IN = 1_000_000;
    tally.WAL = 100;
    tally.JM = 0;
    const s = scoreLikes(def, tally);
    const by = (k: string) => s.find((c) => c.key === k)!;
    expect(by('IN').score).toBe(def.score.max);
    expect(by('IN').mandate).toBe(true);
    expect(by('JM').abstained).toBe(true);
    expect(by('JM').under).toBe(true);
    // Twice the likes is a step, not a landslide.
    expect(by('WAL').score).toBeGreaterThan(by('ENG').score);
    expect(s.every((c) => Math.abs(c.score) <= def.score.max)).toBe(true);
    // Liking everyone equally changes nothing.
    const flat = scoreLikes(def, Object.fromEntries(countryKeys(def).map((k) => [k, 500])));
    expect(flat.every((c) => c.score === 0)).toBe(true);
  });

  it('a liked country fights stronger, with the same build', () => {
    const tally = Object.fromEntries(countryKeys(def).map((k) => [k, 100]));
    const up = sessionInput(bundle, def, HOUR, 0, { ...tally, PL: 100_000 }).input.teams.find((t) => t.playerId === 'PL')!.characters[0]!;
    const down = sessionInput(bundle, def, HOUR, 0, { ...tally, PL: 1 }).input.teams.find((t) => t.playerId === 'PL')!.characters[0]!;
    expect(up.level).toBeGreaterThan(down.level);
    expect(up.appearance).toEqual(down.appearance);
    expect(up.persona).toBe('npc.del-pl');
    expect(up.granted).toContain('ability.ciupaga-swing');
  });

  it('the line-up puts everyone in, the host first, and gives Wildcards a slot', () => {
    const tally = sampleTally(def, HOUR, 5);
    const l = sessionLineup(def, HOUR, 5, tally);
    expect(new Set(l.order).size).toBe(40);
    expect(l.order[0]).toBe(l.host);
    expect(l.wildcards.length).toBeGreaterThan(0);
    expect(sessionLineup(def, HOUR, 5, tally)).toEqual(l);
    expect(sessionLineup(def, HOUR, 6, tally).order).not.toEqual(l.order);
  });

  it('the Host is where it is nearly 8 in the evening', () => {
    const all = Object.fromEntries(countryKeys(def).map((k) => [k, 1]));
    expect(['ENG', 'SCO', 'WAL', 'IE', 'PT']).toContain(hostOf(def, '2026-10-06T20', all));
    expect(['JP', 'KR']).toContain(hostOf(def, '2026-10-06T11', all));
    // Only countries somebody liked can host.
    expect(hostOf(def, '2026-10-06T11', { BR: 3, MX: 1 })).toBe('MX');
  });

  it('in a derby hour England and Scotland start on the floor as rivals', () => {
    const hour = '2026-10-06T18';
    expect(derbyOf(def, hour)?.a).toBe('ENG');
    const { input, lineup } = sessionInput(bundle, def, hour, 0, sampleTally(def, hour, 0));
    expect(lineup.order.slice(0, 2)).toEqual(['ENG', 'SCO']);
    const eng = input.teams[0]!.characters[0]!;
    expect(eng.rivals).toEqual(['countries-sco']);
    // They keep their seats all hour: floored, they come straight back instead of queueing.
    expect(input.endless!.resident).toEqual([0, 1]);
    const out = simulate({ ...input, endless: { ...input.endless!, ticks: 3000 } }, bundle);
    const engSco = new Set(out.events.filter((e) => e.type === 'spawn' && (e.v === 0 || e.v === 1)).map((e) => e.a));
    expect(out.events.some((e) => e.type === 'walkon' && engSco.has(e.b))).toBe(false);
    expect(derbyOf(def, '2026-10-06T13')).toBeUndefined();
  });

  it('a session runs ten at a time, walks the lobby on, and tallies from the log', () => {
    const { input } = sessionInput(bundle, def, HOUR, 3, sampleTally(def, HOUR, 3));
    const short = { ...input, endless: { ...input.endless!, ticks: 2400 } };
    const out = simulate(short, bundle);
    const keys = short.teams.map((t) => t.playerId);
    const rows = tallySession(def, keys, out.events, 2400);
    const walkOns = out.events.filter((e) => e.type === 'walkon').length;
    expect(walkOns).toBeGreaterThan(0);
    expect(rows.reduce((n, r) => n + r.walkOns, 0)).toBe(10 + walkOns);
    expect(rows.reduce((n, r) => n + r.kos, 0)).toBeGreaterThan(0);
    // Floor time adds up to ten seats' worth, minus the gaps while someone walks on.
    const floor = rows.reduce((n, r) => n + r.floorS, 0);
    expect(floor).toBeLessThanOrEqual(10 * 120 + 10);
    expect(floor).toBeGreaterThan(10 * 120 * 0.7);
    const hour = addInfluence(def, emptyInfluence(keys), rows);
    expect(hour.filter((r) => r.sessionsWon === 1)).toHaveLength(1);
  });

  it('is deterministic', () => {
    const a = sessionInput(bundle, def, HOUR, 2, sampleTally(def, HOUR, 2)).input;
    const b = sessionInput(bundle, def, HOUR, 2, sampleTally(def, HOUR, 2)).input;
    expect(b).toEqual(a);
    const x = createBattle({ ...a, endless: { ...a.endless!, ticks: 400 } }, bundle);
    while (!x.done()) x.step();
    expect(x.world.tick).toBe(400);
  });
});
