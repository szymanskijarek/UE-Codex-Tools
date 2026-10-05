import type { ContentBundle } from '@cc/content-schema';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { Rng, SIM_VERSION, simulate, type BattleInput, type CharacterSnapshot } from '@cc/sim';

export interface SummonRow {
  career: string;
  move: string;
  /** Team win rate with the summoning Senior Move, and the same fights without it. */
  withBp: number;
  withoutBp: number;
  /** Critters summoned per fight, how long they lasted (s), and the share beaten rather than timing out. */
  perFight: number;
  lifeS: number;
  beatenBp: number;
}

/**
 * How much each summoning Senior Move is worth: identical 3v3 fights (same
 * seeds, teammates and opponents), once with the move and once without it.
 */
export function summonReport(bundle: ContentBundle, battles: number): SummonRow[] {
  const PLAYABLE = bundle.arenas.filter((a) => !a.marketOnly);
  const regular = bundle.careers.filter((c) => !c.boss && !c.deprecated && c.tier === 1).map((c) => c.id);
  const rows: SummonRow[] = [];
  for (const c of bundle.careers) {
    const move = c.senior ? bundle.abilities.find((a) => a.id === c.senior) : undefined;
    if (!move?.effects?.some((e) => e.type === 'summon')) continue;
    let win = 0;
    let winWithout = 0;
    let summoned = 0;
    let life = 0;
    let gone = 0;
    let beaten = 0;
    for (let i = 0; i < battles; i++) {
      const rng = Rng.fromSeed(`summons:${c.id}:${i}`);
      const mk = (career: string, tag: string): CharacterSnapshot => {
        const r = generateRecruit(bundle, Rng.fromSeed(`${c.id}:${i}:${tag}`), `${tag}-${i}`, { careerPool: [career] });
        r.level = 8;
        return toSnapshot(r);
      };
      const mates = [mk(rng.pick(regular), 'm1'), mk(rng.pick(regular), 'm2')];
      const foes = [mk(rng.pick(regular), 'o1'), mk(rng.pick(regular), 'o2'), mk(rng.pick(regular), 'o3')];
      const star = mk(c.id, 'star');
      const without: CharacterSnapshot = { ...star, unlocked: [c.active, ...(c.extraActives ?? []), c.passive] };
      const fight = (x: CharacterSnapshot) => {
        const input: BattleInput = {
          schemaVersion: 1,
          contentHash: bundle.hash,
          simVersion: SIM_VERSION,
          seed: `summons:${c.id}:${i}`,
          arenaId: PLAYABLE[i % PLAYABLE.length]!.id,
          mode: 'duel_3v3',
          teams: [
            { playerId: 'a', playerName: 'A', rating: 1000, characters: [x, ...mates] },
            { playerId: 'b', playerName: 'B', rating: 1000, characters: foes },
          ],
          modifiers: [],
        };
        return simulate(input, bundle);
      };
      const out = fight(star);
      if (out.result.winner === 0) win++;
      if (fight(without).result.winner === 0) winWithout++;
      const born = new Map<number, number>();
      for (const e of out.events) {
        if (e.type === 'summon' && e.s && out.events[e.cause]?.s === c.senior) {
          born.set(e.b, e.t);
          summoned++;
        }
        if (e.type === 'summonGone' && born.has(e.a)) {
          life += e.t - born.get(e.a)!;
          gone++;
          if (e.v === 1) beaten++;
        }
      }
    }
    rows.push({
      career: c.id,
      move: c.senior!,
      withBp: Math.round((win * 10000) / battles),
      withoutBp: Math.round((winWithout * 10000) / battles),
      perFight: summoned / battles,
      lifeS: gone ? life / gone / 20 : 0,
      beatenBp: gone ? Math.round((beaten * 10000) / gone) : 0,
    });
  }
  return rows.sort((a, b) => b.withBp - b.withoutBp - (a.withBp - a.withoutBp));
}
