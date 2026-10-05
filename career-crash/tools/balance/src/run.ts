import type { ContentBundle } from '@cc/content-schema';
import { buildReport } from '@cc/commentary';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, TICKS_PER_SECOND, type BattleInput, type BattleMode, type TeamSnapshot } from '@cc/sim';

export interface BalanceOptions {
  battles: number;
  seed: string;
  mode: BattleMode;
  arenas?: string[];
}

export interface Row {
  key: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface BalanceReport {
  battles: number;
  mode: BattleMode;
  contentHash: string;
  durationSec: { p10: number; p50: number; p90: number; mean: number };
  timeoutRate: number;
  drawRate: number;
  perfMs: { p50: number; p99: number; max: number };
  storyDensity: number;
  headlineShare: Record<string, number>;
  careers: Row[];
  personalities: Row[];
  eventsPerBattle: Record<string, number>;
  outliers: string[];
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]!;
}

function team(bundle: ContentBundle, rng: Rng, size: number, id: string): TeamSnapshot {
  const characters = [];
  for (let i = 0; i < size; i++) characters.push(toSnapshot(generateRecruit(bundle, rng, `${id}-${i}`)));
  return { playerId: id, playerName: id, rating: 1000, characters };
}

/** Headless mass simulation at equal power: fresh level-1 recruits, one tier-1 career each (04 B-12). */
export function runBalance(bundle: ContentBundle, opts: BalanceOptions): BalanceReport {
  const rng = Rng.fromSeed(opts.seed);
  const size = opts.mode === 'duel_5v5' ? 5 : 3;
  const arenas = opts.arenas ?? bundle.arenas.filter((a) => !a.marketOnly).map((a) => a.id);
  const durations: number[] = [];
  const perf: number[] = [];
  const careers = new Map<string, { games: number; wins: number }>();
  const pers = new Map<string, { games: number; wins: number }>();
  const headlines: Record<string, number> = {};
  const events: Record<string, number> = {};
  let timeouts = 0;
  let draws = 0;
  let story = 0;
  const bump = (m: Map<string, { games: number; wins: number }>, k: string, win: boolean): void => {
    const r = m.get(k) ?? { games: 0, wins: 0 };
    r.games++;
    if (win) r.wins++;
    m.set(k, r);
  };
  for (let i = 0; i < opts.battles; i++) {
    const seed = rng.nextU32().toString(16).padStart(8, '0') + rng.nextU32().toString(16).padStart(8, '0');
    const input: BattleInput = {
      schemaVersion: 1,
      contentHash: bundle.hash,
      simVersion: SIM_VERSION,
      seed,
      arenaId: arenas[i % arenas.length]!,
      mode: opts.mode,
      teams: [team(bundle, rng, size, 'A'), team(bundle, rng, size, 'B')],
      modifiers: [],
    };
    const t0 = performance.now();
    const out = simulate(input, bundle);
    perf.push(performance.now() - t0);
    const r = out.result;
    durations.push(r.ticks / TICKS_PER_SECOND);
    if (r.reason === 'timeout') timeouts++;
    if (r.winner < 0) draws++;
    input.teams.forEach((tm, ti) => {
      for (const c of tm.characters) {
        bump(careers, c.careers[0]!, r.winner === ti);
        bump(pers, c.personality, r.winner === ti);
      }
    });
    for (const e of out.events) events[e.type] = (events[e.type] ?? 0) + 1;
    const rep = buildReport(bundle, input, out);
    story += rep.storyScore;
    if (rep.headline) headlines[rep.headline.kind] = (headlines[rep.headline.kind] ?? 0) + 1;
  }
  const rows = (m: Map<string, { games: number; wins: number }>): Row[] =>
    [...m.entries()].map(([key, v]) => ({ key, ...v, winRate: v.games ? Math.round((v.wins / v.games) * 1000) / 10 : 0 })).sort((a, b) => b.winRate - a.winRate);
  durations.sort((a, b) => a - b);
  perf.sort((a, b) => a - b);
  const careerRows = rows(careers);
  const outliers = careerRows.filter((r) => r.games >= 30 && (r.winRate > 60 || r.winRate < 40)).map((r) => `${r.key} ${r.winRate}%`);
  for (const k of Object.keys(events)) events[k] = Math.round((events[k]! / opts.battles) * 10) / 10;
  const hl: Record<string, number> = {};
  const totalHl = Object.values(headlines).reduce((s, v) => s + v, 0) || 1;
  for (const [k, v] of Object.entries(headlines).sort((a, b) => b[1] - a[1])) hl[k] = Math.round((v / totalHl) * 1000) / 10;
  return {
    battles: opts.battles,
    mode: opts.mode,
    contentHash: bundle.hash,
    durationSec: { p10: pct(durations, 0.1), p50: pct(durations, 0.5), p90: pct(durations, 0.9), mean: Math.round((durations.reduce((s, v) => s + v, 0) / durations.length) * 10) / 10 },
    timeoutRate: Math.round((timeouts / opts.battles) * 1000) / 10,
    drawRate: Math.round((draws / opts.battles) * 1000) / 10,
    perfMs: { p50: Math.round(pct(perf, 0.5) * 10) / 10, p99: Math.round(pct(perf, 0.99) * 10) / 10, max: Math.round((perf[perf.length - 1] ?? 0) * 10) / 10 },
    storyDensity: Math.round((story / opts.battles) * 100) / 100,
    headlineShare: hl,
    careers: careerRows,
    personalities: rows(pers),
    eventsPerBattle: events,
    outliers,
  };
}

export function toMarkdown(r: BalanceReport): string {
  const lines: string[] = [];
  lines.push(`# Balance report — ${r.battles} × ${r.mode}`, '', `Content \`${r.contentHash}\``, '');
  lines.push('| Metric | Value | Target (02/04) |', '|---|---|---|');
  lines.push(`| Duration p10 / p50 / p90 | ${r.durationSec.p10}s / ${r.durationSec.p50}s / ${r.durationSec.p90}s | median 60–90 s |`);
  lines.push(`| Timeouts / draws | ${r.timeoutRate}% / ${r.drawRate}% | low |`);
  lines.push(`| Sim time p50 / p99 | ${r.perfMs.p50} ms / ${r.perfMs.p99} ms | p99 < 80 ms |`);
  lines.push(`| Story moments (score ≥ 60) per battle | ${r.storyDensity} | 3–6 |`);
  lines.push(`| Career outliers (outside 40–60%) | ${r.outliers.length ? r.outliers.join(', ') : 'none'} | none |`, '');
  lines.push('## Headline share', '', '| Detector | % |', '|---|---|');
  for (const [k, v] of Object.entries(r.headlineShare)) lines.push(`| ${k} | ${v} |`);
  lines.push('', '## Careers', '', '| Career | Games | Win % |', '|---|---|---|');
  for (const c of r.careers) lines.push(`| ${c.key} | ${c.games} | ${c.winRate} |`);
  lines.push('', '## Personalities', '', '| Personality | Games | Win % |', '|---|---|---|');
  for (const c of r.personalities) lines.push(`| ${c.key} | ${c.games} | ${c.winRate} |`);
  lines.push('', '## Events per battle', '', '```', JSON.stringify(r.eventsPerBattle, null, 1), '```');
  return lines.join('\n');
}
