import type { ContentBundle, MarketDef } from '@cc/content-schema';
import { Rng, SIM_VERSION, type BattleEvent, type BattleInput, type CharacterSnapshot, type CrasherInput, type CrashTrigger } from '@cc/sim';
import { rollCrashers } from './crashers';
import { candleEvents, candleFightTicks, castMember, marketFighter, type ScoredCoin } from './markets';

/**
 * Diplomatic Incident (09): countries in an endless brawl, ten on the floor
 * and the rest in the lobby. Viewers' likes, frozen at the start of each
 * session, set each delegate's power and nudge the lobby order. Everything
 * here is pure: the same likes give every viewer the same session.
 */

/** Likes so far this hour, by country key (`PL`, `ENG`…), as frozen at a session's start. */
export type LikeTally = Record<string, number>;

export interface ScoredCountry {
  key: string;
  likes: number;
  /** log2(1 + likes), in hundredths. */
  weight: number;
  /** Against the field, in hundredths, clamped to ±score.max (09 §5.2). */
  score: number;
  /** Mandate: starts each walk-on pumped. */
  mandate: boolean;
  /** Under-represented (or abstained): starts each walk-on embarrassed. */
  under: boolean;
  abstained: boolean;
}

/** The countries floor of a bundle. */
export function countriesDef(bundle: ContentBundle): MarketDef {
  const def = bundle.markets.find((m) => m.source === 'likes');
  if (!def) throw new Error('no likes floor in the bundle');
  return def;
}

/** Every country in the cast, in a stable order. */
export function countryKeys(def: MarketDef): string[] {
  return Object.keys(def.cast).sort();
}

/**
 * 100 × log2(n), in integers only, so every JS engine gets the same answer
 * (`Math.log2` isn't guaranteed to be bit-identical everywhere). Seven
 * fraction bits by repeated squaring: good to about 0.01.
 */
