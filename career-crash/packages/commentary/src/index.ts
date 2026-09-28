/**
 * Procedural commentary (02 §11): event log → moments → templated report.
 * Pure and deterministic — the same battle always produces the same report.
 */
import type { ContentBundle, DetectorDef, DetectorKind } from '@cc/content-schema';
import { Rng, type BattleEvent, type BattleInput, type BattleOutput, type CharacterResult } from '@cc/sim';

export interface Moment {
  detector: string;
  kind: DetectorKind;
  score: number;
  text: string;
  tick: number;
  actors: number[];
}

export interface BattleReport {
  headline: Moment | null;
  highlights: Moment[];
  mvp: { entityId: number; name: string } | null;
  winnerName: string | null;
  lines: string[];
  storyScore: number;
}

interface Ctx {
  bundle: ContentBundle;
  input: BattleInput;
  out: BattleOutput;
  chars: Map<number, CharacterResult>;
  propDefs: Map<number, string>;
  byIndex: BattleEvent[];
}

type Slots = Record<string, string | number>;
interface Found {
  tick: number;
  actors: number[];
  slots: Slots;
  bonus?: number;
}

const t = (bundle: ContentBundle, key: string): string => bundle.locale[key] ?? key;
const nameOf = (bundle: ContentBundle, id: string): string => t(bundle, `${id}.name`);

function charName(c: Ctx, id: number): string {
  if (id >= 0 && c.chars.has(id)) return c.chars.get(id)!.name;
  return 'someone';
}

function snapOf(c: Ctx, id: number) {
  const r = c.chars.get(id);
  if (!r) return undefined;
  return c.input.teams[r.team]?.characters.find((s) => s.id === r.snapshotId);
}

function careerTitle(c: Ctx, id: number): string {
  const s = snapOf(c, id);
  const career = s?.careers[s.careers.length - 1];
  return career ? nameOf(c.bundle, career) : 'Referee';
}

/** Walk the cause chain from an event back to its origin (max 8 links). */
function chain(c: Ctx, ev: BattleEvent): BattleEvent[] {
  const out: BattleEvent[] = [];
  let cur: BattleEvent | undefined = ev;
  const seen = new Set<number>();
  while (cur && out.length < 8 && !seen.has(cur.i)) {
    seen.add(cur.i);
    out.push(cur);
    cur = cur.cause >= 0 ? c.byIndex[cur.cause] : undefined;
  }
  return out;
}

function describe(c: Ctx, e: BattleEvent): string | null {
  const b = c.bundle;
  switch (e.type) {
    case 'throw':
      return `${charName(c, e.a)} threw a ${nameOf(b, e.s).toLowerCase()}`;
    case 'abilityCast':
      return `${charName(c, e.a)} used ${nameOf(b, e.s)}`;
    case 'push':
      return `${charName(c, e.a)} shoved a ${nameOf(b, e.s).toLowerCase()}`;
    case 'statusApplied': {
      const who = c.chars.has(e.b) ? charName(c, e.b) : c.propDefs.has(e.b) ? `a ${nameOf(b, c.propDefs.get(e.b)!).toLowerCase()}` : null;
      const adj = b.locale[`${e.s}.adj`];
      return who && adj ? `${who} got ${adj}` : null;
    }
    case 'explosion':
      return `a ${nameOf(b, e.s).toLowerCase()} exploded`;
    case 'propBroken':
      return `a ${nameOf(b, e.s).toLowerCase()} broke`;
    case 'propSpawned':
      return e.s.includes('spill') || e.s.includes('puddle') || e.s.includes('flood') || e.s.includes('fire') || e.s.includes('sparks')
        ? `${nameOf(b, e.s).toLowerCase()} spread across the floor`
        : null;
    case 'hazardStart':
      return nameOf(b, e.s.startsWith('hazard.') ? e.s : `hazard.${e.s}`).replace(/^hazard\./, '');
    case 'ko':
    case 'downed':
      return `${charName(c, e.b)} went down`;
    default:
      return null;
  }
}

