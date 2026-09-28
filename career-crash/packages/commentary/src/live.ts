/**
 * Live commentary (02 §11): turns battle events into a running feed while a
 * replay plays. Lines come from `data/live.json` templates; importance-based
 * throttling keeps roughly one line every second or two, with big moments
 * always getting through. Deterministic for a given battle seed.
 */
import type { ContentBundle } from '@cc/content-schema';
import { Rng, type BattleEvent, type BattleInput } from '@cc/sim';

export interface LiveLine {
  tick: number;
  text: string;
  kind: string;
  importance: 1 | 2 | 3;
  actors: number[];
}

interface Info {
  name: string;
  job: string;
  team: number;
  kind: 'char' | 'prop' | 'npc';
  def: string;
}

const MIN_GAP: Record<1 | 2 | 3, number> = { 1: 30, 2: 12, 3: 0 };
const BIG_STATUS = new Set(['status.burning', 'status.electrified', 'status.knocked-down', 'status.caffeinated', 'status.foamed', 'status.lectured']);

export class LiveCommentator {
  private info = new Map<number, Info>();
  private rng: Rng;
  private lastTick = -1000;
  private lastKind = '';
  private sameTick = 0;
  private firstBlood = false;
  private used = new Map<string, number>();

  constructor(
    private bundle: ContentBundle,
    private input: BattleInput,
  ) {
    this.rng = Rng.fromSeed(input.seed).fork('live');
  }

  private nm(id: string): string {
    return (this.bundle.locale[`${id}.name`] ?? id.replace(/^[a-z]+\./, '').replace(/-/g, ' ')).toLowerCase();
  }

  private who(id: number): Info | undefined {
    return this.info.get(id);
  }

  private label(id: number): string {
    const i = this.info.get(id);
    if (!i) return 'someone';
    if (i.kind === 'npc') return 'the referee';
    if (i.kind === 'prop') return `the ${this.nm(i.def)}`;
    const first = i.name.split(' ')[0]!;
    // Two fighters with the same first name: use full names so lines stay unambiguous.
    let dup = 0;
    for (const o of this.info.values()) if (o.kind === 'char' && o.name.split(' ')[0] === first) dup++;
    return dup > 1 ? i.name : first;
  }

  intro(): LiveLine {
    return this.make(0, 'intro', 3, {}, []) ?? { tick: 0, text: 'Here we go!', kind: 'intro', importance: 3, actors: [] };
  }

  /** Pick a template, avoiding the most recently used one for this kind. */
  private make(tick: number, kind: string, importance: 1 | 2 | 3, slots: Record<string, string>, actors: number[]): LiveLine | null {
    const list = this.bundle.live[kind];
    if (!list || list.length === 0) return null;
    let idx = this.rng.int(list.length);
    if (list.length > 1 && this.used.get(kind) === idx) idx = (idx + 1) % list.length;
    this.used.set(kind, idx);
    const arena = this.nm(this.input.arenaId);
    const text = list[idx]!.replace(/\{(\w+)\}/g, (_, k: string) => slots[k] ?? (k === 'arena' ? arena.replace(/^\w/, (c) => c.toUpperCase()) : k))
      // "a office chair" → "an office chair"
      .replace(/\b([Aa]) ([aeiouAEIOU])/g, '$1n $2');
    return { tick, text, kind, importance, actors };
  }

  /**
   * Feed newly produced events (in order). `all` is the full event log (for cause lookups).
   * With `silent`, only internal state is updated (used when seeking).
   */
  consume(events: BattleEvent[], all: BattleEvent[], silent = false): LiveLine[] {
    const out: LiveLine[] = [];
    for (const e of events) {
      const cand = this.candidate(e, all);
      if (!cand || silent) continue;
      const gap = e.t - this.lastTick;
      if (cand.importance < 3 && gap < MIN_GAP[cand.importance]) continue;
      if (cand.importance === 1 && cand.kind === this.lastKind) continue;
      if (gap === 0 && this.sameTick >= 2) continue;
      this.sameTick = gap === 0 ? this.sameTick + 1 : 0;
      this.lastTick = e.t;
      this.lastKind = cand.kind;
      out.push(cand);
    }
    return out;
  }

