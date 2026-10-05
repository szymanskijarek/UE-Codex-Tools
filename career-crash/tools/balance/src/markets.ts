import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentBundle } from '@cc/content-schema';
import { addStandings, candleInput, emptyStandings, scoreField, tallyCandle, type MarketSnapshot } from '@cc/game-rules';
import { simulate } from '@cc/sim';

/**
 * `pnpm balance --markets`: replays recorded real market hours
 * (`data/crypto-hours.json`, from `--record-markets`) through the floor and
 * checks the "usually wins" target (08 §5.3): the coin with the hour's best
 * score should win the hour in 60–75% of hours and finish top 3 in about 90%.
 */
export interface MarketReportOpts {
  hours: number;
  candles: number;
}

/** Spearman rank correlation of two equal-length lists. */
function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((v, i) => [v, i] as const).sort((p, q) => q[0] - p[0]);
    const r = new Array<number>(xs.length);
    order.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const d2 = ra.reduce((s, r, i) => s + (r - rb[i]!) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function marketReport(bundle: ContentBundle, opts: MarketReportOpts): string {
  const def = bundle.markets.find((m) => m.id === 'market.crypto')!;
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'crypto-hours.json');
  const all = (JSON.parse(readFileSync(file, 'utf8')) as { hours: MarketSnapshot[] }).hours;
  // The most recent hours, oldest first.
  const hours = all.slice(-opts.hours);
  let wins = 0;
  let top3 = 0;
  let rho = 0;
  let kos = 0;
  let liqs = 0;
  let ms = 0;
  const rows: string[] = [];
  for (const snap of hours) {
    const scored = scoreField(def, snap.coins);
    const best = [...scored].sort((a, b) => b.score - a.score || b.changeBp - a.changeBp)[0]!.symbol.toUpperCase();
    let total = emptyStandings(scored.map((c) => c.symbol.toUpperCase()));
    for (let c = 0; c < opts.candles; c++) {
      const input = candleInput(bundle, def, snap, c);
      const t0 = performance.now();
      const out = simulate(input, bundle);
      ms += performance.now() - t0;
      const symbols = input.teams.map((t) => t.playerId);
      const fighters = out.result.characters.map((ch) => ({ id: ch.entityId, team: ch.team, counters: ch.counters }));
      const rows = tallyCandle(def, symbols, out.events, fighters);
      kos += out.events.filter((e) => e.type === 'ko' && fighters.some((f) => f.id === e.b)).length;
      liqs += out.events.filter((e) => e.type === 'liquidated').length;
      total = addStandings(def, total, rows);
    }
    const table = [...total].sort((a, b) => b.points - a.points);
    const place = table.findIndex((r) => r.symbol === best) + 1;
    if (place === 1) wins++;
    if (place <= 3) top3++;
    const r = spearman(
      total.map((t) => scored.find((c) => c.symbol.toUpperCase() === t.symbol)!.score),
      total.map((t) => t.points),
    );
    rho += r;
    rows.push(`| ${snap.hour} | ${best} | ${place} | ${table[0]!.symbol} | ${r.toFixed(2)} |`);
  }
  const n = hours.length;
  const candles = n * opts.candles;
  return [
    `# Market floor balance (${n} recorded hours × ${opts.candles} candles)`,
    '',
    `- Best coin wins the hour: **${((100 * wins) / n).toFixed(0)}%** (target 60–75%)`,
    `- Best coin in the top 3: **${((100 * top3) / n).toFixed(0)}%** (target ~90%)`,
    `- Score vs points (Spearman, mean): **${(rho / n).toFixed(2)}**`,
    `- Knockouts per candle: ${(kos / candles).toFixed(1)}; liquidations per hour: ${((liqs / n) * (12 / opts.candles)).toFixed(1)} (scaled to 12 candles)`,
    `- Simulation: ${(ms / candles).toFixed(0)} ms per candle`,
    '',
    '| Hour | Best coin | Its place | Hour winner | ρ |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

/**
 * `pnpm balance --markets-flat`: every bro in a flat market (no coin up or
 * down), so only their builds differ. Each bro's share of the points shows
 * how strong their borrowed moves are; `statBonus` in the market file evens
 * them out (target: every bro within about ±25% of an even share).
 */
export function flatReport(bundle: ContentBundle, opts: { candles: number }): string {
  const def = bundle.markets.find((m) => m.id === 'market.crypto')!;
  const cast = Object.keys(def.cast).sort();
  // Two fields of ten that between them cover every bro, plus Anon Bro.
  const fields = [cast.slice(0, 10), [...cast.slice(10), 'ANON1', 'ANON2', ...cast.slice(0, 10 - cast.slice(10).length - 2)]];
  const share = new Map<string, { pts: number; n: number }>();
  for (let f = 0; f < fields.length; f++) {
    const coins = fields[f]!.map((symbol, i) => ({ symbol, capRank: i + 1, changeBp: 0 }));
    let total = emptyStandings(coins.map((c) => c.symbol));
    for (let c = 0; c < opts.candles; c++) {
      const snap: MarketSnapshot = { market: def.id, hour: `flat-${f}-${c}`, coins };
      const input = candleInput(bundle, def, snap, c);
      const out = simulate(input, bundle);
      const fighters = out.result.characters.map((ch) => ({ id: ch.entityId, team: ch.team, counters: ch.counters }));
      total = addStandings(def, total, tallyCandle(def, input.teams.map((t) => t.playerId), out.events, fighters));
    }
    const sum = total.reduce((s, r) => s + Math.max(0, r.points), 0) || 1;
    for (const r of total) {
      const key = r.symbol.startsWith('ANON') ? 'ANON' : r.symbol;
      const cur = share.get(key) ?? { pts: 0, n: 0 };
      share.set(key, { pts: cur.pts + (Math.max(0, r.points) / sum) * 10, n: cur.n + 1 });
    }
  }
  const rows = [...share].map(([k, v]) => [k, v.pts / v.n] as const).sort((a, b) => b[1] - a[1]);
  return [
    `# Flat market: each bro's strength (${opts.candles} candles per field; 1.00 = an even share)`,
    '',
    '| Bro | Borrowed career | statBonus | Strength |',
    '|---|---|---|---|',
    ...rows.map(([k, v]) => {
      const m = k === 'ANON' ? def.anon : def.cast[k]!;
      return `| ${k} | ${m.career.replace('career.', '')} | ${m.statBonus ?? 0} | ${v.toFixed(2)} |`;
    }),
  ].join('\n');
}
