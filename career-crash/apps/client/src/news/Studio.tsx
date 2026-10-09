import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { createBattle, Rng, SIM_VERSION, TICKS_PER_SECOND, type BattleInput, type CharacterSnapshot, type TeamSnapshot } from '@cc/sim';
import { Sfx } from '../replay/audio';
import { music } from '../replay/music';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import { voiceFor, withVoice, type Voice } from '../replay/voices';
import { Portrait } from '../ui/components';
import { ANCHORS, type Anchor } from './cast';
import { checkEpisode, cueAt, moodOf, timeline, type Cue, type Episode, type Seat } from './episode';
import { EPISODES, pickEpisode } from './episodes';
import { MINIGAMES, minigameById } from './minigames';

/** Seconds of run-up shown before the first punch lands. */
const BRAWL_RUNUP_TICKS = TICKS_PER_SECOND;
/** The cut to the brawl holds still this long so everyone's shout reads (no ability callouts over it). */
const BRAWL_FREEZE_MS = 800;

interface Person {
  seat: Seat;
  name: string;
  role: string;
  career: string;
  color: string;
  voice: Voice;
}

function cast(ep: Episode): Person[] {
  const anchor = (a: Anchor): Person => ({ ...a, voice: withVoice(voiceFor(a.career.replace('career.', ''), a.name, ''), { type: a.voice, pitch: a.pitch }) });
  const out = [anchor(ANCHORS.us), anchor(ANCHORS.uk)];
  const g = ep.guest;
  if (g) out.push({ seat: 'guest', name: g.name, role: g.role, career: g.career, color: '#0e7c66', voice: voiceFor(g.career.replace('career.', ''), g.name, '') });
  return out;
}

/** The brawl: every seat in the shot as its own side, free-for-all. */
function brawlInput(ep: Episode, people: Person[]): BattleInput {
  const teams: TeamSnapshot[] = people.map((p) => {
    const base = toSnapshot(generateRecruit(bundle, Rng.fromSeed(`news:${p.seat}`), `news-${p.seat}`));
    const held = bundle.careers.find((c) => c.id === p.career)?.art.heldItem ?? null;
    const c: CharacterSnapshot = { ...base, name: p.name, careers: [p.career], masteries: [], held, level: 6 };
    return { playerId: `news-${p.seat}`, playerName: p.name, rating: 1000, characters: [c] };
  });
  return { schemaVersion: 1, contentHash: bundle.hash, simVersion: SIM_VERSION, seed: ep.id, arenaId: ep.brawl.arena ?? 'arena.theatre', mode: 'ffa', teams, modifiers: [] };
}

/** Where to start the brawl: just before the first blow lands (the anchors start across the stage). */
function firstHitTick(input: BattleInput): number {
  const b = createBattle(input, bundle);
  const limit = TICKS_PER_SECOND * 30;
  while (!b.done() && b.world.tick < limit) {
    b.step();
    if (b.world.events.some((e) => e.type === 'hit')) return b.world.tick;
  }
  return 0;
}

