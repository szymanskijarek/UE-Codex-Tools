import { useEffect, useRef, useState } from 'preact/hooks';
import { buildReport, type BattleReport } from '@cc/commentary';
import { bundle } from '@cc/content';
import { simulate } from '@cc/sim';
import { api } from '../api';
import { nameOf } from '../i18n';
import { currentReplay, navigate, notify } from '../state';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import { Card, CareerChain, Empty } from '../ui/components';

const SPEEDS = [1, 2, 4];

export function Replay({ battleId }: { battleId?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [report, setReport] = useState<BattleReport | null>(null);
  const [loading, setLoading] = useState(false);
  const rep = currentReplay.value;

  // Deep link: load from the server when we don't already have the input.
  useEffect(() => {
    if (!battleId || battleId === 'local' || rep?.id === battleId) return;
    setLoading(true);
    api
      .battle(battleId)
      .then((r) => (currentReplay.value = { id: r.id, input: r.input, resultHash: r.resultHash, title: `${r.summary.attackerName} vs ${r.summary.defenderName}`, back: '/reports' }))
      .catch((e: Error) => notify(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [battleId]);

  useEffect(() => {
    if (!rep || !host.current) return;
    const player = new ReplayPlayer(rep.input);
    playerRef.current = player;
    if (rep.resultHash && player.finalHash !== rep.resultHash) {
      // 01 §3.3: a mismatch is a determinism bug; show the replay anyway and report it.
      console.warn('Replay desync', { expected: rep.resultHash, got: player.finalHash });
      notify('Replay desync detected — please report this bug.', 'error');
    }
    setReport(buildReport(bundle, rep.input, simulate(rep.input, bundle)));
    const renderer = new BattleRenderer(rep.input);
    let raf = 0;
    let last = performance.now();
    let alive = true;
    void renderer.mount(host.current).then(() => {
      const loop = (now: number) => {
        if (!alive) return;
        const dt = Math.min(100, now - last);
        last = now;
        player.advance(dt);
        renderer.render(player, dt);
        setTick(player.tick);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      renderer.destroy();
      playerRef.current = null;
    };
  }, [rep?.input]);

  if (loading) return <Empty>Loading replay…</Empty>;
  if (!rep) return <Empty>No replay selected. Fight someone, open a report, or run a <a href="#/sandbox">Sandbox</a> battle.</Empty>;
  const p = playerRef.current;
  const total = p?.totalTicks ?? 1;
  const seek = (t: number) => {
    playerRef.current?.seek(t);
    setTick(t);
  };

  return (
    <section class="replay">
      <div class="replay-head">
        <button class="ghost small" onClick={() => navigate(rep.back)}>
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
              onClick={() => {
                if (!playerRef.current) return;
                if (playerRef.current.done) seek(0);
                playerRef.current.paused = !paused;
                setPaused(!paused);
              }}
            >
              {paused ? '▶' : '❚❚'}
            </button>
            <input type="range" min={0} max={total} value={tick} onInput={(e) => seek(Number((e.target as HTMLInputElement).value))} />
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
            <button onClick={() => seek(total)}>⏭</button>
          </div>
          <div class="teams">
            {rep.input.teams.map((t, i) => (
              <div class={`team t${i}`}>
                <b>{t.playerName}</b>
                {t.characters.map((c) => (
                  <div class="small">
                    {c.name} <CareerChain careers={c.careers} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {report && (
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
        )}
      </div>
    </section>
  );
}
