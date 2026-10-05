import type { ContentBundle, MarketDef } from '@cc/content-schema';
import { STAT_KEYS } from '@cc/content-schema/constants';
import { Rng, SIM_VERSION, TICKS_PER_SECOND, type BattleEvent, type BattleInput, type CharCounters, type CharacterSnapshot } from '@cc/sim';
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
  const snap: CharacterSnapshot = { ...careerSnapshot(bundle, f), loadout: [], persona: m.persona };
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

/** The battle for one candle of an hour (08 §4.2). */
export function candleInput(bundle: ContentBundle, def: MarketDef, snapshot: MarketSnapshot, candle: number): BattleInput {
  const scored = scoreField(def, snapshot.coins);
  return {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed: `${def.id}:${snapshot.hour}`,
    arenaId: def.arena,
    mode: 'ffa',
    teams: scored.map((c) => ({ playerId: c.symbol.toUpperCase(), playerName: c.symbol.toUpperCase(), rating: 1000, characters: [marketFighter(bundle, def, c)] })),
    modifiers: [],
    endless: {
      round: candle,
      ticks: candleFightTicks(def, candle),
      relistTicks: def.candle.relistTicks,
      liquidatedTicks: def.candle.liquidatedTicks,
      shieldTicks: def.candle.shieldTicks,
      spawns: def.spawns.map(([x, y]) => [x, y]),
      ...(def.referee ? { referee: { name: def.referee.name, persona: def.referee.persona } } : {}),
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
  const byEntity = new Map<number, number>(fighters.map((f) => [f.id, f.team]));
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
