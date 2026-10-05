import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@cc/content';
import { hourOf, snapshotsFromHistory, type CoinGeckoMarket, type PriceHistory } from '@cc/game-rules';

/**
 * Records real market hours for `pnpm balance --markets` (08 §5.3): the top
 * coins' hourly prices over the last few days from CoinGecko's public API,
 * rebuilt into one snapshot per hour. Run it now and then to refresh
 * `tools/balance/data/crypto-hours.json`:
 *
 *   pnpm balance --record-markets [--hours=48]
 *
 * Keyless requests are rate-limited, so it waits between coins (about two minutes in all).
 * Set COINGECKO_KEY to use a free Demo key instead.
 */
const API = 'https://api.coingecko.com/api/v3';
const WAIT_MS = 7000;

async function get<T>(path: string): Promise<T> {
  const key = process.env.COINGECKO_KEY;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${API}${path}`, { headers: { accept: 'application/json', ...(key ? { 'x-cg-demo-api-key': key } : {}) } });
    if (r.ok) return (await r.json()) as T;
    if (r.status !== 429) throw new Error(`${path}: HTTP ${r.status}`);
    await new Promise((res) => setTimeout(res, 30_000));
  }
  throw new Error(`${path}: rate limited`);
}

export async function recordMarkets(hours: number): Promise<string> {
  const def = bundle.markets.find((m) => m.id === 'market.crypto')!;
  const rows = await get<CoinGeckoMarket[]>('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1');
  // The field plus a few spares, so coins moving in and out of the top 10 are covered.
  const wanted = rows.filter((r) => r.market_cap_rank && !def.exclude.includes(r.symbol.toUpperCase())).slice(0, def.field + 4);
  const histories: PriceHistory[] = [];
  for (const r of wanted) {
    await new Promise((res) => setTimeout(res, WAIT_MS));
    const chart = await get<{ prices: [number, number][] }>(`/coins/${r.id}/market_chart?vs_currency=usd&days=${Math.ceil(hours / 24) + 2}`);
    histories.push({ symbol: r.symbol, capRank: r.market_cap_rank!, prices: chart.prices });
    console.log(`  ${r.symbol.toUpperCase()}: ${chart.prices.length} prices`);
  }
  const last = Date.parse(`${hourOf(Date.now())}:00:00Z`);
  const list = Array.from({ length: hours }, (_, i) => hourOf(last - (hours - i) * 3_600_000));
  const snaps = snapshotsFromHistory(histories, list, def.id);
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'crypto-hours.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ recorded: new Date().toISOString(), source: 'CoinGecko', hours: snaps }) + '\n');
  return `${snaps.length} hours (${list[0]} → ${list[list.length - 1]}) → ${out}`;
}
