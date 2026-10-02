import { bundle } from '@cc/content';
import { createBattle, Rng, type BattleInput } from '@cc/sim';

/** The fight's moment for its photo post (photo.ts renders it). */
export interface PhotoMoment {
  tick: number;
  /** Entity id in the battle, and who that is. */
  id: number;
  name: string;
  team: number;
  /**
   * What the subject is doing:
   * - finisher: taking the blow that put them down (the other fighter is in the shot);
   * - critter: being bitten, pecked or tripped by a summoned animal (the animal is in the shot);
   * - spooked: running from a critter they fear (the critter is in the shot too);
   * - air: thrown, mid-flight; hurt: taking a crit;
   * - ko / crit / move: dealing it (the fallback).
   */
  kind: 'finisher' | 'critter' | 'spooked' | 'air' | 'hurt' | 'ko' | 'crit' | 'move';
  /** A second entity to keep in the frame: the fighter landing the blow, or the critter. */
  with?: number;
  /** Their name: the attacker, or the critter's owner for animals. */
  withName?: string;
  /** For critter shots: which summon it is (for the caption). */
  critter?: string;
  /**
   * What landed the blow, for the caption: an object with its article ("a frying
   * pan", "a flying Freya") or a signature move's name ("Flambé").
   */
  what?: string;
  whatKind?: 'item' | 'move';
  /** How tight the crop is: 1 is the widest framing, smaller zooms in closer. */
  zoom: number;
  /** Which face to show: pained or shocked for the receiving end, else as it is. */
  face: 'hurt' | 'surprised' | null;
  /** Picks among the career's painted variants of that face (0–1). */
  variant: number;
}

/** Zoom levels: the widest framing first; airborne shots keep room for the tumble. Two-subject shots stay wide. */
const ZOOMS = [1, 0.84, 0.7, 0.58];
const AIR_ZOOMS = [1, 0.88, 0.76];

const SKIP_START_TICKS = 20;

/**
 * How much each kind of shot is wanted, before how good the best one of that
 * kind is. Receiving-end shots with a second subject (a final blow, an animal
 * on the attack) make the best photos; flights are fun but were taking over.
 */
const KIND_WEIGHT: Record<PhotoMoment['kind'], number> = {
  critter: 5,
  finisher: 3,
  spooked: 2.6,
  hurt: 1.8,
  air: 1.3,
  move: 0.9,
  ko: 0.6,
  crit: 0.5,
};

type Candidate = Omit<PhotoMoment, 'zoom' | 'face' | 'variant'> & { score: number; snap: string };

/**
 * Pick a photo moment: a deterministic, varied pick from the battle input.
 *
 * Every candidate gets a score (how good a shot it is). A kind of shot is then
 * drawn at random, weighted by KIND_WEIGHT and its best score, and one of that
 * kind's best few is taken. `main` (the player's character) gets no head start
 * (they're one of six faces), and `last` (the previous fight's photo) makes the same
 * kind of shot and the same subject less likely, so the feed doesn't repeat.
 */