export function log2x100(n: number): number {
  if (n <= 1) return 0;
  let k = 0;
  while (2 ** (k + 1) <= n) k++;
  const ONE = 1 << 16;
  let y = Math.floor((n * ONE) / 2 ** k);
  let frac = 0;
  for (let b = 0; b < 7; b++) {
    y = Math.floor((y * y) / ONE);
    frac <<= 1;
    if (y >= 2 * ONE) {
      y = Math.floor(y / 2);
      frac |= 1;
    }
  }
  return Math.floor(((k * 128 + frac) * 100 + 64) / 128);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

/**
 * Score every country against the others that got likes (09 §5.2): log
 * scale, relative to the median, in units of the field's typical spread. A
 * country nobody has liked gets `abstainScore`.
 */
export function scoreLikes(def: MarketDef, tally: LikeTally): ScoredCountry[] {
  const L = def.likes!;
  const keys = countryKeys(def);
  const rows = keys.map((key) => {
    const likes = Math.max(0, Math.floor(tally[key] ?? 0));
    return { key, likes, weight: log2x100(1 + likes) };
  });
  const liked = rows.filter((r) => r.likes > 0).map((r) => r.weight);
  const mid = median(liked);
  const spread = Math.max(def.score.spreadFloor, median(liked.map((w) => Math.abs(w - mid))));
  const max = def.score.max;
  return rows.map((r) => {
    const abstained = r.likes === 0;
    const score = abstained ? Math.max(-max, Math.min(max, L.abstainScore)) : Math.max(-max, Math.min(max, Math.round(((r.weight - mid) * 100) / spread)));
    return { ...r, score, abstained, mandate: !abstained && score >= def.power.pumpAt, under: score <= def.power.dumpAt };
  });
}

/** The derby on in this hour, if any (09 §8.6). */
export function derbyOf(def: MarketDef, hour: string): { id: string; a: string; b: string } | undefined {
  const h = Number(hour.slice(11, 13));
  const d = def.derbies?.find((x) => x.hours.includes(h) && def.cast[x.a] && def.cast[x.b]);
  return d ? { id: d.id, a: d.a, b: d.b } : undefined;
}

/**
 * The Host (09 §4.2): of the countries with at least one like (all of them
 * when nobody has liked anyone yet), the one whose local time is nearest
 * 20:00 at the start of the hour. Ties go to the alphabetically first key.
 */
export function hostOf(def: MarketDef, hour: string, tally: LikeTally): string {
  const utcMin = Number(hour.slice(11, 13)) * 60;
  const keys = countryKeys(def);
  const pool = keys.some((k) => (tally[k] ?? 0) > 0) ? keys.filter((k) => (tally[k] ?? 0) > 0) : keys;
  let best = pool[0]!;
  let bestGap = Infinity;
  for (const k of pool) {
    const local = (((utcMin + (def.cast[k]!.tzMin ?? 0)) % 1440) + 1440) % 1440;
    const gap = Math.min(Math.abs(local - 1200), 1440 - Math.abs(local - 1200));
    if (gap < bestGap) {
      best = k;
      bestGap = gap;
    }
  }
  return best;
}

export interface Lineup {
  /** Every country in walk-on order: the first `seats` start on the floor, the rest wait in the lobby. */
  order: string[];
  host: string;
  derby?: { id: string; a: string; b: string };
  /** Lobby places that went to a Wildcard (09 §4.2). */
  wildcards: string[];
}

/**
 * Who starts on the floor and in what order the lobby walks on (09 §4.2).
 * Derby pair first (in a derby hour), then the Host, then everyone by
 * priority: a seeded stand-in for time waited, plus a boost per doubling of
 * likes. Every `wildcardEvery`-th place in the lobby goes to a country with
 * fewer likes than the median, so small countries get their turn.
 */
export function sessionLineup(def: MarketDef, hour: string, session: number, tally: LikeTally): Lineup {
  const L = def.likes!;
  const seats = def.candle.seats ?? def.field;
  const scored = scoreLikes(def, tally);
  const rng = Rng.fromSeed(`lineup:${def.id}:${hour}#${session}`);
  const derby = derbyOf(def, hour);
  const host = hostOf(def, hour, tally);
  const first: string[] = [];
  for (const k of [derby?.a, derby?.b, host]) if (k && !first.includes(k)) first.push(k);
  // Seconds "waited": a fresh draw each session, so the rotation is fair across the hour.
  const prio = new Map(scored.map((c) => [c.key, rng.int(300) + Math.floor((c.weight * L.lobbyBoostS) / 100)]));
  const rest = scored.map((c) => c.key).filter((k) => !first.includes(k));
  rest.sort((a, b) => prio.get(b)! - prio.get(a)! || (a < b ? -1 : 1));
  const mid = median(scored.map((c) => c.weight));
  const small = rest.filter((k) => scored.find((c) => c.key === k)!.weight < mid || (tally[k] ?? 0) === 0);
  // Wildcards: drawn from the smaller countries, in a seeded order.
  const pool = [...small];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const order = [...first];
  const wildcards: string[] = [];
  const left = new Set(rest);
  while (left.size > 0) {
    const lobbyPlace = order.length - seats + 1;
    let next: string | undefined;
    if (lobbyPlace > 0 && lobbyPlace % L.wildcardEvery === 0) {
      next = pool.find((k) => left.has(k));
      if (next) wildcards.push(next);
    }
    next ??= rest.find((k) => left.has(k))!;
    order.push(next);
    left.delete(next);
  }
  return { order, host, ...(derby ? { derby } : {}), wildcards };
}

/** A country's delegate for the session (09 §5.2): the same build all hour, power from the score. */
export function delegate(bundle: ContentBundle, def: MarketDef, c: ScoredCountry, rivals: string[] = []): CharacterSnapshot {
  const coin: ScoredCoin = { symbol: c.key, changeBp: 0, capRank: 0, score: c.score, pumping: c.mandate, dumping: c.under, leveraged: false };
  const snap = marketFighter(bundle, def, coin);
  if (rivals.length) snap.rivals = rivals;
  return snap;
}

/** The snapshot id a country's delegate gets (for rivals). */
export function delegateId(def: MarketDef, key: string): string {
  return `${def.id.replace('market.', '')}-${key.toLowerCase()}`;
}

/** Countries whose score jumped by at least `surgeAt` since the last session (09 §5.4). */
export function surgesOf(def: MarketDef, scored: ScoredCountry[], prevTally?: LikeTally): string[] {
  if (!prevTally) return [];
  const prev = new Map(scoreLikes(def, prevTally).map((c) => [c.key, c.score]));
  return scored.filter((c) => c.score - (prev.get(c.key) ?? c.score) >= def.likes!.surgeAt).map((c) => c.key);
}

/**
 * The institution that may raid a session (09 §7.2): a seeded draw per
 * session, by weight; a session that opens with a SURGE always gets the
 * institution that chases them (Big Tech).
 * Whether it actually comes in is up to its trigger on the floor: NATO only
 * when no member is standing, the UN and the ICC after a run of knockouts.
 */
export function sessionRaid(bundle: ContentBundle, def: MarketDef, hour: string, session: number, order: string[], ticks: number, surge: boolean, mandates: string[] = []): CrasherInput | undefined {
  const cfg = def.institutions;
  const list = cfg?.list.filter((i) => !i.off) ?? [];
  if (!cfg || !list.length) return undefined;
  const rng = Rng.fromSeed(`raid:${def.id}:${hour}#${session}`);
  const roll = rng.int(10000);
  // A SURGE always brings whoever follows the trends (Big Tech); otherwise a draw.
  const chasers = surge ? list.filter((i) => i.needsSurge) : [];
  if (!chasers.length && roll >= cfg.chanceBp) return undefined;
  const derby = !!derbyOf(def, hour);
  const pool = chasers.length ? chasers : list.filter((i) => !i.needsSurge && (!i.derbyOnly || derby) && (!i.mandate || mandates.length));
  if (!pool.length) return undefined;
  let r = rng.int(pool.reduce((n, i) => n + i.weight, 0));
  const pick = pool.find((i) => (r -= i.weight) < 0) ?? pool[0]!;
  const crash = rollCrashers(bundle, `${def.id}:${hour}#${session}`, def.arena, Math.max(1, def.power.baseLevel + pick.levelOffset), def.power.rank, { set: pick.set, size: pick.size });
  if (!crash) return undefined;
  const teamsOf = (keep: (k: string) => boolean) => order.map((k, i) => (keep(k) ? i : -1)).filter((i) => i >= 0);
  const members = pick.absentTag ? teamsOf((k) => !!def.cast[k]?.tags?.includes(pick.absentTag!)) : [];
  if (pick.absentTag && (!members.length || members.length === order.length)) return undefined;
  const present = pick.presentTag ? teamsOf((k) => !!def.cast[k]?.tags?.includes(pick.presentTag!.tag)) : [];
  const liked = pick.mandate ? teamsOf((k) => mandates.includes(k)) : [];
  const when: CrashTrigger = {
    ...(members.length ? { noneStanding: members, ...(pick.absentFew ? { few: pick.absentFew } : {}) } : {}),
    ...(pick.koStreak ? { koStreak: { ...pick.koStreak } } : {}),
    ...(pick.presentTag ? { someStanding: { teams: present, atLeast: pick.presentTag.atLeast } } : liked.length ? { someStanding: { teams: liked, atLeast: 1 } } : {}),
    ...(pick.statusCount ? { statusCount: { statuses: [...pick.statusCount.statuses], n: pick.statusCount.n } } : {}),
    ...(pick.koedTimes ? { koedTimes: pick.koedTimes } : {}),
  };
  // No trigger: they just turn up, at a seeded moment (Big Oil).
  const tick = pick.earliestTick + (pick.spreadTicks ? rng.int(pick.spreadTicks + 1) : 0);
  return {
    ...crash,
    tick,
    until: Math.max(tick + 1, ticks - 600),
    minActiveBp: 0,
    stance: pick.stance,
    ...(pick.leaveAtBp !== undefined ? { leaveAtBp: pick.leaveAtBp } : {}),
    ...(pick.leaveAfterTicks !== undefined ? { leaveAfterTicks: pick.leaveAfterTicks } : {}),
    ...(members.length ? { leaveIfStanding: members } : {}),
    ...(Object.keys(when).length ? { when } : {}),
    ...(pick.mount ? { mount: pick.mount } : {}),
  };
}

/**
 * The battle for one session of an hour (09 §5.3). `prevTally` is the last
 * session's frozen likes, for SURGEs (and so Big Tech).
 */
export function sessionInput(bundle: ContentBundle, def: MarketDef, hour: string, session: number, tally: LikeTally, prevTally?: LikeTally): { input: BattleInput; lineup: Lineup; scored: ScoredCountry[]; surges: string[] } {
  const scored = scoreLikes(def, tally);
  const surges = surgesOf(def, scored, prevTally);
  const lineup = sessionLineup(def, hour, session, tally);
  const byKey = new Map(scored.map((c) => [c.key, c]));
  const d = lineup.derby;
  const ticks = candleFightTicks(def, session);
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed: `${def.id}:${hour}`,
    arenaId: def.arena,
    mode: 'ffa',
    teams: lineup.order.map((k) => {
      const rivals = d && (k === d.a || k === d.b) ? [delegateId(def, k === d.a ? d.b : d.a)] : [];
      return { playerId: k, playerName: k, rating: 1000, characters: [delegate(bundle, def, byKey.get(k)!, rivals)] };
    }),
    modifiers: [],
    endless: {
      round: session,
      ticks,
      relistTicks: def.candle.relistTicks,
      liquidatedTicks: def.candle.liquidatedTicks,
      shieldTicks: def.candle.shieldTicks,
      spawns: def.spawns.map(([x, y]) => [x, y]),
      seats: def.candle.seats ?? def.field,
      walkOnTicks: def.candle.walkOnTicks ?? def.candle.relistTicks,
      // A derby's two sides keep their seats all hour (09 §8.6).
      ...(d ? { resident: [0, 1] } : {}),
      ...(def.referee ? { referee: { name: def.referee.name, persona: def.referee.persona } } : {}),
      ...(def.events ? { events: candleEvents(def, { market: def.id, hour, coins: [] }, session, ticks) } : {}),
    },
  };
  const raid = sessionRaid(bundle, def, hour, session, lineup.order, ticks, surges.length > 0, scored.filter((c) => c.mandate).map((c) => c.key));
  if (raid) input.crashers = raid;
  return { input, lineup, scored, surges };
}