/** Does anything in the chain "belong" to the victim's profession? */
function ironic(c: Ctx, ko: BattleEvent): string | null {
  const snap = snapOf(c, ko.b);
  if (!snap) return null;
  const tags = new Set(snap.careers.flatMap((id) => c.bundle.careers.find((x) => x.id === id)?.tags ?? []));
  for (const e of chain(c, ko)) {
    if (e.type === 'statusApplied' && e.s === 'status.burning' && (tags.has('skill:extinguish') || tags.has('skill:cook'))) return 'fire';
    if (e.type === 'statusApplied' && e.s === 'status.electrified' && (tags.has('skill:wiring') || tags.has('role:tech'))) return 'electricity';
    if (e.type === 'statusApplied' && e.s === 'status.slipping' && (tags.has('skill:clean') || tags.has('skill:plumbing'))) return 'a wet floor';
    if ((e.type === 'throw' || e.type === 'propBroken') && tags.has('role:food')) {
      const prop = c.bundle.props.find((p) => p.id === e.s);
      if (prop?.tags.includes('food')) return `a ${nameOf(c.bundle, prop.id).toLowerCase()}`;
    }
    if (e.type === 'abilityCast' && e.s === 'ability.parcel-throw' && tags.has('role:transport')) return 'a parcel';
  }
  return null;
}

type Detector = (c: Ctx, d: DetectorDef) => Found | null;

const kos = (c: Ctx): BattleEvent[] => c.out.events.filter((e) => e.type === 'ko' && c.chars.has(e.b));

