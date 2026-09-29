import { useEffect, useRef, useState } from 'preact/hooks';
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

const SPEEDS = [1, 2, 4];
const FEED_MAX = 40;
const MAX_REPLAYS = 5;
const REPLAY_SPEED = 0.35;
const REPLAY_KEY = 'cc.replays';

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
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [replaysOn, setReplaysOn] = useState(readReplayPref);
  const replaysOnRef = useRef(replaysOn);
  const actionRef = useRef<ActionReplay | null>(null);
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
    const renderer = new BattleRenderer(rep.input);
    rendererRef.current = renderer;
    setMuted(renderer.sfx.muted);
    let raf = 0;
    let last = performance.now();
    let alive = true;
    void renderer.mount(host.current).then(() => {
      const loop = (now: number) => {
        if (!alive) return;
        const dt = Math.min(100, now - last);
        last = now;
        const ar = actionRef.current;
        // Start a pending action replay once the moment has had a beat to land.
        if (ar && !ar.active && now >= ar.startAt) {
          ar.active = true;
          ar.returnTick = player.tick;
          ar.prevSpeed = player.speed;
          player.seek(Math.max(0, ar.tick - 50));
          coveredRef.current = Math.max(coveredRef.current, ar.endTick + 30);
          if (ar.source >= 0) sourceCooldownRef.current.set(ar.source, ar.endTick + 300);
          player.drainEvents();
          renderer.resetFx();
          renderer.setReplay(ar.focus, ar.dramatic ? '● GRUDGE SETTLED' : undefined);
          player.speed = ar.dramatic ? REPLAY_SPEED * 0.7 : REPLAY_SPEED;
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
        const flow = renderer.timeScale();
        player.advance(dt * flow);
        const events = player.drainEvents();
        renderer.render(player, flow ? dt : dt * 0.1, events);
        if (ar?.active) {
          if (player.tick >= ar.endTick + 18 || player.done) {
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
                startAt: now + 900,
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
  const seek = (t: number) => {
    const player = playerRef.current;
    if (!player) return;
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
              class={replaysOn ? 'on' : ''}
              aria-label="Toggle action replays"
              title="Slow-motion replays of knockouts"
              onClick={() => {
                const v = !replaysOn;
                setReplaysOn(v);
                replaysOnRef.current = v;
                try {
                  window.localStorage.setItem(REPLAY_KEY, v ? '1' : '0');
                } catch {
                  /* storage unavailable */
                }
              }}
            >
              ⟲
            </button>
            {inReplay && (
              <button
                class="on"
                onClick={() => {
                  // End the replay on the next frame without clearing the commentary feed.
                  if (actionRef.current) actionRef.current.tick = -1000;
                }}
              >
                Skip replay
              </button>
            )}
          </div>
          <div class="feed" aria-live="polite">
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
              <h2>{report.winnerName ? `🏆 ${report.winnerName} wins` : 'Draw'}</h2>
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
          </div>
        </div>
      </div>
    </section>
  );
}