/** One country's line in the standings (09 §4.5). */
export interface Influence {
  key: string;
  points: number;
  kos: number;
  koed: number;
  damage: number;
  /** Seconds on the floor. */
  floorS: number;
  walkOns: number;
  sessionsWon: number;
}

export function emptyInfluence(keys: string[]): Influence[] {
  return keys.map((key) => ({ key, points: 0, kos: 0, koed: 0, damage: 0, floorS: 0, walkOns: 0, sessionsWon: 0 }));
}

/**
 * Tally a session so far, from the event log alone (delegates who were
 * escorted out are gone from the world, not from the log). `teams` are the
 * input's teams in order, so `teams[i]` names side i; `tick` is how far the
 * session has run.
 */
export function tallySession(def: MarketDef, teams: string[], events: BattleEvent[], tick: number): Influence[] {
  const team = new Map<number, number>();
  const since = new Map<number, number>();
  const rows = emptyInfluence(teams);
  const p = def.points;
  for (const e of events) {
    if (e.type === 'spawn') {
      // Delegates only: not critters, the referee or gatecrashers.
      if (e.v >= 0 && e.v < teams.length && !e.s.startsWith('summon.')) {
        team.set(e.a, e.v);
        since.set(e.a, e.t);
        rows[e.v]!.walkOns++;
      }
    } else if (e.type === 'ko') {
      const victim = team.get(e.b);
      if (victim === undefined) continue;
      rows[victim]!.koed++;
      const killer = team.get(e.a);
      if (killer !== undefined && killer !== victim) rows[killer]!.kos++;
    } else if (e.type === 'hit' || e.type === 'crit') {
      const by = team.get(e.a);
      if (by !== undefined && team.has(e.b)) rows[by]!.damage += e.v;
    } else if (e.type === 'walkon') {
      const gone = team.get(e.b);
      const at = since.get(e.b);
      if (gone !== undefined && at !== undefined) rows[gone]!.floorS += (e.t - at) / 20;
      since.delete(e.b);
    }
  }
  for (const [id, at] of since) {
    const t = team.get(id);
    if (t !== undefined) rows[t]!.floorS += (tick - at) / 20;
  }
  for (const r of rows) {
    r.floorS = Math.floor(r.floorS);
    r.points = r.kos * p.ko + r.koed * p.koed + Math.floor(r.damage / p.damagePer) + (p.secondsPer ? Math.floor(r.floorS / p.secondsPer) : 0);
  }
  return rows;
}

