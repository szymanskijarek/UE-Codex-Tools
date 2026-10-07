import { bundle } from '@cc/content';
import { createBattle, simulate } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { addInfluence, countriesDef, countryKeys, derbyOf, emptyInfluence, hostOf, log2x100, sampleTally, scoreLikes, sessionInput, sessionLineup, sessionRaid, tallySession } from '../src/incident';

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

  it('every delegate has its own lines for each context, and clash lines name real delegates', () => {
    const contexts = ['bark_walkon', 'bark_attack', 'bark_ko_win', 'bark_hurt', 'bark_thrown', 'bark_downed_crawl', 'bark_low_hp', 'bark_revenge'];
    const personas = new Set(countryKeys(def).map((k) => def.cast[k]!.persona));
    for (const p of personas) for (const c of contexts) expect(bundle.live[`${p}:${c}`]?.length, `${p}:${c}`).toBeGreaterThan(0);
    const pairs = Object.keys(bundle.live).filter((k) => k.includes('>'));
    expect(pairs.length).toBeGreaterThan(60);
    for (const k of pairs) {
      const [a, b] = k.split('>');
      expect(personas.has(a!), k).toBe(true);
      expect(personas.has(b!), k).toBe(true);
    }
    // The derby has lines both ways.
    expect(bundle.live['npc.del-eng>npc.del-sco']?.length).toBeGreaterThan(0);
    expect(bundle.live['npc.del-sco>npc.del-eng']?.length).toBeGreaterThan(0);
  });
  it('institutions raid some sessions, each on its own terms', () => {
    const seen = new Map<string, NonNullable<ReturnType<typeof sessionRaid>>>();
    for (let h = 0; h < 24; h++) {
      const hour = `2026-10-06T${String(h).padStart(2, '0')}`;
      for (let s = 0; s < 12; s++) {
        const { input } = sessionInput(bundle, def, hour, s, sampleTally(def, hour, s));
        if (input.crashers && !seen.has(input.crashers.set)) seen.set(input.crashers.set, input.crashers);
      }
    }
    for (const id of ['crasher.icc', 'crasher.nato', 'crasher.un']) expect(seen.has(id), id).toBe(true);
    const nato = seen.get('crasher.nato')!;
    expect(nato.stance).toBe('aloof');
    expect(nato.mount).toBe('prop.high-horse');
    // It waits for the members to be off their feet, and leaves when they're back.
    expect(nato.when?.noneStanding?.length).toBe(17);
    expect(nato.leaveIfStanding).toEqual(nato.when?.noneStanding);
    expect(seen.get('crasher.un')!.when?.koStreak?.kos).toBe(3);
    expect(seen.get('crasher.icc')!.when?.koStreak?.oneSide).toBe(true);
    // Big Tech only turns up after a SURGE, and then always does.
    const order = countryKeys(def);
    expect(sessionRaid(bundle, def, HOUR, 4, order, 5920, true)?.set).toBe('crasher.big-tech');
    for (let s = 0; s < 12; s++) expect(sessionRaid(bundle, def, HOUR, s, order, 5920, false)?.set).not.toBe('crasher.big-tech');
  });

  it('a raided session plays out: the UN comes after a run of knockouts and leaves by the door', () => {
    let found: { hour: string; s: number } | undefined;
    for (let h = 0; h < 24 && !found; h++) {
      const hour = `2026-10-06T${String(h).padStart(2, '0')}`;
      for (let s = 0; s < 12 && !found; s++) if (sessionInput(bundle, def, hour, s, sampleTally(def, hour, s)).input.crashers?.set === 'crasher.un') found = { hour, s };
    }
    const { input } = sessionInput(bundle, def, found!.hour, found!.s, sampleTally(def, found!.hour, found!.s));
    const out = simulate({ ...input, endless: { ...input.endless!, ticks: 3000 } }, bundle);
    const crash = out.events.find((e) => e.type === 'crash')!;
    expect(crash.s).toBe('crasher.un');
    const leave = out.events.find((e) => e.type === 'crashLeave')!;
    expect(leave.t).toBeGreaterThan(crash.t);
    expect(out.events.filter((e) => e.type === 'crashExit').length).toBe(3);
    // They aren't in the standings: only delegates walk on.
    const rows = tallySession(def, input.teams.map((t) => t.playerId), out.events, 3000);
    expect(rows.reduce((n, r) => n + r.walkOns, 0)).toBe(10 + out.events.filter((e) => e.type === 'walkon').length);
  });
  it('the other six: the Federation only in derby hours, the Raters only with a Mandate, and a kill switch', () => {
    const order = countryKeys(def);
    const sets = (hour: string, mandates: string[]) => new Set(Array.from({ length: 200 }, (_, s) => sessionRaid(bundle, def, hour, s, order, 5920, false, mandates)?.set).filter(Boolean));
    const derby = sets('2026-10-06T18', ['PL']);
    const plain = sets('2026-10-06T13', []);
    expect(derby.has('crasher.federation')).toBe(true);
    expect(plain.has('crasher.federation')).toBe(false);
    expect(plain.has('crasher.raters')).toBe(false);
    expect(derby.has('crasher.raters')).toBe(true);
    for (const id of ['crasher.big-oil', 'crasher.health', 'crasher.lenders', 'crasher.brussels']) expect(plain.has(id), id).toBe(true);
    // Brussels waits for EU members, the Raters for the Mandate's side.
    const r = Array.from({ length: 200 }, (_, s) => sessionRaid(bundle, def, '2026-10-06T18', s, order, 5920, false, ['PL'])).filter((x) => x?.set === 'crasher.raters')[0]!;
    expect(r.when?.someStanding).toEqual({ teams: [order.indexOf('PL')], atLeast: 1 });
    const b = Array.from({ length: 200 }, (_, s) => sessionRaid(bundle, def, HOUR, s, order, 5920, false)).filter((x) => x?.set === 'crasher.brussels')[0]!;
    expect(b.when?.someStanding?.teams.length).toBe(13);
    const off = { ...def, institutions: { ...def.institutions!, list: def.institutions!.list.map((i) => ({ ...i, off: true })) } };
    expect(Array.from({ length: 50 }, (_, s) => sessionRaid(bundle, off, HOUR, s, order, 5920, true)).every((x) => !x)).toBe(true);
  });
});
