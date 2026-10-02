import { useEffect, useRef, useState } from 'preact/hooks';
import { arenaSong, matchTempo, music } from '../replay/music';
import { buildReport, LiveCommentator, type BattleReport, type LiveLine } from '@cc/commentary';
import { bundle } from '@cc/content';
import { simulate, type BattleEvent } from '@cc/sim';
import { recordGrudges } from '../sandbox-rivals';
import { api } from '../api';
import { nameOf } from '../i18n';
import { currentReplay, navigate, notify } from '../state';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import { Card, CareerChain, Empty } from '../ui/components';
import { career } from '../career/model';
import { startNextFight } from '../career/CoreActions';

const SPEEDS = [1, 2, 4];
const FEED_MAX = 40;
const MAX_REPLAYS = 5;
const REPLAY_SPEED = 0.35;
/** Action replays: how far before the moment they start, how they end (ticks; 20 per second). */
const REPLAY_PRE_TICKS = 16;
const REPLAY_POST_TICKS = 12;
/** Run-up plays near full speed; slow motion only around each impact. */
const REPLAY_RUNUP_SPEED = 0.9;
const REPLAY_SLOW_WINDOW = 7;
/** How long a boss's entrance holds the fight before the first tick. */
const BOSS_INTRO_MS = 3600;
/** Gatecrashers (07): how long the fight holds while they make their entrance, and the gap between their lines. */
const CRASH_INTRO_MS = 3400;
const CRASH_LINE_GAP_MS = 900;
/**
 * Whether action replays are on. A new key (was `cc.replays`): the old toggle
 * was a bare ⟲ that looked like "watch again", so players switched replays off
 * by accident and never got them back. Everyone starts with them on again.
 */
const REPLAY_KEY = 'cc.replays.v2';