/** Add a finished session to the hour's table; its top scorer gets the session bonus. */
export function addInfluence(def: MarketDef, total: Influence[], session: Influence[]): Influence[] {
  const best = Math.max(0, ...session.map((r) => r.points));
  return total.map((t) => {
    const s = session.find((r) => r.key === t.key);
    if (!s) return t;
    const won = best > 0 && s.points === best ? 1 : 0;
    return {
      key: t.key,
      points: t.points + s.points + won * def.points.candle,
      kos: t.kos + s.kos,
      koed: t.koed + s.koed,
      damage: t.damage + s.damage,
      floorS: t.floorS + s.floorS,
      walkOns: t.walkOns + s.walkOns,
      sessionsWon: t.sessionsWon + won,
    };
  });
}

/**
 * Sample likes for the prototype page (09 §12 phase 1, until the vote service
 * exists): a seeded long-tail spread that grows through the hour, so the
 * floor looks like a real crowd is voting.
 */
export function sampleTally(def: MarketDef, hour: string, session: number): LikeTally {
  const keys = countryKeys(def);
  const rng = Rng.fromSeed(`sample-likes:${def.id}:${hour}`);
  const order = [...keys];
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const out: LikeTally = {};
  const base = def.likes!.sampleBase;
  // Two countries go viral at some point in the hour: from then on their likes come in four times as fast (a SURGE).
  const viral = new Map([0, 1].map(() => [order[4 + rng.int(keys.length - 8)]!, 1 + rng.int(11)]));
  order.forEach((k, i) => {
    const hourly = Math.floor(base / (i + 1)) + rng.int(40);
    const from = viral.get(k);
    const extra = from !== undefined && session >= from ? 3 * hourly * (session - from + 1) : 0;
    // Nobody likes the bottom few yet.
    out[k] = i >= keys.length - 4 ? 0 : Math.floor((hourly * (session + 1) + extra) / 12);
  });
  return out;
}

/** The delegate's display bits for a key (persona, name, colour, flag). */
export function countryInfo(def: MarketDef, key: string) {
  const m = castMember(def, key);
  return { key, name: m.name, persona: m.persona, color: m.art.color, icon: m.art.icon, flag: m.flag ?? '', career: m.career, popM: m.popM ?? 0 };
}
