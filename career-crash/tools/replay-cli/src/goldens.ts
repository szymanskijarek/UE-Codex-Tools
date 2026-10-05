import type { ContentBundle } from '@cc/content-schema';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, type BattleInput, type BattleMode } from '@cc/sim';

export interface GoldenCase {
  name: string;
  input: BattleInput;
  resultHash: string;
  hashes: string[];
  winner: number;
  ticks: number;
}

export interface GoldenFile {
  simVersion: string;
  contentHash: string;
  cases: GoldenCase[];
}

/** The fixed golden battle set (01 §7): a spread of arenas, modes, team sizes and career tiers. */
export function goldenInputs(bundle: ContentBundle): { name: string; input: BattleInput }[] {
  const out: { name: string; input: BattleInput }[] = [];
  const specs: [string, string, BattleMode, number][] = [];
  for (const arena of bundle.arenas.map((a) => a.id)) {
    for (let i = 0; i < 5; i++) specs.push([`${arena}-3v3-${i}`, arena, 'duel_3v3', 3]);
    for (let i = 0; i < 2; i++) specs.push([`${arena}-5v5-${i}`, arena, 'duel_5v5', 5]);
    specs.push([`${arena}-ffa`, arena, 'ffa', 1]);
  }
  for (const [name, arena, mode, size] of specs) {
    const rng = Rng.fromSeed(`golden-${name}`);
    const teamCount = mode === 'ffa' ? 6 : 2;
    const teams = Array.from({ length: teamCount }, (_, t) => ({
      playerId: `p${t}`,
      playerName: `Player ${t}`,
      rating: 1000 + t * 40,
      characters: Array.from({ length: size }, (_, k) => {
        const c = generateRecruit(bundle, rng, `${name}-${t}-${k}`);
        // Give some characters extra careers so multi-career code paths are covered.
        if (k % 2 === 1) {
          const extra = bundle.careers.filter((x) => x.tier === 1 && !c.careers.includes(x.id));
          c.careers.push(rng.pick(extra).id);
          c.level = 5;
        }
        return toSnapshot(c);
      }),
    }));
    out.push({
      name,
      input: { schemaVersion: 1, contentHash: bundle.hash, simVersion: SIM_VERSION, seed: rng.nextU32().toString(16) + rng.nextU32().toString(16), arenaId: arena, mode, teams, modifiers: [] },
    });
  }
  return out;
}

export function buildGoldens(bundle: ContentBundle): GoldenFile {
  return {
    simVersion: SIM_VERSION,
    contentHash: bundle.hash,
    cases: goldenInputs(bundle).map(({ name, input }) => {
      const r = simulate(input, bundle);
      return { name, input, resultHash: r.resultHash, hashes: r.hashes, winner: r.result.winner, ticks: r.result.ticks };
    }),
  };
}

export function diffGolden(bundle: ContentBundle, g: GoldenCase): string | null {
  const r = simulate(g.input, bundle);
  if (r.resultHash === g.resultHash) return null;
  const i = r.hashes.findIndex((h, k) => h !== g.hashes[k]);
  const window = i < 0 ? `after tick ${g.hashes.length * 100}` : `ticks ${i * 100}–${(i + 1) * 100}`;
  return `${g.name}: diverged in ${window} (winner ${g.winner}→${r.result.winner}, ticks ${g.ticks}→${r.result.ticks})`;
}
