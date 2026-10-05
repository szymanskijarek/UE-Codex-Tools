import type { ContentBundle } from '@cc/content-schema';
import { careerSnapshot, difficulty, opponentTeam, stageInfo, STAGES_PER_ARENA, type CareerChar } from '@cc/game-rules';
import { SIM_VERSION, simulate, type BattleInput } from '@cc/sim';

export interface BossRow {
  stage: number;
  arena: string;
  boss: string;
  /** Player win rate against the arena boss's team. */
  winBp: number;
  /** Same fights against the old generic boss (a random fighter two levels up). */
  genericWinBp: number;
}

function fight(bundle: ContentBundle, seed: string, arenaId: string, mine: CareerChar[], theirs: CareerChar[]): boolean {
  const snap = (cs: CareerChar[]) => cs.map((c) => careerSnapshot(bundle, c));
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed,
    arenaId,
    mode: 'duel_3v3',
    teams: [
      { playerId: 'you', playerName: 'You', rating: 1000, characters: snap(mine) },
      { playerId: 'boss', playerName: 'Boss', rating: 1000, characters: snap(theirs) },
    ],
    modifiers: [],
  };
  return simulate(input, bundle).result.winner === 0;
}

/**
 * How hard each ladder boss is on Normal: a squad as strong as the previous
 * stage's opponents (roughly where a player arrives) against the boss stage.
 */
export function bossReport(bundle: ContentBundle, battles: number): BossRow[] {
  const generic: ContentBundle = { ...bundle, arenas: bundle.arenas.map(({ boss: _boss, ...a }) => a) };
  const normal = difficulty('normal');
  const rows: BossRow[] = [];
  for (let chapter = 0; chapter < bundle.arenas.length; chapter++) {
    const stage = chapter * STAGES_PER_ARENA + STAGES_PER_ARENA - 1;
    const info = stageInfo(bundle, stage);
    let win = 0;
    let genericWin = 0;
    for (let i = 0; i < battles; i++) {
      const mine = opponentTeam(bundle, `player-${i}`, stage - 1, normal, 3);
      if (fight(bundle, `boss-${stage}-${i}`, info.arenaId, mine, opponentTeam(bundle, `opp-${i}`, stage, normal, 3))) win++;
      if (fight(bundle, `boss-${stage}-${i}`, info.arenaId, mine, opponentTeam(generic, `opp-${i}`, stage, normal, 3))) genericWin++;
    }
    rows.push({ stage: stage + 1, arena: info.arenaId, boss: info.bossName ?? '—', winBp: Math.round((win * 10000) / battles), genericWinBp: Math.round((genericWin * 10000) / battles) });
  }
  return rows;
}
