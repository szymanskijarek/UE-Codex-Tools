import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@cc/content';
import type { BattleMode } from '@cc/sim';
import { bossReport } from './bosses';
import { summonReport } from './summons';
import { runBalance, toMarkdown } from './run';
import { recordMarkets } from './record-markets';
import { flatReport, marketReport } from './markets';

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const [k, v] = a.replace(/^--/, '').split('=');
  args.set(k!, v ?? 'true');
}
const battles = Number(args.get('battles') ?? 400);
if (args.get('bosses') === 'true') {
  // pnpm balance --bosses [--battles=N]: player win rate at each ladder boss (Normal).
  const rows = bossReport(bundle, Math.min(battles, 200));
  console.log('| Stage | Arena | Boss | Player wins | vs generic boss |\n|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.stage} | ${r.arena.replace('arena.', '')} | ${r.boss} | ${(r.winBp / 100).toFixed(0)}% | ${(r.genericWinBp / 100).toFixed(0)}% |`);
  process.exit(0);
}
if (args.get('summons') === 'true') {
  // pnpm balance --summons [--battles=N]: what each summoning Senior Move is worth (same fights with and without it).
  const rows = summonReport(bundle, Math.min(battles, 300));
  console.log('| Career | Move | Wins with | without | Δ | Critters/fight | Life (s) | Beaten |\n|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.career.replace('career.', '')} | ${bundle.locale[`${r.move}.name`] ?? r.move} | ${(r.withBp / 100).toFixed(0)}% | ${(r.withoutBp / 100).toFixed(0)}% | ${r.withBp >= r.withoutBp ? '+' : ''}${((r.withBp - r.withoutBp) / 100).toFixed(0)} | ${r.perFight.toFixed(1)} | ${r.lifeS.toFixed(1)} | ${(r.beatenBp / 100).toFixed(0)}% |`);
  process.exit(0);
}
if (args.get('record-markets') === 'true') {
  // pnpm balance --record-markets [--hours=48]: real market hours from CoinGecko for --markets.
  console.log(await recordMarkets(Number(args.get('hours') ?? 48)));
  process.exit(0);
}
if (args.get('markets-flat') === 'true') {
  // pnpm balance --markets-flat [--candles=8]: each bro's strength with the market flat.
  console.log(flatReport(bundle, { candles: Number(args.get('candles') ?? 8) }));
  process.exit(0);
}
if (args.get('markets') === 'true') {
  // pnpm balance --markets [--hours=24] [--candles=6]: how often the hour's best coin wins it (08 §5.3).
  console.log(marketReport(bundle, { hours: Number(args.get('hours') ?? 24), candles: Number(args.get('candles') ?? 6) }));
  process.exit(0);
}
const mode = (args.get('mode') ?? 'duel_3v3') as BattleMode;
const seed = args.get('seed') ?? 'balance0001';
const report = runBalance(bundle, { battles, mode, seed, arenas: args.get('arena')?.split(',') });
const md = toMarkdown(report);
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `balance-${mode}.md`), md);
writeFileSync(join(outDir, `balance-${mode}.json`), JSON.stringify(report, null, 2));
console.log(md.split('\n## Careers')[0]);
console.log(`\nFull report: tools/balance/reports/balance-${mode}.md`);
if (args.get('strict') === 'true' && report.perfMs.p99 > 80) {
  console.error('p99 sim time above 80 ms budget');
  process.exit(1);
}
