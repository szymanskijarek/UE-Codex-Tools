import { bundle } from '@cc/content';
import { createBattle, type BattleInput } from '@cc/sim';

/** The best moment of a fight for its photo post (photo.ts renders it). */
export interface PhotoMoment {
  tick: number;
  /** Entity id in the battle, and who that is. */
  id: number;
  name: string;
  team: number;
  kind: 'air' | 'ko' | 'crit' | 'move';
}

const SKIP_START_TICKS = 20;

/**
 * Score the fight's moments and keep the best: a deterministic pick from the
 * battle input. A flight is taken near its peak (fighters carry
 * status.airborne from the toss until they land); longer flights score more.
 */
export function pickPhotoMoment(input: BattleInput, favour: string[] = []): PhotoMoment | null {
  const battle = createBattle(input, bundle);
  const world = battle.world;
  const seniors = new Set(bundle.careers.flatMap((c) => (c.senior ? [c.senior] : [])));
  const candidates: (PhotoMoment & { score: number })[] = [];
  const flying = new Map<number, number>();
  const who = new Map<number, { name: string; team: number; snap: string }>();
  const add = (tick: number, id: number, raw: number, kind: PhotoMoment['kind']) => {
    const f = who.get(id);
    if (!f || tick < SKIP_START_TICKS) return;
    const score = raw * (f.team === 0 ? 1.5 : 1) * (favour.includes(f.snap) ? 1.2 : 1);
    candidates.push({ tick, id, name: f.name, team: f.team, kind, score });
  };
  let cursor = world.events.length;
  while (!battle.done()) {
    battle.step();
    const t = world.tick;
    const fresh = world.events.slice(cursor);
    cursor = world.events.length;
    for (const e of world.entities) {
      if (e.kind !== 'char' || !e.snapshotId || e.snapshotId.startsWith('summon.') || e.team < 0) continue;
      if (!who.has(e.id)) who.set(e.id, { name: e.name, team: e.team, snap: e.snapshotId });
      const up = e.statuses.some((st) => st.id === 'status.airborne');
      if (up && !flying.has(e.id)) flying.set(e.id, t);
      if (!up && flying.has(e.id)) {
        const t0 = flying.get(e.id)!;
        flying.delete(e.id);
        // Just past the middle of the flight: high up, mid-tumble.
        if (t - t0 >= 4) add(t0 + Math.round((t - t0) * 0.45), e.id, 120 + Math.min(80, (t - t0) * 4), 'air');
      }
    }
    for (const ev of fresh) {
      if (ev.type === 'ko') {
        const c = world.events[ev.cause];
        if (c && (c.type === 'hit' || c.type === 'crit') && c.t === ev.t) add(t, c.a, 140, 'ko');
      } else if (ev.type === 'crit') add(t, ev.a, 80 + Math.min(40, ev.v), 'crit');
      else if (ev.type === 'abilityCast') add(t, ev.a, seniors.has(ev.s) ? 120 : 70, 'move');
    }
  }
  let best: (PhotoMoment & { score: number }) | null = null;
  for (const c of candidates) if (!best || c.score > best.score) best = c;
  if (!best) return null;
  const { score: _s, ...moment } = best;
  return moment;
}