export function pickPhotoMoment(input: BattleInput, main: string[] = [], last?: Pick<PhotoMoment, 'kind' | 'name'> | null): PhotoMoment | null {
  const battle = createBattle(input, bundle);
  const world = battle.world;
  const seniors = new Set(bundle.careers.flatMap((c) => (c.senior ? [c.senior] : [])));
  const candidates: Candidate[] = [];
  const flying = new Map<number, number>();
  const who = new Map<number, { name: string; team: number; snap: string }>();
  /** Critters: summon id and the owner's name. */
  const critters = new Map<number, { summon: string; owner: string }>();
  const add = (tick: number, id: number, raw: number, kind: PhotoMoment['kind'], extra: Partial<Candidate> = {}) => {
    const f = who.get(id);
    if (!f || tick < SKIP_START_TICKS) return;
    candidates.push({ tick, id, name: f.name, team: f.team, kind, score: raw, snap: f.snap, ...extra });
  };
  /** The attacker, as a second subject, if it's a fighter. */
  const by = (id: number): Partial<Candidate> => {
    const f = who.get(id);
    return f ? { with: id, withName: f.name } : {};
  };
  const named = (id: string): string => bundle.locale[`${id}.name`] ?? id.replace(/^[a-z]+\./, '').replace(/-/g, ' ');
  /** "a frying pan", "a pair of scissors", "some sparks". */
  const withArticle = (name: string): string => {
    const n = name.toLowerCase();
    if (/^(sparks|broken glass)$/.test(n)) return `some ${n}`;
    const last = n.split(' ').pop() ?? n;
    if (last.endsWith('s') && !last.endsWith('ss') && last !== 'thermos' && !n.includes(' of ')) return `a pair of ${n}`;
    return `a ${n}`;
  };
  const item = (id: string): Partial<Candidate> => ({ what: withArticle(named(id)), whatKind: 'item' });
  /** What a hit was dealt with: the thrown or swung object, the move, the machine, the flying colleague. */
  const blowFrom = (hit: (typeof world.events)[number]): Partial<Candidate> => {
    const src = world.byId.get(hit.a);
    const c = world.events[hit.cause];
    if (hit.s === 'body' && src) return { what: `a flying ${src.name}`, whatKind: 'item' };
    if (src && src.kind === 'prop') return item(src.def);
    if (src && src.summonOf >= 0) return item(src.summonDef);
    if (!c) return {};
    if (c.type === 'throw' && c.s) return item(c.s);
    if (c.type === 'attack') return c.s ? item(c.s) : { what: 'a bare-knuckle shove', whatKind: 'item' };
    if (c.type === 'abilityCast' && c.s) return { what: named(c.s), whatKind: 'move' };
    if (c.type === 'statusApplied' && c.s === 'status.choked') return { what: 'a choke hold', whatKind: 'item' };
    if (c.type === 'statusApplied' && c.s === 'status.burning') return { what: 'a small but enthusiastic fire', whatKind: 'item' };
    return {};
  };
  let cursor = world.events.length;
  let lastKo: Candidate | null = null;
  while (!battle.done()) {
    battle.step();
    const t = world.tick;
    const fresh = world.events.slice(cursor);
    cursor = world.events.length;
    for (const e of world.entities) {
      if (e.kind !== 'char' || e.team < 0) continue;
      if (e.summonOf >= 0) {
        if (!critters.has(e.id)) critters.set(e.id, { summon: e.summonDef, owner: world.byId.get(e.summonOf)?.name ?? '' });
        continue;
      }
      if (!e.snapshotId) continue;
      if (!who.has(e.id)) who.set(e.id, { name: e.name, team: e.team, snap: e.snapshotId });
      const up = e.statuses.some((st) => st.id === 'status.airborne');
      if (up && !flying.has(e.id)) flying.set(e.id, t);
      if (!up && flying.has(e.id)) {
        const t0 = flying.get(e.id)!;
        flying.delete(e.id);
        // Just past the middle of the flight: high up, mid-tumble.
        if (t - t0 >= 4) add(t0 + Math.round((t - t0) * 0.45), e.id, 120 + Math.min(60, (t - t0) * 3), 'air');
      }
    }
    for (const ev of fresh) {
      const cause = world.events[ev.cause];
      const struck = cause && (cause.type === 'hit' || cause.type === 'crit') && cause.t >= ev.t - 2;
      if (ev.type === 'downed' || ev.type === 'ko') {
        // The blow that put them down: the victim's face, with whoever landed it in the shot.
        if (struck && who.has(ev.b)) {
          const before = candidates.length;
          add(t + 2, ev.b, ev.type === 'ko' ? 170 : 150, 'finisher', { ...by(ev.a !== ev.b ? ev.a : -1), ...blowFrom(cause) });
          if (ev.type === 'ko' && candidates.length > before) lastKo = candidates[candidates.length - 1]!;
          add(t, ev.a, 90, 'ko', by(ev.b));
        }
      } else if (ev.type === 'crit') {
        add(t + 2, ev.b, 100 + Math.min(40, ev.v), 'hurt', { ...by(ev.a), ...blowFrom(ev) });
        add(t, ev.a, 60 + Math.min(30, ev.v), 'crit', by(ev.b));
      } else if (ev.type === 'attack' && critters.has(ev.a)) {
        // An animal (or a summoned person) going for a fighter.
        const c = critters.get(ev.a)!;
        add(t + 1, ev.b, 150, 'critter', { with: ev.a, withName: c.owner, critter: c.summon });
      } else if (ev.type === 'panic' && ev.s.startsWith('fear:')) {
        const c = critters.get(ev.b);
        add(t + 3, ev.a, 140, 'spooked', c ? { with: ev.b, withName: c.owner, critter: c.summon } : {});
      } else if (ev.type === 'abilityCast') add(t, ev.a, seniors.has(ev.s) ? 100 : 50, 'move');
    }
  }
  // The fight's last knockout is the one people talk about.
  if (lastKo) lastKo.score += 40;
  if (!candidates.length) return null;

  const rng = Rng.fromSeed(`photo:${input.seed}`);
  // Who's in it: our side a little more, the main character no more than anyone, last time's subject less.
  for (const c of candidates) {
    if (c.team === 0) c.score *= 1.15;
    if (main.includes(c.snap)) c.score *= 0.95;
    if (last && c.name === last.name) c.score *= 0.6;
  }
  // Draw a kind of shot, then one of its best few.
  const byKind = new Map<PhotoMoment['kind'], Candidate[]>();
  for (const c of candidates) byKind.set(c.kind, [...(byKind.get(c.kind) ?? []), c]);
  const kinds = [...byKind.keys()].sort();
  const kindWeight = (k: PhotoMoment['kind']) => {
    const best = Math.max(...byKind.get(k)!.map((c) => c.score));
    return KIND_WEIGHT[k] * (best / 150) * (last?.kind === k ? 0.4 : 1);
  };
  const kind = weighted(rng, kinds, kindWeight);
  const pool = byKind
    .get(kind)!
    .sort((a, b) => b.score - a.score || a.tick - b.tick)
    .slice(0, 3);
  const best = weighted(rng, pool, (c) => c.score * c.score);
  const { score: _s, snap: _n, ...moment } = best;
  // Vary the framing and the face from fight to fight (same fight, same photo).
  const twoShot = moment.with !== undefined;
  const zooms = moment.kind === 'air' ? AIR_ZOOMS : twoShot ? [1, 1, 0.9] : ZOOMS;
  const zoom = zooms[rng.int(zooms.length)]!;
  const face: PhotoMoment['face'] =
    moment.kind === 'spooked' ? 'surprised' : moment.kind === 'critter' ? (rng.int(2) ? 'surprised' : 'hurt') : moment.kind === 'air' ? (rng.int(2) ? 'hurt' : 'surprised') : moment.kind === 'finisher' ? (rng.int(4) ? 'hurt' : 'surprised') : moment.kind === 'hurt' ? (rng.int(3) ? 'hurt' : 'surprised') : null;
  return { ...moment, zoom, face, variant: rng.int(1000) / 1000 };
}

function weighted<T>(rng: Rng, items: T[], weight: (x: T) => number): T {
  const ws = items.map((x) => Math.max(0, weight(x)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return items[0]!;
  let r = (rng.int(1_000_000) / 1_000_000) * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