const DETECTORS: Record<DetectorKind, Detector> = {
  ironicKo: (c) => {
    for (const ko of kos(c)) {
      const cause = ironic(c, ko);
      if (cause) return { tick: ko.t, actors: [ko.b], slots: { victim: charName(c, ko.b), victimCareer: careerTitle(c, ko.b), cause } };
    }
    return null;
  },
  refereeDown: (c) => {
    const e = c.out.events.find((x) => x.type === 'refereeDown');
    return e ? { tick: e.t, actors: [e.a], slots: { killer: c.chars.has(e.a) ? charName(c, e.a) : 'a stray object' } } : null;
  },
  friendlyFireKo: (c) => {
    for (const ko of kos(c)) {
      const a = c.chars.get(ko.a);
      const b = c.chars.get(ko.b);
      if (a && b && a.team === b.team && a.entityId !== b.entityId) return { tick: ko.t, actors: [ko.a, ko.b], slots: { killer: a.name, victim: b.name } };
    }
    return null;
  },
  rivalDefeated: (c) => {
    for (const ko of kos(c)) {
      const killer = snapOf(c, ko.a);
      const victim = c.chars.get(ko.b);
      if (killer && victim && killer.rivals?.includes(victim.snapshotId)) return { tick: ko.t, actors: [ko.a, ko.b], slots: { killer: killer.name, victim: victim.name } };
    }
    return null;
  },
  clutch: (c, d) => {
    const w = c.out.result.winner;
    if (w < 0) return null;
    const alive = c.out.result.characters.filter((x) => x.team === w && x.state === 'active');
    if (alive.length !== 1) return null;
    const x = alive[0]!;
    if (x.hp * 10000 >= x.maxHp * (d.params?.hpBelowBp ?? 1500)) return null;
    return { tick: c.out.result.ticks, actors: [x.entityId], slots: { name: x.name, winner: c.input.teams[w]!.playerName } };
  },
  careerCleanup: (c) => {
    const list = kos(c).filter((k) => c.chars.has(k.a) && c.chars.get(k.a)!.team !== c.chars.get(k.b)!.team);
    if (list.length < 2) return null;
    const careers = new Set(list.map((k) => careerTitle(c, k.a)));
    if (careers.size !== 1) return null;
    return { tick: list[list.length - 1]!.t, actors: list.map((k) => k.a), slots: { career: [...careers][0]! }, bonus: list.length * 3 };
  },
  chainReaction: (c) => {
    let best: { ev: BattleEvent; parts: string[] } | null = null;
    for (const e of c.out.events) {
      if (e.type !== 'ko' && e.type !== 'downed' && e.type !== 'explosion' && e.type !== 'refereeDown') continue;
      const parts: string[] = [];
      for (const link of chain(c, e).reverse()) {
        const d = describe(c, link);
        if (d && parts[parts.length - 1] !== d) parts.push(d);
      }
      if (parts.length >= 3 && (!best || parts.length > best.parts.length)) best = { ev: e, parts };
    }
    if (!best) return null;
    const text = best.parts.slice(-4).join(' → ');
    return { tick: best.ev.t, actors: [best.ev.a, best.ev.b], slots: { chain: text[0]!.toUpperCase() + text.slice(1) }, bonus: best.parts.length * 2 };
  },
  upset: (c, d) => {
    const w = c.out.result.winner;
    if (w < 0 || c.input.teams.length !== 2) return null;
    const gap = c.input.teams[1 - w]!.rating - c.input.teams[w]!.rating;
    if (gap < (d.params?.ratingGap ?? 150)) return null;
    return { tick: c.out.result.ticks, actors: [], slots: { winner: c.input.teams[w]!.playerName, count: gap } };
  },
  firstBlood: (c) => {
    const e = c.out.events.find((x) => (x.type === 'downed' || x.type === 'ko') && c.chars.has(x.b));
    return e ? { tick: e.t, actors: [e.a, e.b], slots: { killer: charName(c, e.a), victim: charName(c, e.b) } } : null;
  },
  propKo: (c) => {
    for (const e of c.out.events) {
      if ((e.type !== 'downed' && e.type !== 'ko') || !c.chars.has(e.b)) continue;
      const th = chain(c, e).find((x) => x.type === 'throw');
      if (th) return { tick: e.t, actors: [th.a, e.b], slots: { killer: charName(c, th.a), victim: charName(c, e.b), prop: nameOf(c.bundle, th.s).toLowerCase() } };
    }
    return null;
  },
  massStatus: (c, d) => {
    const min = d.params?.min ?? 3;
    const active = new Map<string, Set<number>>();
    let best: { status: string; count: number; tick: number; who: number[] } | null = null;
    const environmental = (e: BattleEvent): boolean => chain(c, e).some((x) => x.type === 'hazardStart' || x.type === 'suddenDeath');
    for (const e of c.out.events) {
      if (!c.chars.has(e.b)) continue;
      if (e.type === 'statusApplied' && !environmental(e)) {
        const s = active.get(e.s) ?? new Set<number>();
        s.add(e.b);
        active.set(e.s, s);
        if (s.size >= min && (!best || s.size > best.count) && c.bundle.locale[`${e.s}.adj`]) best = { status: e.s, count: s.size, tick: e.t, who: [...s] };
      } else if (e.type === 'statusExpired') active.get(e.s)?.delete(e.b);
    }
    return best ? { tick: best.tick, actors: best.who, slots: { count: best.count, status: t(c.bundle, `${best.status}.adj`) }, bonus: best.count * 3 } : null;
  },
  cowardSurvivor: (c) => {
    const w = c.out.result.winner;
    if (w < 0) return null;
    for (const r of c.out.result.characters) {
      if (r.team !== w || r.state !== 'active') continue;
      const s = snapOf(c, r.entityId);
      if (s?.personality === 'personality.coward' && r.counters.damageDealt < 25) return { tick: c.out.result.ticks, actors: [r.entityId], slots: { name: r.name } };
    }
    return null;
  },
  flawless: (c) => {
    const w = c.out.result.winner;
    if (w < 0) return null;
    const mine = c.out.result.characters.filter((x) => x.team === w);
    if (mine.some((x) => x.counters.downs > 0 || x.state !== 'active')) return null;
    return { tick: c.out.result.ticks, actors: [], slots: { winner: c.input.teams[w]!.playerName } };
  },
  panic: (c) => {
    const e = c.out.events.find((x) => x.type === 'panic' && c.chars.has(x.a));
    return e ? { tick: e.t, actors: [e.a], slots: { name: charName(c, e.a) } } : null;
  },
  card: (c) => {
    const e = c.out.events.find((x) => x.type === 'card' && c.chars.has(x.b));
    return e ? { tick: e.t, actors: [e.b], slots: { name: charName(c, e.b) } } : null;
  },
  explosion: (c) => {
    const e = c.out.events.find((x) => x.type === 'explosion');
    if (!e) return null;
    const who = chain(c, e).find((x) => c.chars.has(x.a));
    return { tick: e.t, actors: who ? [who.a] : [], slots: { prop: nameOf(c.bundle, e.s).toLowerCase(), name: who ? charName(c, who.a) : 'someone' } };
  },
  rideHit: (c) => {
    for (const e of c.out.events) {
      if (e.type !== 'hit' || !c.chars.has(e.a) || !c.chars.has(e.b)) continue;
      const ride = e.cause >= 0 ? c.byIndex[e.cause] : undefined;
      if (ride?.type === 'ride') return { tick: e.t, actors: [e.a, e.b], slots: { name: charName(c, e.a), victim: charName(c, e.b), prop: nameOf(c.bundle, ride.s).toLowerCase() } };
    }
    return null;
  },
  healedEnemy: (c) => {
    for (const e of c.out.events) {
      if (e.type !== 'heal' || e.v < 5) continue;
      const a = c.chars.get(e.a);
      const b = c.chars.get(e.b);
      if (a && b && a.team !== b.team) return { tick: e.t, actors: [e.a, e.b], slots: { name: a.name, victim: b.name, career: careerTitle(c, e.a) } };
    }
    return null;
  },
  longBattle: (c) =>
    c.out.result.reason === 'timeout' ? { tick: c.out.result.ticks, actors: [], slots: { arena: nameOf(c.bundle, c.input.arenaId) } } : null,
};