function readReplayPref(): boolean {
  try {
    return window.localStorage.getItem(REPLAY_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Pending/active slow-motion action replay of a big moment (KO, explosion, machine run-over). */
interface ActionReplay {
  tick: number;
  /** Last moment merged into this replay (a machine mowing down several people is one replay). */
  endTick: number;
  /** Who/what caused it: a machine or thrower; used to merge and to cool down repeats. */
  source: number;
  focus: number[];
  startAt: number;
  returnTick: number;
  prevSpeed: number;
  active: boolean;
  /** Grudge settled: slower, with its own badge, even past the replay cap. */
  dramatic?: boolean;
  /** The viewer pressed Skip replay: end it on the next frame. */
  skip?: boolean;
}

interface FeedLine extends LiveLine {
  key: number;
}

export function Replay({ battleId }: { battleId?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const commentatorRef = useRef<LiveCommentator | null>(null);
  const keyRef = useRef(0);
  /** The fight-over bar has been scrolled into view once for this ending. */
  const overShownRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [replaysOn, setReplaysOn] = useState(readReplayPref);
  const replaysOnRef = useRef(replaysOn);
  const actionRef = useRef<ActionReplay | null>(null);
  /** Boss entrance before the first tick: the camera on the boss while they deliver a line. */
  const introRef = useRef<{ id: number; until: number; line: string; spoken: boolean } | null>(null);
  const startBossIntro = (player: ReplayPlayer, renderer: BattleRenderer) => {
    for (const snap of player.input.teams.flatMap((t) => t.characters)) {
      const job = snap.careers[snap.careers.length - 1] ?? '';
      if (!bundle.careers.find((c) => c.id === job)?.boss) continue;
      const ent = player.world.entities.find((e) => e.snapshotId === snap.id);
      if (!ent) continue;
      const lines = bundle.live[`boss_intro_${job.replace('career.', '')}`] ?? ['…'];
      const line = lines[Math.floor(Math.random() * lines.length)]!;
      introRef.current = { id: ent.id, until: performance.now() + BOSS_INTRO_MS, line, spoken: false };
      renderer.setReplay([ent.id], '☠ BOSS FIGHT', `${snap.name} · ${nameOf(job)}`, 0.85);
      const feed = (bundle.live.boss_intro_feed ?? ['{name}: “{line}”'])[0]!;
      pushLines([{ tick: 0, text: feed.replace('{name}', snap.name).replace('{job}', nameOf(job)).replace('{line}', line), kind: 'boss', importance: 3, actors: [ent.id] }]);
      return;
    }
  };
  /** Gatecrashers bursting in: the fight holds while the camera's on them and each shouts a catchphrase. */
  const crashRef = useRef<{ ids: number[]; lines: string[]; spoken: boolean[]; start: number } | null>(null);
  const startCrash = (player: ReplayPlayer, renderer: BattleRenderer, setId: string, now: number) => {
    const set = bundle.crashers.find((c) => c.id === setId);
    if (!set) return;
    const side = player.input.teams.length;
    const ids = player.world.entities.filter((e) => e.kind === 'char' && e.team === side && e.summonOf < 0).map((e) => e.id);
    if (!ids.length) return;
    const pickLine = (l: string[], i: number) => l[(Math.floor(Math.random() * l.length) + i) % l.length]!;
    const lines = ids.map((_, i) => pickLine(i === 0 ? set.leader.lines : set.henchmen.lines, i));
    crashRef.current = { ids, lines, spoken: ids.map(() => false), start: now };
    renderer.setReplay(ids, '🚨 GATECRASHERS!', `${nameOf(set.id)} · ${set.leader.name}, ${nameOf(set.leader.persona)}`, 0.9);
  };
  const endBossIntro = (tick: number) => {
    introRef.current = null;
    rendererRef.current?.setReplay(null);
    const go = bundle.live.boss_fight ?? ['Fight!'];
    pushLines([{ tick, text: go[Math.floor(Math.random() * go.length)]!, kind: 'boss', importance: 3, actors: [] }]);
  };
  const replayCountRef = useRef(0);
  /** Everything up to this tick has been shown in a replay; sources on cooldown until tick. */
  const coveredRef = useRef(-1);
  const grudgesRecordedRef = useRef(false);
  const sourceCooldownRef = useRef(new Map<number, number>());
  const [inReplay, setInReplay] = useState(false);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [report, setReport] = useState<BattleReport | null>(null);
  const [loading, setLoading] = useState(false);
  const rep = currentReplay.value;

  // Deep link: load from the server when we don't already have the input.
  useEffect(() => {
    if (!battleId || battleId === 'local' || rep?.id === battleId) return;
    setLoading(true);
    api
      .battle(battleId)
      .then(
        (r) =>
          (currentReplay.value = {
            id: r.id,
            input: r.input,
            resultHash: r.resultHash,
            title: `${r.summary.attackerName} vs ${r.summary.defenderName}`,
            back: '/reports',
          }),
      )
      .catch((e: Error) => notify(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [battleId]);

  const pushLines = (lines: LiveLine[]) => {
    if (lines.length === 0) return;
    setFeed((f) => [...lines.map((l) => ({ ...l, key: keyRef.current++ })).reverse(), ...f].slice(0, FEED_MAX));
  };

  /** Rebuild the commentator's knowledge up to the player's current tick without emitting lines. */
  const resetCommentary = (player: ReplayPlayer) => {
    const c = new LiveCommentator(bundle, player.input);
    c.consume(player.world.events, player.world.events, true);
    commentatorRef.current = c;
    return c;
  };

  useEffect(() => {
    if (!rep || !host.current) return;
    const player = new ReplayPlayer(rep.input);
    playerRef.current = player;
    if (rep.resultHash && player.finalHash !== rep.resultHash) {
      // 01 §3.3: a mismatch is a determinism bug; show the replay anyway and report it.
      console.warn('Replay desync', {
        expected: rep.resultHash,
        got: player.finalHash,
      });
      notify('Replay desync detected — please report this bug.', 'error');
    }
    setReport(buildReport(bundle, rep.input, simulate(rep.input, bundle)));
    replayCountRef.current = 0;
    actionRef.current = null;
    const commentator = resetCommentary(player);
    const stations = bundle.arenas.find((a) => a.id === rep.input.arenaId)?.stations ?? [];
    // Which fight location an entity is at (for "Meanwhile, at the Frozen Aisle:" lines).
    const locate = (id: number): number | null => {
      const e = player.world.byId.get(id);
      if (!e || e.kind !== 'char') return null;
      let best: number | null = null;
      let bestD = 6500;
      stations.forEach((s, i) => {
        const d = Math.hypot(e.x - s.at[0], e.y - s.at[1]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    };
    setFeed([{ ...commentator.intro(), key: keyRef.current++ }]);
    music.play(arenaSong(rep.input.arenaId));
    const renderer = new BattleRenderer(rep.input);
    rendererRef.current = renderer;
    setMuted(renderer.sfx.muted);
    let raf = 0;
    let last = performance.now();
    let alive = true;
    void renderer.mount(host.current).then(() => {
      startBossIntro(player, renderer);
      const loop = (now: number) => {
        if (!alive) return;
        const dt = Math.min(100, now - last);
        last = now;
        const intro = introRef.current;
        if (intro) {
          if (!intro.spoken) intro.spoken = renderer.speak(intro.id, intro.line, BOSS_INTRO_MS - 500);
          if (now >= intro.until) endBossIntro(player.tick);
        }
        const crash = crashRef.current;
        if (crash) {
          // One catchphrase after another, then back to the fight.
          crash.ids.forEach((id, i) => {
            // Each line holds until the next one starts; the last holds to the end of the entrance.
            const last = i === crash.ids.length - 1;
            if (!crash.spoken[i] && now - crash.start >= i * CRASH_LINE_GAP_MS) crash.spoken[i] = renderer.speak(id, crash.lines[i]!, last ? CRASH_INTRO_MS - i * CRASH_LINE_GAP_MS : CRASH_LINE_GAP_MS + 150);
          });
          if (now - crash.start >= CRASH_INTRO_MS) {
            crashRef.current = null;
            renderer.setReplay(null);
          }
        }
        const ar = actionRef.current;
        // Start a pending action replay once the moment has had a beat to land (not over an entrance).
        if (ar && !ar.active && now >= ar.startAt && !crashRef.current) {
          ar.active = true;
          ar.returnTick = player.tick;
          ar.prevSpeed = player.speed;
          player.seek(Math.max(0, ar.tick - REPLAY_PRE_TICKS));
          coveredRef.current = Math.max(coveredRef.current, ar.endTick + 30);
          if (ar.source >= 0) sourceCooldownRef.current.set(ar.source, ar.endTick + 300);
          player.drainEvents();
          renderer.resetFx();
          renderer.setReplay(ar.focus, ar.dramatic ? '● GRUDGE SETTLED' : undefined);
          player.speed = REPLAY_RUNUP_SPEED;
          player.paused = false;
          setInReplay(true);
          const intro = bundle.live['replay_intro'] ?? ['Instant replay!'];
          pushLines([
            {
              tick: ar.tick,
              text: `⟲ ${intro[replayCountRef.current % intro.length]}`,
              kind: 'replay',
              importance: 3,
              actors: [],
            },
          ]);
        }
        // Hit stop: big impacts freeze the battle for a beat.
        const hold = !!introRef.current || !!crashRef.current;
        const flow = hold ? 0 : renderer.timeScale();
        player.advance(dt * flow);
        const events = player.drainEvents();
        renderer.render(player, flow || hold ? dt : dt * 0.1, events);
        if (ar?.active) {
          // Punchy: quick run-up, slow motion only around the impacts, then straight back.
          const slow = ar.dramatic ? REPLAY_SPEED * 0.7 : REPLAY_SPEED;
          const nearHit = [ar.tick, ar.endTick].some((h) => player.tick >= h - REPLAY_SLOW_WINDOW && player.tick <= h + REPLAY_SLOW_WINDOW);
          player.speed = nearHit ? slow : REPLAY_RUNUP_SPEED;
          if (ar.skip || player.tick >= ar.endTick + REPLAY_POST_TICKS || player.done) {
            player.seek(ar.returnTick);
            player.drainEvents();
            renderer.resetFx();
            renderer.setReplay(null);
            player.speed = ar.prevSpeed;
            actionRef.current = null;
            setInReplay(false);
          }
        } else {
          if (events.length > 0 && commentatorRef.current) pushLines(commentatorRef.current.consume(events, player.world.events, false, locate));
          // Gatecrashers just burst in: stop for their entrance.
          const crashEv = events.find((e) => e.type === 'crash');
          if (crashEv && !crashRef.current) startCrash(player, renderer, crashEv.s, now);
          // Queue a replay for knockouts and other big moments.
          const pending = actionRef.current && !actionRef.current.active ? actionRef.current : null;
          if (replaysOnRef.current && (pending || (!actionRef.current && (replayCountRef.current < MAX_REPLAYS || events.some((e) => e.type === 'revenge'))))) {
            const world = player.world;
            // The thing responsible: a machine or thrower for hits/landings, the hitter behind a down/KO.
            const sourceOf = (e: BattleEvent): number => {
              const c = e.type === 'downed' || e.type === 'ko' ? world.events[e.cause] : e;
              return c ? (c.type === 'landed' || c.type === 'hit' || c.type === 'crit' || c.type === 'downed' || c.type === 'ko' ? c.a : -1) : -1;
            };
            const fresh = (e: BattleEvent): boolean => {
              if (e.type === 'revenge') return true;
              if (e.t <= coveredRef.current) return false;
              const src = sourceOf(e);
              return !(src >= 0 && (sourceCooldownRef.current.get(src) ?? -1) > e.t);
            };
            const bigs = events.filter(
              (e) =>
                fresh(e) && // The decisive blow, not the bleed-out: replay the hit that downs someone, or a KO
                // that a hit delivered (a timer running out on the floor is nothing to watch).
                ((e.type === 'downed' && player.world.byId.get(e.b)?.kind === 'char') ||
                  (e.type === 'ko' && player.world.byId.get(e.b)?.kind === 'char' && ['hit', 'crit'].includes(player.world.events[e.cause]?.type ?? '') && player.world.events[e.cause]!.t === e.t) ||
                  e.type === 'explosion' ||
          e.type === 'wallBroken' ||
          e.type === 'revenge' ||
                  e.type === 'refereeDown' ||
                  (e.type === 'landed' && e.v >= 14) ||
                  (e.type === 'hit' && e.s === 'body') ||
                  (e.type === 'hit' && ['prop.floor-scrubber', 'prop.forklift'].includes(player.world.byId.get(e.a)?.def ?? ''))),
            );
            for (const big of bigs) {
              const focus = [big.a, big.b].filter((id) => id >= 0 && player.world.byId.get(id)?.kind !== 'prop');
              if (big.type === 'wallBroken') {
        // Everyone the obstacle fell on (or near).
        const [x, y, ww, hh] = player.world.arena.walls[big.b] ?? [0, 0, 0, 0];
        for (const c of player.world.entities) if (c.kind === 'char' && c.x > x - 1500 && c.x < x + ww + 1500 && c.y > y - 2500 && c.y < y + hh + 2500 && !focus.includes(c.id)) focus.push(c.id);
      }
      if (big.type === 'explosion') {
                const p = player.world.byId.get(big.b);
                for (const c of player.world.entities) if (c.kind === 'char' && p && Math.hypot(c.x - p.x, c.y - p.y) < 3500) focus.push(c.id);
              }
              const cur = actionRef.current;
              if (cur && !cur.active) {
                // Merge follow-ups (same machine, or anything within ~3 s) into the pending replay.
                if (big.t - cur.tick > 60) continue;
                cur.endTick = Math.max(cur.endTick, big.t);
                for (const id of focus) if (!cur.focus.includes(id)) cur.focus.push(id);
                cur.startAt = Math.min(cur.startAt + 250, now + 1500);
                if (big.type === 'revenge') cur.dramatic = true;
                continue;
              }
              // Revenge always gets its replay, even past the cap.
              if (cur || (replayCountRef.current >= MAX_REPLAYS && big.type !== 'revenge') || !focus.length) continue;
              replayCountRef.current++;
              actionRef.current = {
                tick: big.t,
                endTick: big.t,
                source: sourceOf(big),
                focus,
                startAt: now + 500,
                returnTick: 0,
                prevSpeed: 1,
                active: false,
                dramatic: big.type === 'revenge',
              };
            }
          }
        }
        if (player.done && !grudgesRecordedRef.current && rep.id === 'local') {
          grudgesRecordedRef.current = true;
          recordGrudges(player.world.events, player.world.byId);
        }
        // The arena's song speeds up as the match heads for its finish, and fades out at the end.
        if (player.done) music.finish();
        else {
          music.play(arenaSong(rep.input.arenaId));
          music.setTempo(matchTempo(player.tick, player.totalTicks));
        }
        setTick(player.tick);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      renderer.destroy();
      rendererRef.current = null;
      playerRef.current = null;
    };
  }, [rep?.input]);

  if (loading) return <Empty>Loading replay…</Empty>;
  if (!rep)
    return (
      <Empty>
        No replay selected. Fight someone, open a report, or run a <a href="#/sandbox">Sandbox</a> battle.
      </Empty>
    );
  const p = playerRef.current;
  const total = p?.totalTicks ?? 1;
  const finished = !!p && tick >= total;
  // When the gatecrashers burst in (they're listed from then on).
  const crashTick = p?.world.events.find((e) => e.type === 'crash')?.t ?? Infinity;
  if (!finished) overShownRef.current = false;
  const save = rep.id === 'career' ? career.value : null;
  const seek = (t: number) => {
    const player = playerRef.current;
    if (!player) return;
    if (introRef.current) endBossIntro(player.tick);
    if (actionRef.current) {
      if (actionRef.current.active) player.speed = actionRef.current.prevSpeed;
      actionRef.current = null;
      rendererRef.current?.setReplay(null);
      setInReplay(false);
    }
    player.seek(t);
    player.drainEvents();
    rendererRef.current?.resetFx();
    resetCommentary(player);
    setFeed([]);
    setTick(t);
  };
  const toggleSound = () => {
    const r = rendererRef.current;
    if (!r) return;
    r.sfx.setMuted(!r.sfx.muted);
    setMuted(r.sfx.muted);
  };

  return (
    <section class="replay">
      <div class="replay-head">
        <button class="ghost small" onClick={() => navigate(rep.back)} aria-label="Back">
          ←
        </button>
        <b class="grow">{rep.title}</b>
        <span class="muted small">
          {nameOf(rep.input.arenaId)} · {(tick / 20).toFixed(1)}s
        </span>
      </div>
      <div class="replay-body">
        <div class="stage-wrap">
          <div class="stage" ref={host} />
          <div class="controls">
            <button
              aria-label={paused ? 'Play' : 'Pause'}
              onClick={() => {
                const player = playerRef.current;
                if (!player) return;
                rendererRef.current?.sfx.unlock();
                if (player.done) {
                  seek(0);
                  player.paused = false;
                  setPaused(false);
                  return;
                }
                player.paused = !paused;
                setPaused(!paused);
              }}
            >
              {finished ? '↺' : paused ? '▶' : '❚❚'}
            </button>
            <input type="range" min={0} max={total} value={tick} aria-label="Timeline" onInput={(e) => seek(Number((e.target as HTMLInputElement).value))} />
            {SPEEDS.map((s) => (
              <button
                class={s === speed ? 'on' : ''}
                onClick={() => {
                  setSpeed(s);
                  if (playerRef.current) playerRef.current.speed = s;
                }}
              >
                {s}×
              </button>
            ))}
            <button onClick={() => seek(total)} aria-label="Skip to end">
              ⏭
            </button>
            <button onClick={toggleSound} aria-label={muted ? 'Sound on' : 'Mute'} class={muted ? '' : 'on'}>
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              class={`replay-toggle ${replaysOn ? 'on' : 'off'}`}
              aria-pressed={replaysOn}
              aria-label={replaysOn ? 'Action replays on: tap to turn off' : 'Action replays off: tap to turn on'}
              title="Slow-motion replays of knockouts and big moments"
              onClick={() => {
                const v = !replaysOn;
                setReplaysOn(v);
                replaysOnRef.current = v;
                notify(v ? '🎬 Action replays on.' : '🎬 Action replays off. Tap 🎬 to bring them back.', v ? 'good' : 'info');
                try {
                  window.localStorage.setItem(REPLAY_KEY, v ? '1' : '0');
                } catch {
                  /* storage unavailable */
                }
              }}
            >
              🎬 {replaysOn ? 'On' : 'Off'}
            </button>
            {inReplay && (
              <button
                class="on"
                onClick={() => {
                  // End the replay on the next frame without clearing the commentary feed.
                  if (actionRef.current) actionRef.current.skip = true;
                }}
              >
                Skip replay
              </button>
            )}
          </div>
          {finished && save && (
            <div
              class="fight-over"
              ref={(el) => {
                // Bring the next step on screen once, when the fight ends.
                if (el && !overShownRef.current) {
                  overShownRef.current = true;
                  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }}
            >
              <b class="fight-over-title">{report?.winnerName ? `🏆 ${report.winnerName} wins` : report ? '🤝 Draw' : 'Fight over'}</b>
              <div class="fight-over-actions">
                <button class="li-btn primary big" onClick={() => navigate('/career/results')}>
                  📋 Collect results
                </button>
                <button class="li-btn" onClick={() => startNextFight(save)} title="Collect the results and go straight into the next fight">
                  🥊 Next fight
                </button>
              </div>
            </div>
          )}
          <div class={`feed ${finished && save ? 'done' : ''}`} aria-live="polite">
            {feed.length === 0 && <div class="feed-line muted">…</div>}
            {feed.map((l, i) => (
              <div key={l.key} class={`feed-line imp${l.importance} ${i === 0 ? 'fresh' : ''}`}>
                <span class="feed-t">{(l.tick / 20).toFixed(0)}s</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div class="side">
          {finished && report ? (
            <Card class="report">
              {/* Career fights already say who won in the fight-over bar. */}
              {save ? <h2>📋 Match report</h2> : <h2>{report.winnerName ? `🏆 ${report.winnerName} wins` : 'Draw'}</h2>}
              {report.headline && (
                <p class="headline clickable" onClick={() => seek(Math.max(0, report.headline!.tick - 60))}>
                  “{report.headline.text}”
                </p>
              )}
              <ul class="highlights">
                {report.highlights.map((h) => (
                  <li class="clickable" onClick={() => seek(Math.max(0, h.tick - 60))}>
                    <span class="muted small">{(h.tick / 20).toFixed(0)}s</span> {h.text}
                  </li>
                ))}
              </ul>
              {report.mvp && <p>⭐ MVP: {report.mvp.name}</p>}
              <details>
                <summary>Box score</summary>
                {report.lines.map((l) => (
                  <div class="small">{l}</div>
                ))}
              </details>
            </Card>
          ) : (
            <Card class="report muted small">The battle report appears when the fight ends. Tap ⏭ to skip ahead.</Card>
          )}
          <div class="teams">
            {rep.input.teams.map((t, i) => (
              <div class={`team t${i}`}>
                <b>{t.playerName}</b>
                {t.characters.map((c) => (
                  <div class="small">
                    {c.name} <span class="muted">({nameOf(c.personality)})</span> <CareerChain careers={c.careers} />
                  </div>
                ))}
              </div>
            ))}
            {rep.input.crashers && tick >= crashTick && (
              <div class="team crashers">
                <b>🚨 {nameOf(rep.input.crashers.set)}</b>
                {rep.input.crashers.characters.map((c) => (
                  <div class="small">
                    {c.name} <span class="muted">({nameOf(c.persona ?? '')})</span> <CareerChain careers={c.careers} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
