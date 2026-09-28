/**
 * Replay CLI (04 S-7): run, inspect and diff battles from input records.
 *   pnpm replay run <input.json>          simulate a BattleInput file and print the report
 *   pnpm replay golden [--update]         check (or regenerate) golden replays
 *   pnpm replay events <input.json> [n]   print the first n events
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@cc/content';
import { buildReport } from '@cc/commentary';
import { simulate, type BattleInput } from '@cc/sim';
import { buildGoldens, diffGolden, type GoldenFile } from './goldens';

const GOLDEN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'packages', 'sim', 'test', 'golden', 'goldens.json');
const [cmd, arg, arg2] = process.argv.slice(2);

function load(path: string): BattleInput {
  return JSON.parse(readFileSync(path, 'utf8')) as BattleInput;
}

if (cmd === 'run' && arg) {
  const input = load(arg);
  const out = simulate(input, bundle);
  const rep = buildReport(bundle, input, out);
  console.log(`Winner: ${rep.winnerName ?? 'draw'} (${out.result.reason}, ${(out.result.ticks / 20).toFixed(1)}s) hash ${out.resultHash}`);
  if (rep.headline) console.log(`\n  ★ ${rep.headline.text}`);
  for (const h of rep.highlights) console.log(`  • ${h.text}`);
  console.log(`\nMVP: ${rep.mvp?.name ?? '-'}`);
  for (const l of rep.lines) console.log(`  ${l}`);
} else if (cmd === 'events' && arg) {
  const out = simulate(load(arg), bundle);
  for (const e of out.events.slice(0, Number(arg2 ?? 200))) console.log(JSON.stringify(e));
} else if (cmd === 'golden') {
  if (arg === '--update' || !existsSync(GOLDEN)) {
    const g = buildGoldens(bundle);
    writeFileSync(GOLDEN, JSON.stringify(g, null, 1));
    console.log(`Wrote ${g.cases.length} golden replays (content ${g.contentHash}, sim ${g.simVersion}).`);
    console.log('If the sim changed behaviour, bump SIM_VERSION in packages/sim/src/types.ts (01 §4.4).');
  } else {
    const g = JSON.parse(readFileSync(GOLDEN, 'utf8')) as GoldenFile;
    const diffs = g.cases.map((c) => diffGolden(bundle, c)).filter((x): x is string => !!x);
    if (g.contentHash !== bundle.hash) console.log(`Content hash changed: ${g.contentHash} → ${bundle.hash}`);
    if (diffs.length === 0) console.log(`All ${g.cases.length} golden replays match.`);
    else {
      console.log(`${diffs.length} golden replay(s) changed:`);
      for (const d of diffs) console.log(`  - ${d}`);
      process.exit(1);
    }
  }
} else {
  console.log('usage: replay run <input.json> | replay events <input.json> [n] | replay golden [--update]');
  process.exit(cmd ? 1 : 0);
}
