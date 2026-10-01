import { bundle } from '@cc/content';
import { createBattle, Rng, type BattleInput } from '@cc/sim';

/** The best moment of a fight for its photo post (photo.ts renders it). */
export interface PhotoMoment {
  tick: number;
  /** Entity id in the battle, and who that is. */
  id: number;
  name: string;
  team: number;
  /**
   * What the subject is doing. On the receiving end (thrown, hurt, spooked)
   * they pull a pained or shocked face, which makes the best photos; dealing
   * it (ko, crit, move) is the fallback.
   */
  kind: 'air' | 'hurt' | 'spooked' | 'ko' | 'crit' | 'move';
  /** How tight the crop is: 1 is the widest framing, smaller zooms in closer. */
  zoom: number;
  /** Which face to show: pained or shocked for the receiving end, else as it is. */
  face: 'hurt' | 'surprised' | null;
  /** Picks among the career's painted variants of that face (0–1). */
  variant: number;
}

/** Zoom levels: the widest framing first; airborne shots keep room for the tumble. */
const ZOOMS = [1, 0.84, 0.7, 0.58];
const AIR_ZOOMS = [1, 0.88, 0.76];

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
  const candidates: (Omit<PhotoMoment, 'zoom' | 'face' | 'variant'> & { score: number })[] = [];
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
        if (t - t0 >= 4) add(t0 + Math.round((t - t0) * 0.45), e.id, 130 + Math.min(80, (t - t0) * 4), 'air');
      }
    }
    // Taking it scores above dealing it: pained and shocked faces make the best photos.
    for (const ev of fresh) {
      if (ev.type === 'ko') {
        const c = world.events[ev.cause];
        if (c && (c.type === 'hit' || c.type === 'crit') && c.t === ev.t) {
          add(t + 2, ev.b, 160, 'hurt');
          add(t, c.a, 90, 'ko');
        }
      } else if (ev.type === 'crit') {
        add(t + 2, ev.b, 100 + Math.min(40, ev.v), 'hurt');
        add(t, ev.a, 60 + Math.min(30, ev.v), 'crit');
      } else if (ev.type === 'panic' && ev.s.startsWith('fear:')) add(t + 3, ev.a, 140, 'spooked');
      else if (ev.type === 'abilityCast') add(t, ev.a, seniors.has(ev.s) ? 100 : 50, 'move');
    }
  }
  let best: (typeof candidates)[number] | null = null;
  for (const c of candidates) if (!best || c.score > best.score) best = c;
  if (!best) return null;
  const { score: _s, ...moment } = best;
  // Vary the framing and the face from fight to fight (same fight, same photo).
  const rng = Rng.fromSeed(`photo:${input.seed}`);
  const zooms = moment.kind === 'air' ? AIR_ZOOMS : ZOOMS;
  const zoom = zooms[rng.int(zooms.length)]!;
  const face = moment.kind === 'spooked' ? 'surprised' : moment.kind === 'air' ? (rng.int(2) ? 'hurt' : 'surprised') : moment.kind === 'hurt' ? (rng.int(3) ? 'hurt' : 'surprised') : null;
  return { ...moment, zoom, face, variant: rng.int(1000) / 1000 };
}
