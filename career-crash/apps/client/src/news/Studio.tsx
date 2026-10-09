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
import { BSN_OFFICIAL, checkEpisode, cueAt, deskFace, shownText, typeMs, type DeskFace, moodOf, timeline, type Cue, type Episode, type Seat } from './episode';
import { EPISODES, pickEpisode } from './episodes';
import { MINIGAMES, minigameById } from './minigames';
import backdropUrl from './art/desk-backdrop.webp';
import deskUrl from './art/desk-front.webp';
import logoUrl from './art/logo.webp';
import bugUrl from './art/bsn-bug.webp';
import identUrl from './art/ident.webp';
import chairUrl from './art/rogue-chair.webp';

/** The rogue chair's flight (news.css `bn-chair-fly`): it hits its target this far in. */
const CHAIR_HIT_MS = 600;
/** The desk bed's tempo by heat. */
const BED_TEMPO = [1, 1.06, 1.14, 1.24];
const CHAIR_FLY_MS = 1100;

/** Painted desk-shot people, `art/desk-<who>-<face>.webp`; anyone without them falls back to their career face. */
const DESK_ART = import.meta.glob('./art/desk-*-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const deskArt = (who: string | undefined, face: DeskFace): string | undefined =>
  who ? (DESK_ART[`./art/desk-${who}-${face}.webp`] ?? (face === 'hurt' ? DESK_ART[`./art/desk-${who}-surprised.webp`] : undefined)) : undefined;
/** The same picture with the other mouth (`…-<face>-b.webp`, open if the main one is shut and vice versa), for lip flap. */
const deskArtAlt = (who: string | undefined, face: DeskFace) => (who ? DESK_ART[`./art/desk-${who}-${face}-b.webp`] : undefined);
/** Lip flap: how long each mouth frame holds while a line is being typed out. */
const FLAP_MS = 130;

/** Seconds of run-up shown before the first punch lands. */
const BRAWL_RUNUP_TICKS = TICKS_PER_SECOND;
/** The cut to the brawl holds still this long so everyone's shout reads (no ability callouts over it). */
const BRAWL_FREEZE_MS = 800;
/** How far the brawl camera may zoom in (the director's wide shot is 1). */
const BRAWL_ZOOM = 3.4;
/** The chyron and ticker cover the bottom of the picture (news.css: 6.5% + 8%). */
const BRAWL_STRAP_CLEAR = 0.16;

interface Person {
  seat: Seat;
  name: string;
  role: string;
  career: string;
  color: string;
  voice: Voice;
  bsn?: string;
  art?: string;
  persona?: string;
}

function cast(ep: Episode): Person[] {
  const anchor = (a: Anchor): Person => ({ ...a, voice: withVoice(voiceFor(a.career.replace('career.', ''), a.name, ''), { type: a.voice, pitch: a.pitch }) });
  const out = [anchor(ANCHORS.us), anchor(ANCHORS.uk)];
  const g = ep.guest;
  if (g) out.push({ seat: 'guest', name: g.name, role: g.role, career: g.career, color: '#0e7c66', voice: voiceFor(g.career.replace('career.', ''), g.name, ''), bsn: g.bsn, art: g.art, persona: g.persona });
  return out;
}

/** The brawl: every seat in the shot as its own side, free-for-all. */
function brawlInput(ep: Episode, people: Person[]): BattleInput {
  const teams: TeamSnapshot[] = people.map((p) => {
    const base = toSnapshot(generateRecruit(bundle, Rng.fromSeed(`news:${p.seat}`), `news-${p.seat}`));
    const held = bundle.careers.find((c) => c.id === p.career)?.art.heldItem ?? null;
    const c: CharacterSnapshot = { ...base, name: p.name, careers: [p.career], masteries: [], held, level: 6, ...(p.persona ? { persona: p.persona } : {}) };
    return { playerId: `news-${p.seat}`, playerName: p.name, rating: 1000, characters: [c] };
  });
  return { schemaVersion: 1, contentHash: bundle.hash, simVersion: SIM_VERSION, seed: ep.id, arenaId: ep.brawl.arena ?? 'arena.news-studio', mode: 'ffa', teams, modifiers: [] };
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

/**
 * Milliseconds since the segment started rolling (from `from`), per frame.
 * Keyed by take: a new take reads `from` from its very first render, never the
 * last take's clock (which, past the end, would skip the replay straight on).
 */
function useNow(running: boolean, from: number, take: number): number {
  const [now, setNow] = useState({ take, ms: from });
  useEffect(() => {
    if (!running) return;
    const t0 = performance.now() - from;
    setNow({ take, ms: from });
    let raf = 0;
    const loop = (t: number) => {
      setNow({ take, ms: t - t0 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, take]);
  return now.take === take ? now.ms : from;
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
    if (cue.phase === 'ident') sting('newsIdent');
    else if (cue.phase === 'desk') {
      const b = ep.beats[cue.beat!]!;
      const p = people.find((x) => x.seat === b.who);
      // The voice talks exactly as long as the bubble types: word for word, the same length.
      if (p) sfx.speak(shownText(b, typeMs(b)), p.voice, true, typeMs(b) / 1000);
      if (b.heat === 3) sfx.play('ooh');
      if (b.chair) {
        sfx.play('whoosh');
        setTimeout(() => {
          sfx.play('crit');
          sfx.play('boing');
        }, CHAIR_HIT_MS);
      }
    } else if (cue.phase === 'brawl') {
      brawlRef.current?.start();
    } else if (cue.phase === 'standby') sting('testTone');
    else if (cue.phase === 'handoff') sting('newsHandoff');
  }, [stage, cue]);

  // The score (10 §2.2): the bed under the desk, the brawl track under the fight, the BSN anthem
  // under the game and the sign-off. Stings cover the ident, the bars and the hand-off.
  const song = stage === 'segment' ? (cue.phase === 'desk' ? 'news-bed' : cue.phase === 'brawl' ? 'news-brawl' : null) : stage === 'game' || stage === 'signoff' ? 'news-theme' : null;
  useEffect(() => {
    if (song && !muted) music.play(song);
    else music.finish(song ? 200 : 350);
  }, [song, muted]);
  useEffect(() => () => music.finish(200), []);

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
        renderer.hold(false);
        last = performance.now();
        frozenUntil = last + BRAWL_FREEZE_MS;
        // Everyone gets their line in as the first punch lands.
        // A close-up on the anchors (the guest runs into shot), not the wide shot of a mass brawl.
        const anchors = player.world.entities.filter((e) => e.kind === 'char' && e.summonOf < 0 && (people[e.team]?.seat === 'us' || people[e.team]?.seat === 'uk')).map((e) => e.id);
        renderer.closeUp(anchors, BRAWL_ZOOM, true, BRAWL_STRAP_CLEAR);
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
      // Ready for the cut, but drawn nothing more until it comes.
      if (!running) renderer.hold(true);
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
  // The bed speeds up as the desk heats up (eased inside Music).
  if (song === 'news-bed') music.setTempo(BED_TEMPO[heat]!);
  const progress = cue.phase === 'desk' && beat ? Math.min(1, (ms - cue.at) / typeMs(beat)) : 1;
  const speaker = speaking ? people.find((p) => p.seat === speaking) : undefined;
  const guestIn = !!ep.guest && deskBeat >= ep.guest.enters;
  const moodFor = (seat: Seat) => {
    if (cue.phase !== 'desk') return 'neutral';
    // The one talking wears the line's face; the others react to how heated it's got.
    if (seat === speaking) return moodOf(beat!);
    return heat >= 2 ? 'angry' : heat === 1 && seat !== 'guest' ? 'surprised' : 'neutral';
  };
  const showDesk = stage === 'segment' && (cue.phase === 'ident' || cue.phase === 'desk');
  // The chair is in the air until it lands: its target only flinches then.
  const chairT = cue.phase === 'desk' && beat?.chair ? ms - cue.at : -1;
  const chairHit = chairT >= CHAIR_HIT_MS && chairT < CHAIR_HIT_MS + 350;
  const faceFor = (seat: Seat): DeskFace => {
    if (cue.phase !== 'desk' || !beat) return 'neutral';
    if (beat.chair === seat && chairT < CHAIR_HIT_MS) return 'surprised';
    // Dead air: once the line is out, everyone else just stares.
    if (beat.pause === 'awkward' && progress >= 1 && seat !== beat.who && beat.chair !== seat) return 'neutral';
    return deskFace(beat, seat);
  };

  // Fetch every painted expression up front, so a face swap never flashes empty.
  useEffect(() => {
    for (const url of Object.values(DESK_ART)) new Image().src = url;
  }, []);

  return (
    <div class="bn">
      <header class="bn-top">
        <div class="bn-brand">
          <img class="bn-brand-logo" src={logoUrl} alt="Broken News on BSN" />
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
            <img class="bn-logo-img" src={logoUrl} alt="Broken News on BSN" />
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
            <img class="bn-ident-img bn-slam" src={identUrl} alt="Broken News, on BSN" />
          </div>
        )}

        {showDesk && cue.phase === 'desk' && (
          <div class={`bn-studio${chairHit ? ' bn-chair-hit' : ''}`}>
            {/* The painted studio (art/news brief 01); the game writes on its screens. */}
            <img class="bn-layer" src={backdropUrl} alt="" />
            <div class="bn-screen-l">BSN</div>
            <div class="bn-screen-c">{ep.headline}</div>
            <div class="bn-screen-r">BSN</div>
            <div class="bn-cam">
              {people.map((p) => {
                if (p.seat === 'guest' && !guestIn) return null;
                const face = faceFor(p.seat);
                // The speaker's mouth flaps while their line types out, when there's a second mouth frame.
                const flap = p.seat === speaking && progress < 1 && Math.floor(ms / FLAP_MS) % 2 === 1;
                const art = (flap && deskArtAlt(p.art, face)) || deskArt(p.art, face);
                if (art)
                  return (
                    <div key={p.seat} class={`bn-person bn-painted bn-seat-${p.seat}${p.seat === speaking ? ' bn-talking' : ''}`}>
                      <img src={art} alt="" />
                    </div>
                  );
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
              <img class="bn-layer bn-desk" src={deskUrl} alt="" />
              {beat?.chair && chairT < CHAIR_FLY_MS && <i key={cue.beat} class={`bn-chair bn-chair-to-${beat.chair}`} style={{ backgroundImage: `url(${chairUrl})` }} />}
              <div class="bn-desk-logo">
                BROKEN NEWS <span>BSN</span>
              </div>
              <div class={`bn-papers bn-papers-${heat}`} />
            </div>
            {beat && speaker && (
              <div class={`bn-bubble bn-bubble-${speaker.seat}`}>
                {shownText(beat, ms - cue.at)}
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
            <div class="bn-bsn">
              <b>BSN</b> stands for {BSN_OFFICIAL}. Officially.
              {people.map((p) => p.bsn && (
                <span key={p.seat}>
                  {' '}
                  {p.name.split(' ')[0]}: <i>{p.bsn}</i>.
                </span>
              ))}{' '}
              Ticker: <i>{ep.bsn}</i>.
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
            <img class="bn-bug" src={bugUrl} alt="BSN" />
            <div class="bn-clock">7:00 PM ET · MIDNIGHT GMT</div>
            {speaker && (
              <div class="bn-third" style={{ '--c': speaker.color }}>
                <b>{speaker.name}</b>
                <span>
                  {speaker.role}
                  {speaker.bsn && ` · ${speaker.bsn}`}
                </span>
              </div>
            )}
            <div class="bn-chyron">
              <span class="bn-breaking">{cue.phase === 'brawl' ? 'LIVE' : 'BREAKING'}</span>
              <span class="bn-chyron-text">{cue.phase === 'brawl' ? 'ANCHORS "IN DISCUSSION"' : ep.chyron}</span>
            </div>
            <div class="bn-ticker">
              <div class="bn-ticker-run">
                {[`BSN: ${ep.bsn.toUpperCase()}`, ...ep.ticker, `BSN: ${ep.bsn.toUpperCase()}`, ...ep.ticker].map((t, i) => (
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
