import type { MarketDef } from '@cc/content-schema';
import type { MarketCoin, MarketSnapshot } from './markets';

/**
 * Alpaca market data → stock snapshots (13 §10.2). Pure: the feed worker turns
 * one `GET /v2/stocks/snapshots?symbols=…&feed=iex` answer into the period's
 * `MarketSnapshot`. A stock's change is today's: its latest trade against
 * yesterday's close, as every stock app shows it.
 */

/** The fields we read from one symbol's snapshot. */
export interface AlpacaSnapshot {
  latestTrade?: { p?: number } | null;
  prevDailyBar?: { c?: number } | null;
}

/** Sparkline points kept: today's half-hourly prices, from yesterday's close. */
const SPARK_POINTS = 15;

/** Every symbol the feed asks for: the universe and the benchmark. */
export function alpacaSymbols(def: MarketDef): string[] {
  return [...(def.universe ?? Object.keys(def.cast)), ...(def.benchmark ? [def.benchmark] : [])];
}

const change = (s: AlpacaSnapshot | undefined): number | null => {
  const p = s?.latestTrade?.p;
  const c = s?.prevDailyBar?.c;
  return p && c ? Math.round((p / c - 1) * 10000) : null;
};

/**
 * The period's snapshot. `prev` (the newest snapshot on file) carries today's
 * sparkline forward; on a new day it starts again from yesterday's close.
 */
export function snapshotFromAlpaca(def: MarketDef, rows: Record<string, AlpacaSnapshot>, hour: string, prev?: MarketSnapshot | null): MarketSnapshot {
  const sameDay = prev?.hour.slice(0, 10) === hour.slice(0, 10);
  const coins: MarketCoin[] = [];
  (def.universe ?? Object.keys(def.cast)).forEach((symbol, i) => {
    const s = rows[symbol];
    const bp = change(s);
    if (bp === null) return;
    const price = Number(s!.latestTrade!.p!.toFixed(2));
    const before = sameDay ? prev!.coins.find((c) => c.symbol === symbol)?.spark : undefined;
    const spark = [...(before ?? [Number(s!.prevDailyBar!.c!.toFixed(2))]), price].slice(-SPARK_POINTS);
    coins.push({ symbol, capRank: i + 1, price, changeBp: bp, spark });
  });
  const benchmarkBp = def.benchmark ? change(rows[def.benchmark]) : null;
  return { market: def.id, hour, coins, ...(benchmarkBp !== null ? { benchmarkBp } : {}) };
}