function fill(template: string, slots: Slots): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(slots[k] ?? k));
}

export function buildReport(bundle: ContentBundle, input: BattleInput, out: BattleOutput): BattleReport {
  const c: Ctx = {
    bundle,
    input,
    out,
    chars: new Map(out.result.characters.map((r) => [r.entityId, r])),
    propDefs: new Map(),
    byIndex: out.events,
  };
  for (const e of out.events) {
    if (e.type === 'propSpawned') c.propDefs.set(e.b, e.s);
  }
  const rng = Rng.fromSeed(input.seed).fork('commentary');
  const moments: Moment[] = [];
  for (const d of [...bundle.detectors].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const found = DETECTORS[d.kind](c, d);
    if (!found) continue;
    const tpl = t(bundle, rng.pick(d.templates));
    moments.push({ detector: d.id, kind: d.kind, score: d.score + (found.bonus ?? 0), text: fill(tpl, found.slots), tick: found.tick, actors: found.actors });
  }
  moments.sort((a, b) => b.score - a.score || a.tick - b.tick || (a.detector < b.detector ? -1 : 1));
  const w = out.result.winner;
  const mvpR = out.result.characters.find((x) => x.entityId === out.result.mvp);
  const lines = out.result.characters.map((r) => {
    const k = r.counters;
    const bits = [`${k.kos} KO${k.kos === 1 ? '' : 's'}`, `${k.damageDealt} dmg`];
    if (k.revives) bits.push(`${k.revives} revive${k.revives === 1 ? '' : 's'}`);
    if (k.friendlyHits) bits.push(`${k.friendlyHits} friendly hit${k.friendlyHits === 1 ? '' : 's'}`);
    if (k.cards) bits.push(`${k.cards} card${k.cards === 1 ? '' : 's'}`);
    return `${r.name} (${careerTitle(c, r.entityId)}): ${bits.join(', ')}${r.state === 'ko' ? ' — KO' : ''}`;
  });
  return {
    headline: moments[0] ?? null,
    highlights: moments.slice(1, 6),
    mvp: mvpR ? { entityId: mvpR.entityId, name: mvpR.name } : null,
    winnerName: w >= 0 ? (input.teams[w]?.playerName ?? null) : null,
    lines,
    storyScore: moments.filter((m) => m.score >= 60).length,
  };
}
