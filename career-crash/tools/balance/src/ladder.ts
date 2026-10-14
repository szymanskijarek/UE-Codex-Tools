import type { ContentBundle } from '@cc/content-schema';
import { agencyTemp, careerSnapshot, difficulty, generatedFighter, ladderOpponents, ladderSize, makeFriend, stageInfo, type CareerChar } from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, type BattleInput } from '@cc/sim';

/**
 * Career ladder line-ups (12 §6.4): how often a typical player wins each stage
 * on Normal alone, with temps, with the friend, or with hires. The player is a
 * generated fighter at the stage's level and rank (about where a player
 * arrives); a hire is a level and a rank behind (applicants come in a level
 * down and grow from Trainee); temps and the friend are the real thing.
 */
export const LADDER_POLICIES = ['solo', 'temp', 'temps', 'friend', 'hire+temp', 'hires'] as const;
export type LadderPolicy = (typeof LADDER_POLICIES)[number];

export interface LadderRow {
  stage: number;
  arena: string;
  opponents: number;
  boss: boolean;
  winBp: Record<LadderPolicy, number>;
}

function fight(bundle: ContentBundle, seed: string, arenaId: string, mine: CareerChar[], theirs: CareerChar[]): boolean {
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: SIM_VERSION,
    seed,
    arenaId,
    mode: 'duel_3v3',
    teams: [
      { playerId: 'you', playerName: 'You', rating: 1000, characters: mine.map((c) => careerSnapshot(bundle, c)) },
      { playerId: 'opp', playerName: 'Them', rating: 1000, characters: theirs.map((c) => careerSnapshot(bundle, c)) },
    ],
    modifiers: [],
  };
  return simulate(input, bundle).result.winner === 0;
}

export function ladderReport(bundle: ContentBundle, battles: number, stages: number): LadderRow[] {
  const normal = difficulty('normal');
  const rows: LadderRow[] = [];
  for (let stage = 0; stage < stages; stage++) {
    const info = stageInfo(bundle, stage);
    const wins = Object.fromEntries(LADDER_POLICIES.map((p) => [p, 0])) as Record<LadderPolicy, number>;
    for (let i = 0; i < battles; i++) {
      const rng = Rng.fromSeed(`ladder-player:${stage}:${i}`);
      const me = generatedFighter(bundle, rng, `me-${i}`, info.level, info.rank, normal);
      const hire = (k: number) => generatedFighter(bundle, rng, `hire-${i}-${k}`, Math.max(1, info.level - 1), Math.max(1, info.rank - 1), normal);
      const temp = (k: number) => agencyTemp(bundle, `ladder-${stage}-${i}`, k, info.level);
      const teams: Record<LadderPolicy, CareerChar[]> = {
        solo: [me],
        temp: [me, temp(0)],
        temps: [me, temp(0), temp(1)],
        friend: [me, makeFriend(bundle, `ladder-${stage}-${i}`, me.c.careers[0]!, info.level, info.rank)],
        'hire+temp': [me, hire(0), temp(1)],
        hires: [me, hire(0), hire(1)],
      };
      const opp = ladderOpponents(bundle, `opp-${i}`, stage, normal);
      for (const p of LADDER_POLICIES) if (fight(bundle, `ladder-${stage}-${i}`, info.arenaId, teams[p], opp)) wins[p]++;
    }
    rows.push({ stage: stage + 1, arena: info.arenaId, opponents: ladderSize(bundle, stage), boss: info.boss, winBp: Object.fromEntries(LADDER_POLICIES.map((p) => [p, Math.round((wins[p] * 10000) / battles)])) as Record<LadderPolicy, number> });
  }
  return rows;
}
