import { bundle } from '@cc/content';
import { sessionInput, tallySession, type Influence } from '@cc/game-rules';
import { createBattle } from '@cc/sim';
import { DEF } from './countries';
import { frozenTally } from './likes';

/** Ticks simulated per slice, so working out earlier sessions never blocks the page for long. */
const SLICE_TICKS = 500;

/**
 * The hour's finished sessions (09 §5.3), simulated headless in the
 * background, oldest first, until the vote service publishes them. Returns a
 * cancel function.
 */
export function tallyPastSessions(hour: string, upTo: number, onSession: (session: number, rows: Influence[]) => void): () => void {
  let cancelled = false;
  let session = 0;
  let battle: ReturnType<typeof createBattle> | null = null;
  let keys: string[] = [];
  let ticks = 0;
  const slice = () => {
    if (cancelled || session >= upTo) return;
    if (!battle) {
      const { input } = sessionInput(bundle, DEF, hour, session, frozenTally(hour, session));
      keys = input.teams.map((t) => t.playerId);
      ticks = input.endless!.ticks;
      battle = createBattle(input, bundle);
    }
    for (let i = 0; i < SLICE_TICKS && !battle.done(); i++) battle.step();
    if (battle.done()) {
      onSession(session, tallySession(DEF, keys, battle.world.events, ticks));
      battle = null;
      session++;
    }
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
  return () => {
    cancelled = true;
  };
}
