import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@cc/content';
import type { BattleMode } from '@cc/sim';
import { runBalance, toMarkdown } from './run';

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const [k, v] = a.replace(/^--/, '').split('=');
  args.set(k!, v ?? 'true');
}
const battles = Number(args.get('battles') ?? 400);
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
