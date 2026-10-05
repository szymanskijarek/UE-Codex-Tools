import type { ContentBundle, MarketDef } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import { Rng, SIM_VERSION, TICKS_PER_SECOND, type BattleEvent, type BattleInput, type CharCounters, type CharacterSnapshot, type CrasherInput, type EndlessEvent } from '@cc/sim';
import { rollCrashers } from './crashers';
import { careerSnapshot, DIFFICULTIES, generatedFighter, type DifficultyDef } from './skills';

/**
 * Market floors (08): the top contenders of a live market as fighters in an
 * endless brawl. Everything here is pure: the same snapshot gives every viewer
 * the same bros, the same candles and the same fights.
 */

/** One contender in an hourly snapshot. Changes are in basis points (1% = 100). */
export interface MarketCoin {
  symbol: string;
  /** Change over the last hour. */
  changeBp: number;
  /** Change over the last 24 hours (display only). */
  change24Bp?: number;
  /** Rank by market cap (1 = biggest). */
  capRank: number;
  /** Prices over the last 24 h, oldest first (display only). */
  spark?: number[];
  price?: number;
}

/** What the hourly feed publishes (08 §10). */
export interface MarketSnapshot {
  market: string;
  /** The hour this snapshot covers, UTC: `2026-10-05T14`. */
  hour: string;
  coins: MarketCoin[];
}

export interface ScoredCoin extends MarketCoin {
  /** Against the field, in hundredths, clamped to ±score.max (08 §5.1). */
  score: number;
  pumping: boolean;
  dumping: boolean;
  leveraged: boolean;
}

