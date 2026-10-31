import { bundle } from '@cc/content';
import type { MarketDef } from '@cc/content-schema';
import { candleInput, tallyCandle, type MarketSnapshot, type Standing } from '@cc/game-rules';
import { createBattle } from '@cc/sim';

/** Ticks simulated per slice, so working out earlier candles never blocks the page for long. */
const SLICE_TICKS = 500;

/** Fighters of a world, for tallying: one contender per team, critters and the referee left out. */
export function fightersOf(world: { entities: { id: number; kind: string; team: number; summonOf: number; counters: { damageDealt: number } }[] }, teams: number) {
  return world.entities.filter((e) => e.kind === 'char' && e.summonOf < 0 && e.team >= 0 && e.team < teams);
}

/**
 * The standings of the hour's finished candles (08 §4.2), simulated headless
 * in the background, oldest first. Until the hourly worker publishes them with
 * the snapshot, the page works them out itself. Returns a cancel function.
 */
export function tallyPastCandles(def: MarketDef, snapshot: MarketSnapshot, upTo: number, onCandle: (candle: number, rows: Standing[]) => void): () => void {
  let cancelled = false;
  let candle = 0;
  let battle: ReturnType<typeof createBattle> | null = null;
  let symbols: string[] = [];
  const slice = () => {
    if (cancelled || candle >= upTo) return;
    if (!battle) {
      const input = candleInput(bundle, def, snapshot, candle);
      symbols = input.teams.map((t) => t.playerId);
      battle = createBattle(input, bundle);
    }
    for (let i = 0; i < SLICE_TICKS && !battle.done(); i++) battle.step();
    if (battle.done()) {
      onCandle(candle, tallyCandle(def, symbols, battle.world.events, fightersOf(battle.world, symbols.length)));
      battle = null;
      candle++;
    }
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
  return () => {
    cancelled = true;
  };
}