/** Milliseconds since the segment started rolling (from `from`), per frame. */
function useNow(running: boolean, from: number, take: number): number {
  const [ms, setMs] = useState(from);
  useEffect(() => {
    if (!running) return;
    const t0 = performance.now() - from;
    setMs(from);
    let raf = 0;
    const loop = (t: number) => {
      setMs(t - t0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, take]);
  return ms;
}

/** `?at=<ms>` starts the first take part-way in (checking a week's script, screenshots). */
const START_AT = Math.max(0, Number(new URLSearchParams(window.location.search).get('at')) || 0);

type Stage = 'cold' | 'segment' | 'game' | 'signoff';

export function Studio() {
  const ep = useMemo(() => pickEpisode(), []);
  const people = useMemo(() => cast(ep), [ep]);
  const { cues, totalMs } = useMemo(() => timeline(ep), [ep]);
  const problems = useMemo(() => checkEpisode(ep, MINIGAMES.map((m) => m.id)), [ep]);
  const game = minigameById(ep.minigame);
  const [stage, setStage] = useState<Stage>('cold');
  const [take, setTake] = useState(0);
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<{ score?: number; line: string } | null>(null);
  const ms = useNow(stage === 'segment', take === 1 ? START_AT : 0, take);
  const cue: Cue = cueAt(cues, ms);
  const sfx = useMemo(() => new Sfx(), []);
  const brawlHost = useRef<HTMLDivElement>(null);
  const gameHost = useRef<HTMLDivElement>(null);
  const brawlRef = useRef<{ start(): void } | null>(null);
  const lastCue = useRef<Cue | null>(null);

  useEffect(() => sfx.setMuted(muted), [muted]);
  const sting = (id: Parameters<typeof music.sting>[0]) => !muted && music.sting(id);

  // The segment ends: hand over to the minigame.
  useEffect(() => {
    if (stage === 'segment' && ms >= totalMs) setStage('game');
  }, [stage, ms, totalMs]);

  // One-shot effects on each new cue: stings, the anchor's voice.
  useEffect(() => {
    if (stage !== 'segment' || lastCue.current === cue) return;
    lastCue.current = cue;
    if (cue.phase === 'ident') sting('start');
    else if (cue.phase === 'desk') {
      const b = ep.beats[cue.beat!]!;
      const p = people.find((x) => x.seat === b.who);
      if (p) sfx.speak(b.text, p.voice, true);
      if (b.heat === 3) sfx.play('ooh');
    } else if (cue.phase === 'brawl') {
      sting('crash');
      brawlRef.current?.start();
    } else if (cue.phase === 'standby') sfx.play('whistle');
    else if (cue.phase === 'handoff') sting('win');
  }, [stage, cue]);

  // The brawl renderer: mounted (hidden) when the segment starts so it's ready on the cut.
  useEffect(() => {
    if (stage !== 'segment' || !brawlHost.current) return;
    const input = brawlInput(ep, people);
    const player = new ReplayPlayer(input, { probe: false });
    player.totalTicks = TICKS_PER_SECOND * 60;
    player.seek(Math.max(0, firstHitTick(input) - BRAWL_RUNUP_TICKS));
    player.drainEvents();
    const renderer = new BattleRenderer(input);
    renderer.sfx.setMuted(muted);
    let alive = true;
    let running = false;
    let frozenUntil = 0;
    let raf = 0;
    let last = performance.now();
    /** Shouts still to land: tried each frame, since the renderer may still be loading on the cut. */
    let shouts: { id: number; line: string }[] = [];
    brawlRef.current = {
      start() {
        running = true;
        last = performance.now();
        frozenUntil = last + BRAWL_FREEZE_MS;
        // Everyone gets their line in as the first punch lands.
        shouts = player.world.entities.flatMap((e) => {
          const seat = e.kind === 'char' && e.summonOf < 0 ? people[e.team]?.seat : undefined;
          const line = seat && ep.brawl.shouts?.[seat];
          return line ? [{ id: e.id, line }] : [];
        });
      },
    };
    void renderer.mount(brawlHost.current).then(() => {
      if (!alive) return;
      renderer.render(player, 0, []);
      const loop = (t: number) => {
        if (!alive) return;
        const dt = Math.min(100, t - last);
        last = t;
        if (running) {
          const frozen = t < frozenUntil;
          if (!frozen) player.advance(dt * renderer.timeScale());
          renderer.render(player, dt, frozen ? [] : player.drainEvents());
          if (shouts.length) shouts = shouts.filter((x) => !renderer.speak(x.id, x.line, 1800));
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      renderer.destroy();
      brawlRef.current = null;
    };
  }, [stage, take]);

  // The week's minigame.
  useEffect(() => {
    if (stage !== 'game' || !game || !gameHost.current) return;
    return game.mount(gameHost.current, {
      episode: ep,
      done: (r) => {
        setResult(r);
        setTimeout(() => setStage('signoff'), 700);
      },
    });
  }, [stage]);

  const roll = () => {
    sfx.unlock();
    music.unlock();
    lastCue.current = null;
    setResult(null);
    setTake((n) => n + 1);
    setStage('segment');
  };

  const deskBeat = cue.phase === 'desk' ? cue.beat! : cue.phase === 'ident' ? -1 : ep.beats.length;
  const beat = deskBeat >= 0 ? ep.beats[Math.min(deskBeat, ep.beats.length - 1)] : undefined;
  const heat = cue.phase === 'desk' ? beat!.heat : cue.phase === 'ident' ? 0 : 3;
  const speaking = cue.phase === 'desk' ? beat!.who : null;
  const progress = cue.phase === 'desk' ? Math.min(1, (ms - cue.at) / (cue.ms * 0.7)) : 1;
  const speaker = speaking ? people.find((p) => p.seat === speaking) : undefined;
  const guestIn = !!ep.guest && deskBeat >= ep.guest.enters;
  const moodFor = (seat: Seat) => {
    if (cue.phase !== 'desk') return 'neutral';
    // The one talking wears the line's face; the others react to how heated it's got.
    if (seat === speaking) return moodOf(beat!);
    return heat >= 2 ? 'angry' : heat === 1 && seat !== 'guest' ? 'surprised' : 'neutral';
  };
  const showDesk = stage === 'segment' && (cue.phase === 'ident' || cue.phase === 'desk');

  return (
    <div class="bn">
      <header class="bn-top">
        <div class="bn-brand">
          <span class="bn-brand-mark">BROKEN</span>
          <span class="bn-brand-sub">NEWS</span>
        </div>
        <div class="bn-top-meta">
          {ep.week} · {ep.headline}
        </div>
      </header>

      <div class={`bn-screen bn-heat-${showDesk ? heat : 0}`} data-phase={stage === 'segment' ? cue.phase : stage}>
        {/* The brawl sits underneath the desk shot, ready for the cut. */}
        <div class="bn-brawl" ref={brawlHost} style={{ visibility: stage === 'segment' && cue.phase === 'brawl' ? 'visible' : 'hidden' }} />

        {stage === 'cold' && (
          <div class="bn-card bn-cold">
            <div class="bn-ident-logo">
              BROKEN<span>NEWS</span>
            </div>
            <p class="bn-tag">We break it. You fix it.</p>
            <button class="bn-go" onClick={roll}>
              ▶ Watch tonight's bulletin
            </button>
            {problems.length > 0 && (
              <ul class="bn-problems">
                {problems.map((p) => (
                  <li key={p}>⚠ {p}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {stage === 'segment' && cue.phase === 'ident' && (
          <div class="bn-card bn-ident">
            <div class="bn-ident-logo bn-slam">
              BROKEN<span>NEWS</span>
            </div>
          </div>
        )}

        {showDesk && cue.phase === 'desk' && (
          <div class="bn-studio">
            <div class="bn-wall">
              <div class="bn-wall-logo">BN</div>
              <div class="bn-wall-story">{ep.headline}</div>
              <div class="bn-wall-logo">BN</div>
            </div>
            <div class="bn-skyline" />
            <div class="bn-cam">
              {people.map((p) => {
                if (p.seat === 'guest' && !guestIn) return null;
                return (
                  <div key={p.seat} class={`bn-person bn-seat-${p.seat}${p.seat === speaking ? ' bn-talking' : ''}`} style={{ '--c': p.color }}>
                    <div class="bn-head">
                      <Portrait c={{ appearance: { skin: '#e0b48a', hair: '#3b2416', hairStyle: 0 }, careers: [p.career] }} size={160} mood={moodFor(p.seat)} />
                    </div>
                    <div class="bn-suit">
                      <i class="bn-tie" />
                    </div>
                  </div>
                );
              })}
              <div class="bn-desk">
                <div class="bn-desk-logo">BROKEN NEWS</div>
                <div class={`bn-papers bn-papers-${heat}`} />
              </div>
            </div>
            {beat && speaker && (
              <div class={`bn-bubble bn-bubble-${speaker.seat}`}>
                {beat.text.slice(0, Math.ceil(beat.text.length * progress))}
              </div>
            )}
          </div>
        )}

        {stage === 'segment' && cue.phase === 'standby' && (
          <div class="bn-card bn-bars">
            <div class="bn-bars-stripes" />
            <div class="bn-bars-text">WE ARE EXPERIENCING TECHNICAL DIFFICULTIES</div>
          </div>
        )}

        {stage === 'segment' && cue.phase === 'handoff' && (
          <div class="bn-card bn-handoff">
            <div class="bn-handoff-kicker">THIS WEEK ON BROKEN NEWS</div>
            <div class="bn-handoff-title">{game?.title ?? ep.minigame}</div>
            <div class="bn-handoff-blurb">{game?.blurb}</div>
          </div>
        )}

        {stage === 'game' && <div class="bn-game" ref={gameHost} />}

        {stage === 'signoff' && (
          <div class="bn-card bn-signoff">
            <div class="bn-handoff-kicker">THAT'S THE NEWS</div>
            <div class="bn-handoff-title">{result?.line ?? 'Goodnight.'}</div>
            <div class="bn-real">
              <b>The real story</b> {ep.realStory.text}
              {ep.realStory.source && (
                <>
                  {' '}
                  <a href={ep.realStory.source} target="_blank" rel="noopener noreferrer">
                    Source
                  </a>
                </>
              )}
            </div>
            <div class="bn-handoff-blurb">Brock and Philippa will be back next week, legal permitting.</div>
            <button class="bn-go" onClick={roll}>
              ↺ Watch it again
            </button>
          </div>
        )}

        {/* Broadcast furniture: on for the desk and the brawl. */}
        {stage === 'segment' && (cue.phase === 'desk' || cue.phase === 'brawl') && (
          <>
            <div class="bn-live">● LIVE</div>
            <div class="bn-clock">7:00 PM ET · MIDNIGHT GMT</div>
            {speaker && (
              <div class="bn-third" style={{ '--c': speaker.color }}>
                <b>{speaker.name}</b>
                <span>{speaker.role}</span>
              </div>
            )}
            <div class="bn-chyron">
              <span class="bn-breaking">{cue.phase === 'brawl' ? 'LIVE' : 'BREAKING'}</span>
              <span class="bn-chyron-text">{cue.phase === 'brawl' ? 'ANCHORS "IN DISCUSSION"' : ep.chyron}</span>
            </div>
            <div class="bn-ticker">
              <div class="bn-ticker-run">
                {[...ep.ticker, ...ep.ticker].map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div class="bn-controls">
        {stage === 'segment' && (
          <button onClick={() => setStage('game')}>Skip to the game ⏭</button>
        )}
        {stage !== 'cold' && stage !== 'segment' && <button onClick={roll}>↺ Replay the open</button>}
        <button onClick={() => setMuted(!muted)}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
        {EPISODES.length > 1 && (
          <select
            value={ep.id}
            onChange={(e) => {
              window.location.search = `?ep=${(e.target as HTMLSelectElement).value}`;
            }}
          >
            {EPISODES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.week} · {x.headline}
              </option>
            ))}
          </select>
        )}
        <span class="bn-runtime">
          open runs {(totalMs / 1000).toFixed(1)} s{stage === 'segment' ? ` · ${(ms / 1000).toFixed(1)} s` : ''}
        </span>
      </div>
      <p class="bn-foot">
        A <a href="/">Career Crash</a> prototype. Satire: no real anchors, printers or Emmys were harmed.
      </p>
    </div>
  );
}