  private candidate(e: BattleEvent, all: BattleEvent[]): LiveLine | null {
    const A = this.label(e.a);
    const B = this.label(e.b);
    const ai = this.who(e.a);
    const bi = this.who(e.b);
    const base = { a: A, b: B, aJob: ai?.job ?? 'worker', bJob: bi?.job ?? 'worker' };
    const cause = e.cause >= 0 ? all[e.cause] : undefined;
    switch (e.type) {
      case 'spawn': {
        const snap = this.input.teams[e.v]?.characters.find((c) => c.id === e.s);
        if (snap) this.info.set(e.a, { name: snap.name, job: this.nm(snap.careers[snap.careers.length - 1]!), team: e.v, kind: 'char', def: snap.careers[0]! });
        else this.info.set(e.a, { name: 'The Referee', job: 'referee', team: -1, kind: 'npc', def: e.s });
        return null;
      }
      case 'propSpawned':
        this.info.set(e.b, { name: e.s, job: '', team: -1, kind: 'prop', def: e.s });
        return null;
      case 'hit':
      case 'crit': {
        if (!bi) return null;
        if (bi.kind === 'npc') return this.make(e.t, 'referee_hit', 2, base, [e.a, e.b]);
        if (cause?.type === 'throw') return this.make(e.t, 'throw_hit', 2, { ...base, a: this.label(cause.a), prop: this.nm(cause.s) }, [cause.a, e.b]);
        if (cause?.type === 'ride') return this.make(e.t, 'ride_hit', 3, { ...base, prop: this.nm(cause.s) }, [e.a, e.b]);
        if (e.type === 'crit') return this.make(e.t, 'crit', 2, base, [e.a, e.b]);
        return e.v >= 14 && ai?.kind === 'char' ? this.make(e.t, 'hit', 1, base, [e.a, e.b]) : null;
      }
      case 'abilityCast':
        return this.make(e.t, e.a === e.b ? 'ability_self' : 'ability', 2, { ...base, ability: this.bundle.locale[`${e.s}.name`] ?? e.s }, [e.a, e.b]);
      case 'statusApplied': {
        if (bi?.kind === 'prop') return e.s === 'status.live' ? this.make(e.t, 'status_live', 2, base, [e.b]) : e.s === 'status.burning' ? this.make(e.t, 'rule_fire', 1, base, [e.b]) : null;
        if (bi?.kind !== 'char') return null;
        return this.make(e.t, `status_${e.s.replace('status.', '')}`, BIG_STATUS.has(e.s) ? 2 : 1, base, [e.b]);
      }
      case 'throw':
        return this.make(e.t, 'throw', 1, { ...base, prop: this.nm(e.s) }, [e.a, e.b]);
      case 'miss':
        return null;
      case 'pickUp':
        return this.make(e.t, 'pickup', 1, { ...base, prop: this.nm(e.s) }, [e.a]);
      case 'push':
        return this.make(e.t, 'push', 1, { ...base, prop: this.nm(e.s) }, [e.a]);
      case 'ride':
        return this.make(e.t, 'ride', 2, { ...base, prop: this.nm(e.s) }, [e.a]);
      case 'use': {
        const def = this.bundle.props.find((p) => p.id === e.s);
        const kind = def?.tags.includes('drink') ? 'use_coffee' : def?.tags.includes('food') ? 'use_food' : 'use_machine';
        return this.make(e.t, kind, 1, { ...base, prop: this.nm(e.s) }, [e.a]);
      }
      case 'propBroken': {
        const def = this.bundle.props.find((p) => p.id === e.s);
        if (def?.area) return null;
        return this.make(e.t, 'prop_broken', 1, { ...base, prop: this.nm(e.s) }, [e.b]);
      }
      case 'explosion':
        return this.make(e.t, 'explosion', 3, { ...base, prop: this.nm(e.s) }, [e.b]);
      case 'downed':
        if (!this.firstBlood && ai?.kind === 'char') {
          this.firstBlood = true;
          return this.make(e.t, 'first_blood', 3, base, [e.a, e.b]);
        }
        return this.make(e.t, 'downed', 2, base, [e.a, e.b]);
      case 'ko':
        if (!bi || bi.kind !== 'char') return null;
        if (ai?.kind === 'char' && ai.team === bi.team && e.a !== e.b) return this.make(e.t, 'ko_friendly', 3, base, [e.a, e.b]);
        if (ai?.kind !== 'char') return this.make(e.t, 'ko_env', 3, base, [e.b]);
        return this.make(e.t, 'ko', 3, base, [e.a, e.b]);
      case 'revived':
        return this.make(e.t, 'revived', 2, base, [e.a, e.b]);
      case 'panic':
        return this.make(e.t, 'panic', 2, base, [e.a]);
      case 'taunt':
        return e.b < 0 ? this.make(e.t, 'taunt', 1, base, [e.a]) : this.make(e.t, 'taunted', 1, base, [e.a, e.b]);
      case 'foul':
        return this.make(e.t, 'foul', 1, base, [e.b]);
      case 'card':
        return this.make(e.t, 'card', 3, base, [e.b]);
      case 'refereeDown':
        return this.make(e.t, 'referee_down', 3, base, [e.a]);
      case 'hazardWarn':
        return this.make(e.t, 'hazard_warn', 3, { ...base, hazard: e.s.replace(/^hazard\./, '').replace(/-/g, ' ') }, []);
      case 'suddenDeath':
        return this.make(e.t, 'sudden_death', 3, base, []);
      case 'heal':
        if (ai?.kind === 'char' && bi?.kind === 'char' && ai.team !== bi.team && e.v >= 5) return this.make(e.t, 'heal_enemy', 3, base, [e.a, e.b]);
        return e.v >= 15 ? this.make(e.t, 'heal', 1, base, [e.a, e.b]) : null;
      case 'drop':
        return this.make(e.t, 'drop', 1, { ...base, prop: this.nm(e.s) }, [e.a]);
      case 'ruleFired': {
        const tag = this.bundle.rules.find((r) => r.id === e.s)?.commentaryTag;
        return tag ? this.make(e.t, `rule_${tag}`, 1, base, [e.a, e.b]) : null;
      }
      case 'battleEnd':
        return e.v >= 0 ? this.make(e.t, 'end_win', 3, { ...base, team: this.input.teams[e.v]?.playerName ?? 'the winners' }, []) : this.make(e.t, 'end_draw', 3, base, []);
      default:
        return null;
    }
  }
}
