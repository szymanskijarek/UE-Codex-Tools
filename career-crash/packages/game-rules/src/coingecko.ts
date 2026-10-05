import type { MarketCoin, MarketSnapshot } from './markets';

/**
 * CoinGecko → market snapshots (08 §10). Pure: the hourly feed worker and the
 * balance recorder both turn CoinGecko's JSON into the same `MarketSnapshot`.
 */

/** The fields we read from `/coins/markets?price_change_percentage=1h,24h&sparkline=true`. */
export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  current_price: number | null;
  market_cap_rank: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_24h?: number | null;
  sparkline_in_7d?: { price?: number[] } | null;
}

/** How many coins a snapshot keeps (enough for the field after exclusions, and for the bench). */
export const SNAPSHOT_COINS = 30;
/** Sparkline points kept: the last 24 hours, hourly. */
const SPARK_POINTS = 25;

/** `2026-10-05T14` for a time (UTC hour). */
export function hourOf(ms: number): string {
  return new Date(Math.floor(ms / 3_600_000) * 3_600_000).toISOString().slice(0, 13);
}

const bp = (pct: number | null | undefined): number => (typeof pct === 'number' && Number.isFinite(pct) ? Math.round(pct * 100) : 0);

/** Prices rounded so snapshots stay small: 2 decimals, more for cheap coins (about 4 significant figures). */
function tidy(p: number): number {
  if (!Number.isFinite(p) || p <= 0) return 0;
  const digits = Math.max(2, 3 - Math.floor(Math.log10(p)));
  return Number(p.toFixed(Math.min(10, digits)));
}

/** One hour's snapshot from a `/coins/markets` response (any order; ranked by market cap). */
export function snapshotFromCoinGecko(rows: CoinGeckoMarket[], hour: string, market = 'market.crypto'): MarketSnapshot {
  const seen = new Set<string>();
  const coins: MarketCoin[] = [];
  const ranked = rows.filter((r) => r.market_cap_rank && r.current_price).sort((a, b) => a.market_cap_rank! - b.market_cap_rank!);
  for (const r of ranked) {
    const symbol = r.symbol.toUpperCase();
    // Two coins with one ticker: the bigger one keeps it.
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    const spark = (r.sparkline_in_7d?.price ?? []).slice(-SPARK_POINTS).map(tidy);
    coins.push({
      symbol,
      capRank: r.market_cap_rank!,
      price: tidy(r.current_price!),
      changeBp: bp(r.price_change_percentage_1h_in_currency),
      change24Bp: bp(r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h),
      ...(spark.length > 1 ? { spark } : {}),
    });
    if (coins.length >= SNAPSHOT_COINS) break;
  }
  return { market, hour, coins };
}

/** One coin's hourly price history (`/coins/{id}/market_chart` → `prices`). */
export interface PriceHistory {
  symbol: string;
  capRank: number;
  prices: [number, number][];
}

/** The last price at or before `ms`, or null. */
function priceAt(prices: [number, number][], ms: number): number | null {
  let best: number | null = null;
  for (const [t, p] of prices) {
    if (t > ms) break;
    best = p;
  }
  return best;
}

/**
 * Past hours rebuilt from price histories, for balance runs on real markets:
 * each hour's 1h change is the price at the hour against an hour before.
 * Ranks are today's, which is close enough for a field of ten.
 */
export function snapshotsFromHistory(histories: PriceHistory[], hours: string[], market = 'market.crypto'): MarketSnapshot[] {
  const out: MarketSnapshot[] = [];
  for (const hour of hours) {
    const at = Date.parse(`${hour}:00:00Z`);
    const coins: MarketCoin[] = [];
    for (const h of histories) {
      const now = priceAt(h.prices, at);
      const before = priceAt(h.prices, at - 3_600_000);
      const dayAgo = priceAt(h.prices, at - 86_400_000);
      if (!now || !before) continue;
      const spark = h.prices.filter(([t]) => t <= at && t > at - 86_400_000).map(([, p]) => tidy(p));
      coins.push({
        symbol: h.symbol.toUpperCase(),
        capRank: h.capRank,
        price: tidy(now),
        changeBp: Math.round(((now - before) / before) * 10000),
        ...(dayAgo ? { change24Bp: Math.round(((now - dayAgo) / dayAgo) * 10000) } : {}),
        ...(spark.length > 1 ? { spark: spark.slice(-SPARK_POINTS) } : {}),
      });
    }
    if (coins.length) out.push({ market, hour, coins });
  }
  return out;
}