/** The contenders who fight: excluded symbols dropped, the biggest `field` by market cap. */
export function pickField(def: MarketDef, coins: MarketCoin[]): MarketCoin[] {
  const out = coins.filter((c) => !def.exclude.includes(c.symbol.toUpperCase()));
  out.sort((a, b) => a.capRank - b.capRank || (a.symbol < b.symbol ? -1 : 1));
  return out.slice(0, def.field);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

/**
 * Score each contender against the rest (08 §5.1): how far its hourly change
 * is from the field's median, in units of the field's typical spread. A red
 * hour still has winners: whoever fell least.
 */
export function scoreField(def: MarketDef, coins: MarketCoin[]): ScoredCoin[] {
  const field = pickField(def, coins);
  const changes = field.map((c) => c.changeBp);
  const mid = median(changes);
  const spread = Math.max(def.score.spreadFloor, median(changes.map((c) => Math.abs(c - mid))));
  const max = def.score.max;
  const scored = field.map((c) => {
    const score = Math.max(-max, Math.min(max, Math.round(((c.changeBp - mid) * 100) / spread)));
    return { ...c, score, pumping: score >= def.power.pumpAt, dumping: score <= def.power.dumpAt, leveraged: c.changeBp <= def.power.leverageAt };
  });
  // The field's worst performer, if it's off the scale, is over-leveraged too (08 §5.2).
  const worst = [...scored].sort((a, b) => a.score - b.score || a.changeBp - b.changeBp)[0];
  if (worst && worst.score <= -max) worst.leveraged = true;
  return scored;
}

/** The market's mood: the field's median hourly change (08 §6). */
export function marketMood(def: MarketDef, coins: MarketCoin[]): number {
  return median(pickField(def, coins).map((c) => c.changeBp));
}

export function castMember(def: MarketDef, symbol: string) {
  const sym = symbol.toUpperCase();
  return def.cast[def.aliases?.[sym] ?? sym] ?? def.anon;
}

const ALL_SKILLS: DifficultyDef = { ...DIFFICULTIES[2]!, allSkills: true };

/**
 * A contender's fighter for the hour (08 §5.2). The build (looks, stat spread,
 * skills) is the same every hour; only the power moves with the score.
 */
export function marketFighter(bundle: ContentBundle, def: MarketDef, coin: ScoredCoin): CharacterSnapshot {
  const m = castMember(def, coin.symbol);
  const sym = coin.symbol.toUpperCase();
  const id = `${def.id.replace('market.', '')}-${sym.toLowerCase()}`;
  const level = Math.max(1, def.power.baseLevel + Math.round((coin.score * def.power.levelSwing) / def.score.max));
  const rng = Rng.fromSeed(`market:${def.id}:${sym}`);
  const f = generatedFighter(bundle, rng, id, level, def.power.rank, ALL_SKILLS, [m.career]);
  // One career's moves; every other slot becomes stat points (like a boss or gatecrasher).
  const extra = (f.c.careers.length - 1) * 4 + (m.statBonus ?? 0) + Math.round((coin.score * def.power.statSwing) / def.score.max);
  const stats = f.c.stats;
  const keys = STAT_KEYS;
  for (let p = 0, guard = 0; p < Math.abs(extra) && guard < 400; guard++) {
    const k = keys[rng.int(keys.length)]!;
    if (extra < 0 && stats[k] <= 2) continue;
    stats[k] += extra > 0 ? 1 : -1;
    p++;
  }
  f.c.careers = [m.career];
  f.careerXp = { [m.career]: f.careerXp[m.career] ?? 0 };
  f.c.name = m === def.anon ? `${m.name} (${sym})` : m.name;
  f.c.personality = m.personality;
  f.c.traits = [];
  const snap: CharacterSnapshot = { ...careerSnapshot(bundle, f), loadout: [], persona: m.persona, ...(m.moves?.length ? { granted: [...m.moves] } : {}) };
  const mood = coin.pumping ? 'status.pumped' : coin.dumping ? 'status.embarrassed' : '';
  if (mood) snap.startStatuses = [{ status: mood, durationTicks: def.power.moodTicks }];
  if (coin.leveraged) snap.leveraged = true;
  return snap;
}

/** Wall-clock position on the floor (08 §3–4): which hour, which candle, how far into it. */
export interface FloorClock {
  hour: string;
  candle: number;
  candles: number;
  /** Ticks since the candle started. */
  tick: number;
  /** How long this candle's fight runs (the hour's last one is shorter: the Closing Bell follows). */
  fightTicks: number;
  /** The circuit breaker after a candle (08 §4.2). */
  breaker: boolean;
  /** The first seconds of the hour: the Opening Bell (08 §3). */
  opening: boolean;
  /** After the hour's last candle: the Closing Bell. */
  closing: boolean;
  /** Milliseconds until the next candle. */
  msToNext: number;
}

export function candleSlotTicks(def: MarketDef): number {
  return def.candle.ticks + def.candle.breakerTicks;
}

export function candlesPerHour(def: MarketDef): number {
  return Math.max(1, Math.floor((3600 * TICKS_PER_SECOND) / candleSlotTicks(def)));
}

/** How long a candle's fight runs: the last of the hour stops early for the Closing Bell. */
export function candleFightTicks(def: MarketDef, candle: number): number {
  return candle === candlesPerHour(def) - 1 ? def.candle.ticks - def.candle.closingTicks : def.candle.ticks;
}

export function floorClock(def: MarketDef, nowMs: number): FloorClock {
  const hourMs = 3_600_000;
  const start = Math.floor(nowMs / hourMs) * hourMs;
  const slotMs = (candleSlotTicks(def) * 1000) / TICKS_PER_SECOND;
  const candles = candlesPerHour(def);
  const into = nowMs - start;
  const candle = Math.min(candles - 1, Math.floor(into / slotMs));
  const msIn = into - candle * slotMs;
  const tick = Math.floor((msIn * TICKS_PER_SECOND) / 1000);
  const end = candle === candles - 1 ? hourMs : (candle + 1) * slotMs;
  const fightTicks = candleFightTicks(def, candle);
  const last = candle === candles - 1;
  return {
    hour: new Date(start).toISOString().slice(0, 13),
    candle,
    candles,
    tick,
    fightTicks,
    breaker: !last && tick >= fightTicks,
    opening: candle === 0 && tick < def.candle.openingTicks,
    closing: last && tick >= fightTicks,
    msToNext: end - into,
  };
}

/**
 * The candle's scene events (08 §6): one every `gapTicks`, each drawn by weight
 * from the events the hour's mood allows, from a seed of the hour and candle so
 * every viewer sees the same bull at the same moment. Zones land somewhere on
 * the floor (the box around its spawn spots); creatures cross it end to end.
 */
export function candleEvents(def: MarketDef, snapshot: MarketSnapshot, candle: number, ticks: number): EndlessEvent[] {
  const cfg = def.events;
  if (!cfg || cfg.list.length === 0) return [];
  const mood = marketMood(def, snapshot.coins);
  const allowed = cfg.list.filter((e) => (e.minMoodBp === undefined || mood >= e.minMoodBp) && (e.maxMoodBp === undefined || mood <= e.maxMoodBp));
  if (allowed.length === 0) return [];
  const rng = Rng.fromSeed(`events:${def.id}:${snapshot.hour}#${candle}`);
  const xs = def.spawns.map(([x]) => x);
  const ys = def.spawns.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const used = new Map<string, number>();
  const out: EndlessEvent[] = [];
  const [gMin, gMax] = cfg.gapTicks;
  for (let t = cfg.firstTick + rng.int(gMax - gMin + 1); t < ticks - 200; t += gMin + rng.int(gMax - gMin + 1)) {
    const pool = allowed.filter((e) => (used.get(e.id) ?? 0) < (e.maxPerCandle ?? Infinity));
    const total = pool.reduce((n, e) => n + e.weight, 0);
    if (total === 0) break;
    let roll = rng.int(total);
    const e = pool.find((x) => (roll -= x.weight) < 0)!;
    used.set(e.id, (used.get(e.id) ?? 0) + 1);
    const [zw, zh] = e.zoneMm ?? [x1 - x0, y1 - y0];
    const zx = x0 + rng.int(Math.max(1, x1 - x0 - zw + 1));
    const zy = y0 + rng.int(Math.max(1, y1 - y0 - zh + 1));
    const region: [number, number, number, number] = [zx, zy, zw, zh];
    const ev: EndlessEvent = { id: e.id, tick: t, telegraphTicks: e.telegraphTicks, region };
    if (e.action) ev.action = e.action;
    if (e.art) ev.art = { ...e.art, at: [zx + Math.floor(zw / 2), zy + Math.floor(zh / 2)] };
    if (e.mover) {
      const y = y0 + rng.int(y1 - y0 + 1);
      const [from, to] = rng.int(2) === 0 ? [x0 - 2500, x1 + 2500] : [x1 + 2500, x0 - 2500];
      ev.mover = { prop: e.mover.prop, speedMm: e.mover.speedMm, path: [[from, y], [to, y]] };
    }
    out.push(ev);
  }
  return out;
}

/**
 * The Regulators (08 §6): in about one hour in six a gatecrasher set raids the
 * floor, in one candle of the hour picked from the hour's seed. They come at the
 * floor's base level and fight every bro at once; nobody has to be standing for
 * them to come in, and once floored they stay down (they don't re-list).
 */
export function candleRaid(bundle: ContentBundle, def: MarketDef, hour: string, candle: number): CrasherInput | undefined {
  const r = def.regulators;
  if (!r) return undefined;
  const rng = Rng.fromSeed(`raid:${def.id}:${hour}`);
  if (rng.int(10000) >= r.chanceBp || rng.int(candlesPerHour(def)) !== candle) return undefined;
  const raid = rollCrashers(bundle, `${def.id}:${hour}`, def.arena, def.power.baseLevel, def.power.rank, { set: r.set, size: r.size });
  if (!raid) return undefined;
  const latest = Math.min(r.latestTick, candleFightTicks(def, candle) - 600);
  return { ...raid, tick: r.earliestTick + rng.int(Math.max(1, latest - r.earliestTick)), until: latest, minActiveBp: 0 };
}

/** The battle for one candle of an hour (08 §4.2). */
export function candleInput(bundle: ContentBundle, def: MarketDef, snapshot: MarketSnapshot, candle: number): BattleInput {
  const scored = scoreField(def, snapshot.coins);
  const raid = candleRaid(bundle, def, snapshot.hour, candle);
  return {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed: `${def.id}:${snapshot.hour}`,
    arenaId: def.arena,
    mode: 'ffa',
    teams: scored.map((c) => ({ playerId: c.symbol.toUpperCase(), playerName: c.symbol.toUpperCase(), rating: 1000, characters: [marketFighter(bundle, def, c)] })),
    modifiers: [],
    ...(raid ? { crashers: raid } : {}),
    endless: {
      round: candle,
      ticks: candleFightTicks(def, candle),
      relistTicks: def.candle.relistTicks,
      liquidatedTicks: def.candle.liquidatedTicks,
      shieldTicks: def.candle.shieldTicks,
      spawns: def.spawns.map(([x, y]) => [x, y]),
      ...(def.referee ? { referee: { name: def.referee.name, persona: def.referee.persona } } : {}),
      ...(def.events ? { events: candleEvents(def, snapshot, candle, candleFightTicks(def, candle)) } : {}),
    },
  };
}

/** One contender's line in the standings (08 §5.3). */
export interface Standing {
  symbol: string;
  points: number;
  kos: number;
  liquidations: number;
  koed: number;
  liquidated: number;
  damage: number;
  candlesWon: number;
}

interface Fighter {
  id: number;
  team: number;
  counters: Pick<CharCounters, 'damageDealt'>;
}

/**
 * Tally a candle so far: knockouts and liquidations from the event log,
 * damage from each fighter's counters. Teams are in the input's order, one
 * contender each, so `symbols[team]` names them.
 */
export function tallyCandle(def: MarketDef, symbols: string[], events: BattleEvent[], fighters: Fighter[]): Standing[] {
  // Only the market's own contenders score: gatecrashers (a side after theirs) don't.
  const byEntity = new Map<number, number>(fighters.filter((f) => f.team < symbols.length).map((f) => [f.id, f.team]));
  const rows: Standing[] = symbols.map((symbol) => ({ symbol, points: 0, kos: 0, liquidations: 0, koed: 0, liquidated: 0, damage: 0, candlesWon: 0 }));
  for (const e of events) {
    if (e.type !== 'ko' && e.type !== 'liquidated') continue;
    const victim = byEntity.get(e.b);
    if (victim === undefined) continue;
    const killer = byEntity.get(e.a);
    if (e.type === 'ko') {
      rows[victim]!.koed++;
      if (killer !== undefined && killer !== victim) rows[killer]!.kos++;
    } else {
      rows[victim]!.liquidated++;
      if (killer !== undefined && killer !== victim) rows[killer]!.liquidations++;
    }
  }
  for (const f of fighters) if (rows[f.team]) rows[f.team]!.damage += f.counters.damageDealt;
  const p = def.points;
  // A liquidation is also a KO: it scores on top of it, and costs on top of being KO'd.
  for (const r of rows) r.points = r.kos * p.ko + r.liquidations * p.liquidation + r.koed * p.koed + r.liquidated * p.liquidated + Math.floor(r.damage / p.damagePer);
  return rows;
}

/** Add candles together for the hour; the candle's top scorer gets the candle bonus. */
export function addStandings(def: MarketDef, total: Standing[], candle: Standing[]): Standing[] {
  const best = Math.max(...candle.map((r) => r.points));
  return total.map((t) => {
    const c = candle.find((r) => r.symbol === t.symbol);
    if (!c) return t;
    const won = c.points === best && best > 0 ? 1 : 0;
    return {
      symbol: t.symbol,
      points: t.points + c.points + won * def.points.candle,
      kos: t.kos + c.kos,
      liquidations: t.liquidations + c.liquidations,
      koed: t.koed + c.koed,
      liquidated: t.liquidated + c.liquidated,
      damage: t.damage + c.damage,
      candlesWon: t.candlesWon + won,
    };
  });
}

export function emptyStandings(symbols: string[]): Standing[] {
  return symbols.map((symbol) => ({ symbol, points: 0, kos: 0, liquidations: 0, koed: 0, liquidated: 0, damage: 0, candlesWon: 0 }));
}
