import { bundle } from '@cc/content';
import { createBattle, frameOf, stateHash, TICKS_PER_SECOND, type Battle, type BattleEvent, type BattleInput, type Frame } from '@cc/sim';

/**
 * Replay playback (01 §3.3). The battle is re-simulated from its input — the
 * same deterministic package the server ran — and advanced as the clock moves.
 * Seeking backwards re-simulates from tick 0 (a whole battle takes < 100 ms).
 */
export class ReplayPlayer {
  private battle!: Battle;
  prev!: Frame;
  cur!: Frame;
  /** Fractional playback position in ticks. */
  time = 0;
  speed = 1;
  paused = false;
  /** Events newly produced since the last drain (for floating text, sounds). */
  private pending: BattleEvent[] = [];
  private eventCursor = 0;
  totalTicks = 0;
  finalHash = '';

  constructor(readonly input: BattleInput) {
    this.reset();
    // Pre-run once to learn the length (for the timeline) and the final hash.
    const probe = createBattle(input, bundle);
    while (!probe.done()) probe.step();
    this.totalTicks = probe.world.tick;
    this.finalHash = stateHash(probe.world);
  }

  private reset(): void {
    this.battle = createBattle(this.input, bundle);
    this.cur = frameOf(this.battle.world);
    this.prev = this.cur;
    this.time = 0;
    this.eventCursor = this.battle.world.events.length;
    this.pending = [];
  }

  get world() {
    return this.battle.world;
  }

  get tick(): number {
    return this.battle.world.tick;
  }

  get done(): boolean {
    return this.battle.done();
  }

  /** Interpolation factor between prev and cur frames. */
  get alpha(): number {
    return Math.max(0, Math.min(1, this.time - (this.tick - 1)));
  }

  private stepOnce(collect: boolean): void {
    this.prev = this.cur;
    this.battle.step();
    this.cur = frameOf(this.battle.world);
    const ev = this.battle.world.events;
    if (collect) for (let i = this.eventCursor; i < ev.length; i++) this.pending.push(ev[i]!);
    this.eventCursor = ev.length;
  }

  /** Advance by wall-clock milliseconds. */
  advance(ms: number): void {
    if (this.paused || this.done) return;
    this.time += (ms / 1000) * TICKS_PER_SECOND * this.speed;
    let guard = 0;
    while (this.tick < Math.floor(this.time) && !this.done && guard++ < 400) this.stepOnce(true);
    if (this.done) this.time = this.tick;
  }

  seek(tick: number): void {
    const target = Math.max(0, Math.min(this.totalTicks, Math.floor(tick)));
    if (target < this.tick) this.reset();
    while (this.tick < target && !this.done) this.stepOnce(false);
    this.prev = this.cur;
    this.time = this.tick;
  }

  drainEvents(): BattleEvent[] {
    const e = this.pending;
    this.pending = [];
    return e;
  }
}
