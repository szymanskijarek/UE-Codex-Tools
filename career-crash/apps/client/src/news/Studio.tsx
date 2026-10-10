import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { bundle } from '@cc/content';
import { generateRecruit, toSnapshot } from '@cc/game-rules';
import { createBattle, Rng, SIM_VERSION, TICKS_PER_SECOND, type BattleInput, type CharacterSnapshot, type TeamSnapshot } from '@cc/sim';
import { Sfx } from '../replay/audio';
import { music } from '../replay/music';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import { voiceFor, withVoice, type Voice } from '../replay/voices';
import type { ComponentChildren } from 'preact';
import type { Emotion } from '../replay/face-art';
import { Portrait } from '../ui/components';
import { ANCHORS, FIELD, JEFF, type Anchor } from './cast';
import { arenaArt } from '../replay/arena-art';
import { BLEEP, BSN_OFFICIAL, bleepsAt, checkEpisode, type Drop, cueAt, deskFace, isAction, shotOf, shownText, splitAnchor, typeMs, type Beat, type Shot, type DeskFace, moodOf, timeline, type Cue, type Cameo, type Episode, type Seat } from './episode';
import { ON_AIR, pickEpisode } from './episodes';
import { MINIGAMES, minigameById } from './minigames';
import { voiceFlags } from './voice';
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
/** Jeff's drop (news.css `bn-drop-fall`): it lands on Brock this far in, and is gone after. */
const DROP_HIT_MS = 520;
const DROP_FALL_MS = 1200;
/** Until the drop sprites arrive (art brief 11), a stand-in for each, and what it sounds like landing. */
const DROP_ART = import.meta.glob('./art/drop-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const DROP_STAND_IN: Record<Drop, string> = { light: '💡', boom: '🎙️', sandbag: '💰', coffee: '☕', tile: '⬜' };
const DROP_SOUND: Record<Drop, 'clang' | 'thud' | 'splash' | 'bonk'> = { light: 'clang', boom: 'bonk', sandbag: 'thud', coffee: 'splash', tile: 'bonk' };

/** A line as shown: any bleeped word is a censor bar. */
function Line({ text }: { text: string }) {
  if (!text.includes(BLEEP[0]!)) return <>{text}</>;
  return (
    <>
      {text.split(/(\u2588+)/).map((part, i) => (part.startsWith(BLEEP[0]!) ? <span key={i} class="bn-bleep">{part}</span> : part))}
    </>
  );
}

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
  /** Reporter height in the shot (cast.ts). */
  height?: number;
}

/** The reporter in the field, when the episode has a report (not in the studio brawl). */
function reporterOf(ep: Episode): Person | null {
  if (!ep.field) return null;
  const r = FIELD[ep.field.reporter];
  return { ...r, voice: withVoice(voiceFor(r.career.replace('career.', ''), r.name, ''), { type: r.voice, pitch: r.pitch }) };
}

function cast(ep: Episode): Person[] {
  const anchor = (a: Anchor): Person => ({ ...a, voice: withVoice(voiceFor(a.career.replace('career.', ''), a.name, ''), { type: a.voice, pitch: a.pitch }) });
  const out = [anchor(ANCHORS.us), anchor(ANCHORS.uk)];
  const g = ep.guest;
  if (g) out.push({ seat: 'guest', name: g.name, role: g.role, career: g.career, color: g.color ?? '#0e7c66', voice: voiceFor(g.career.replace('career.', ''), g.name, ''), bsn: g.bsn, art: g.art, persona: g.persona });
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
  const reporter = useMemo(() => reporterOf(ep), [ep]);
  /** Everyone who can speak: the desk, the guest, the reporter and Jeff off screen (the brawl is only the studio). */
  const voices = useMemo(() => {
    const jeff: Person = { ...JEFF, voice: withVoice(voiceFor('electrician', JEFF.name, ''), { type: JEFF.voice, pitch: JEFF.pitch }) };
    return [...people, ...(reporter ? [reporter] : []), ...(ep.beats.some((b) => b.who === 'jeff') ? [jeff] : [])];
  }, [people, reporter]);
  const { cues, totalMs } = useMemo(() => timeline(ep), [ep]);
  const problems = useMemo(() => [...checkEpisode(ep, MINIGAMES.map((m) => m.id)), ...voiceFlags(ep).map((f) => `voice, ${f}`)], [ep]);
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
  // The page's own sound switch covers the music too, whatever the game's music setting says.
  useEffect(() => music.setEnabled(!muted, false), [muted]);
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
      const p = voices.find((x) => x.seat === b.who);
      if (b.glitch) sfx.play('zap');
      // The voice talks exactly as long as the bubble types: word for word, the same length.
      if (p && !isAction(b)) sfx.speak(shownText(b, typeMs(b)), p.voice, true, typeMs(b) / 1000);
      if (b.heat === 3) sfx.play('ooh');
      if (b.chair) {
        sfx.play('whoosh');
        setTimeout(() => {
          sfx.play('crit');
          sfx.play('boing');
        }, CHAIR_HIT_MS);
      }
      if (b.drop) {
        const drop = b.drop;
        sfx.play('whoosh');
        setTimeout(() => {
          sfx.play(DROP_SOUND[drop]);
          sfx.play('boing');
        }, DROP_HIT_MS);
      }
      for (const f of bleepsAt(b)) setTimeout(() => sfx.play('bleep'), f * typeMs(b));
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
      sfx,
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
  const speaker = speaking ? voices.find((p) => p.seat === speaking) : undefined;
  const shot: Shot = cue.phase === 'desk' && cue.beat !== undefined ? shotOf(ep, cue.beat) : 'desk';
  // Satellite delay: the line to the field is out, and the reporter hasn't heard it yet.
  const delaying = cue.phase === 'desk' && beat?.pause === 'delay' && progress >= 1;
  const glitching = cue.phase === 'desk' && !!beat?.glitch && ms - cue.at < 650;
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
  // Jeff's drop falls on Brock, who doesn't see it coming.
  const dropT = cue.phase === 'desk' && beat?.drop ? ms - cue.at : -1;
  const dropHit = dropT >= DROP_HIT_MS && dropT < DROP_HIT_MS + 350;
  const faceFor = (seat: Seat): DeskFace => {
    if (cue.phase !== 'desk' || !beat) return 'neutral';
    if (beat.chair === seat && chairT < CHAIR_HIT_MS) return 'surprised';
    if (beat.drop && seat === 'us' && dropT < DROP_HIT_MS) return deskFace({ ...beat, drop: undefined }, seat);
    // Dead air: once the line is out, everyone else just stares.
    if (beat.pause === 'awkward' && progress >= 1 && seat !== beat.who && beat.chair !== seat) return 'neutral';
    return deskFace(beat, seat);
  };

  // Fetch this episode's painted expressions up front (its people and reporter only), so a face swap never flashes empty.
  useEffect(() => {
    const desk = people.map((p) => p.art).filter(Boolean).map((a) => `./art/desk-${a}-`);
    const field = reporter ? [`./art/field-${reporter.art}-`] : [];
    for (const [key, url] of Object.entries(DESK_ART)) if (desk.some((d) => key.startsWith(d))) new Image().src = url;
    for (const [key, url] of Object.entries(FIELD_ART)) if (field.some((d) => key.startsWith(d))) new Image().src = url;
    for (const b of ep.beats) if (b.drop && DROP_ART[`./art/drop-${b.drop}.webp`]) new Image().src = DROP_ART[`./art/drop-${b.drop}.webp`]!;
    for (const c of ep.field?.cameos ?? []) for (const k of ['', '-b']) if (CAMEO_ART[`./art/cameo-${c.art}${k}.webp`]) new Image().src = CAMEO_ART[`./art/cameo-${c.art}${k}.webp`]!;
  }, [people, reporter]);

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

        {showDesk && cue.phase === 'desk' && shot !== 'desk' && ep.field && reporter && beat && (
          <FieldShot
            shot={shot}
            ep={ep}
            reporter={reporter}
            anchor={people.find((p) => p.seat === splitAnchor(ep, cue.beat!))!}
            beat={beat}
            speaking={speaking}
            heat={heat}
            text={shownText(beat, ms - cue.at)}
            delaying={delaying}
            glitching={glitching}
            ms={ms}
            progress={progress}
          />
        )}

        {showDesk && cue.phase === 'desk' && shot === 'desk' && (
          <div class={`bn-studio${chairHit || dropHit ? ' bn-chair-hit' : ''}`}>
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
                      <Portrait c={{ appearance: { skin: '#e0b48a', hair: '#3b2416', hairStyle: 0 }, careers: [p.career], ...(p.persona ? { persona: p.persona } : {}) }} size={160} mood={moodFor(p.seat)} />
                    </div>
                    <div class="bn-suit">
                      <i class="bn-tie" />
                    </div>
                  </div>
                );
              })}
              <img class="bn-layer bn-desk" src={deskUrl} alt="" />
              {beat?.chair && chairT < CHAIR_FLY_MS && <i key={cue.beat} class={`bn-chair bn-chair-to-${beat.chair}`} style={{ backgroundImage: `url(${chairUrl})` }} />}
              {beat?.drop && dropT < DROP_FALL_MS && (
                <i key={`d${cue.beat}`} class={`bn-drop bn-drop-${beat.drop}`} style={DROP_ART[`./art/drop-${beat.drop}.webp`] ? { backgroundImage: `url(${DROP_ART[`./art/drop-${beat.drop}.webp`]})` } : undefined}>
                  {DROP_ART[`./art/drop-${beat.drop}.webp`] ? null : DROP_STAND_IN[beat.drop]}
                </i>
              )}
              <div class="bn-desk-logo">
                BROKEN NEWS <span>BSN</span>
              </div>
              <div class={`bn-papers bn-papers-${heat}`} />
            </div>
            {beat && speaker && (
              <div class={`bn-bubble bn-bubble-${speaker.seat}${isAction(beat) ? ' bn-action' : ''}`}>
                {speaker.seat === 'jeff' && <b class="bn-off">JEFF (OFF)</b>}
                <Line text={shownText(beat, ms - cue.at)} />
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
              {voices.map((p) => p.bsn && (
                <span key={p.seat}>
                  {' '}
                  {p.name.split(' ')[0]}: <i>{p.bsn}</i>.
                </span>
              ))}{' '}
              Ticker: <i>{ep.bsn}</i>.
            </div>
            <div class="bn-handoff-blurb">{ep.signoff ?? 'Brock and Philippa will be back next week, legal permitting.'}</div>
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
            <div class="bn-clock">{shot !== 'desk' && ep.field ? `${ep.field.localTime} LOCAL` : '7:00 PM ET · MIDNIGHT GMT'}</div>
            {shot !== 'desk' && <div class="bn-sat">📡 VIA SATELLITE{delaying ? ' · DELAY' : ''}</div>}
            {speaker && speaker.seat !== 'jeff' && (
              <div class="bn-third" style={{ '--c': speaker.color }}>
                <b>{speaker.name}</b>
                <span>
                  {speaker.role}
                  {speaker.bsn && ` · ${speaker.bsn}`}
                </span>
              </div>
            )}
            <div class="bn-chyron">
              <span class={`bn-breaking${shot !== 'desk' ? ' bn-dateline' : ''}`}>{cue.phase === 'brawl' || shot !== 'desk' ? 'LIVE' : 'BREAKING'}</span>
              <span class="bn-chyron-text">{cue.phase === 'brawl' ? 'ANCHORS "IN DISCUSSION"' : shot !== 'desk' && ep.field ? ep.field.dateline : ep.chyron}</span>
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
        {(ON_AIR.length > 1 || !ON_AIR.includes(ep)) && (
          <select
            value={ep.id}
            onChange={(e) => {
              window.location.search = `?ep=${(e.target as HTMLSelectElement).value}`;
            }}
          >
            {(ON_AIR.includes(ep) ? ON_AIR : [ep, ...ON_AIR]).map((x) => (
              <option key={x.id} value={x.id}>
                {x.week} · {x.headline}
                {x.active === false ? ' (off air)' : ''}
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

/** The reporter's painted pictures (art brief 06), once they exist; the career face stands in until then. */
const LOCATION_ART = import.meta.glob('./art/location-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const FIELD_ART = import.meta.glob('./art/field-*-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Cameos on location (`field.cameos`): their sprites, a glyph until they land, and how they move. */
const CAMEO_ART = import.meta.glob('./art/cameo-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const CAMEO_STAND_IN: Record<Cameo['art'], string> = { alpaca: '🦙', emu: '🦤' };
/** `beside` pans into frame over this long; `far` dashes from one side of the gate to the other in this long. */
const CAMEO_MS: Record<Cameo['spot'], number> = { beside: 5000, far: 1300 };
/** Frame swap: a slow chew beside the reporter, legs going flat out in the distance. */
const CAMEO_FRAME_MS: Record<Cameo['spot'], number> = { beside: 700, far: 110 };
const cameoStarts = new WeakMap<Episode, Map<number, number>>();
/** When line `i` starts, ms into the segment (cached per episode). */
function lineStart(ep: Episode, i: number): number {
  let m = cameoStarts.get(ep);
  if (!m) cameoStarts.set(ep, (m = new Map(timeline(ep).cues.filter((c) => c.beat !== undefined).map((c) => [c.beat!, c.at]))));
  return m.get(i) ?? 0;
}

/** A cameo on location: on its way in (or across) since its line started, by the segment clock, so a cut doesn't restart it. */
function CameoSprite({ ep, c, ms }: { ep: Episode; c: Cameo; ms: number }) {
  const since = ms - lineStart(ep, c.from);
  if (since < 0) return null;
  const second = Math.floor(since / CAMEO_FRAME_MS[c.spot]) % 2 === 1;
  const art = (second && CAMEO_ART[`./art/cameo-${c.art}-b.webp`]) || CAMEO_ART[`./art/cameo-${c.art}.webp`];
  // Beside: eases in once. Far: loose again, back and forth across the far field (faces the way it runs).
  const leg = since / CAMEO_MS[c.spot];
  const back = Math.floor(leg) % 2 === 1;
  const t = c.spot === 'beside' ? 1 - (1 - Math.min(1, leg)) ** 3 : back ? leg % 1 : 1 - (leg % 1);
  return (
    <div class={`bn-cameo bn-cameo-${c.spot}${c.spot === 'far' && back ? ' bn-cameo-flip' : ''}`} style={{ '--t': t }}>
      {art ? <img src={art} alt="" /> : <span class={second ? 'bn-cameo-step' : ''}>{CAMEO_STAND_IN[c.art]}</span>}
    </div>
  );
}

type FieldFace = 'neutral' | 'talk' | 'smug' | 'surprised' | 'angry' | 'frozen' | 'hurt';

/** The reporter's face on a line: frozen through a satellite delay, talking on their own lines. */
function fieldFace(b: Beat, delaying: boolean, speaking: boolean): FieldFace {
  if (delaying) return 'frozen';
  if (!speaking) return b.heat >= 2 ? 'surprised' : 'neutral';
  if (b.mood === 'hurt') return 'hurt';
  if (b.mood === 'surprised') return 'surprised';
  if (b.mood === 'angry' || b.heat >= 2) return b.heat >= 3 ? 'angry' : 'talk';
  return b.heat === 1 ? 'smug' : 'talk';
}

const STAND_IN_MOOD: Record<FieldFace, Emotion> = { neutral: 'neutral', talk: 'neutral', smug: 'neutral', surprised: 'surprised', angry: 'angry', frozen: 'neutral', hurt: 'hurt' };

/** One person on location (or an anchor in their box): their painted picture, or a career face on a jacket. */
function Figure({ p, face, painted, talking, frozen, mic }: { p: Person; face: Emotion; painted?: string; talking: boolean; frozen?: boolean; mic?: boolean }) {
  if (painted)
    return (
      <div class={`bn-figure bn-painted${talking ? ' bn-talking' : ''}${frozen ? ' bn-frozen' : ''}`}>
        <img src={painted} alt="" />
      </div>
    );
  return (
    <div class={`bn-figure${talking ? ' bn-talking' : ''}${frozen ? ' bn-frozen' : ''}`} style={{ '--c': p.color }}>
      <div class="bn-head">
        <Portrait c={{ appearance: { skin: '#e0b48a', hair: '#3b2416', hairStyle: 0 }, careers: [p.career], ...(p.persona ? { persona: p.persona } : {}) }} size={160} mood={face} />
      </div>
      <div class="bn-suit">{mic ? <i class="bn-mic" /> : <i class="bn-tie" />}</div>
    </div>
  );
}

/** The location: the arena painting, softened behind the reporter, with any weather and photobomb. */
function Location({ ep, reporter, beat, speaking, delaying, ms, progress, children }: { ep: Episode; reporter: Person; beat: Beat; speaking: Seat | null; delaying: boolean; ms: number; progress: number; children?: ComponentChildren }) {
  const f = ep.field!;
  // A location plate (art brief 07, `news:<name>`) or an arena's painting.
  const bg = f.location.startsWith('news:') ? LOCATION_ART[`./art/location-${f.location.slice(5)}.webp`] : arenaArt(f.location)?.url;
  const face = fieldFace(beat, delaying, speaking === 'field');
  // Lip flap while their line types out, when the mouth twin exists (brief 06 round 2).
  const flap = speaking === 'field' && !delaying && progress < 1 && Math.floor(ms / FLAP_MS) % 2 === 1;
  const painted = (flap && FIELD_ART[`./art/field-${reporter.art}-${face}-b.webp`]) || FIELD_ART[`./art/field-${reporter.art}-${face}.webp`];
  return (
    <div class={`bn-location${f.weather ? ` bn-weather-${f.weather}` : ''}`}>
      {bg && <img class="bn-location-bg" src={bg} alt="" />}
      {f.cameos?.map((c) => <CameoSprite key={c.art} ep={ep} c={c} ms={ms} />)}
      {beat.photobomb && (
        <div class="bn-photobomb" key={beat.text}>
          <Portrait c={{ appearance: { skin: '#e0b48a', hair: '#3b2416', hairStyle: 0 }, careers: [beat.photobomb.startsWith('career.') ? beat.photobomb : 'career.clown'], ...(beat.photobomb.startsWith('npc.') ? { persona: beat.photobomb } : {}) }} size={120} mood="surprised" />
        </div>
      )}
      <div class="bn-reporter" style={{ '--h': reporter.height ?? 1 }}>
        <Figure p={reporter} face={STAND_IN_MOOD[face]} painted={painted} talking={speaking === 'field' && !delaying} frozen={face === 'frozen'} mic />
      </div>
      {f.weather === 'wind' && <div class="bn-wind" />}
      {children}
    </div>
  );
}

/** Field report shots (10 §13.2): the double box (anchor | reporter) or the reporter full screen. */
function FieldShot(props: { shot: Shot; ep: Episode; reporter: Person; anchor: Person; beat: Beat; speaking: Seat | null; heat: number; text: string; delaying: boolean; glitching: boolean; ms: number; progress: number }) {
  const { shot, ep, reporter, anchor, beat, speaking, text, delaying, glitching } = props;
  const action = isAction(beat);
  const bubble = (side: string) => (
    <div class={`bn-bubble bn-bubble-${side}${action ? ' bn-action' : ''}`}>
      {side === 'jeff' && <b class="bn-off">JEFF (OFF)</b>}
      <Line text={text} />
    </div>
  );
  if (shot === 'field')
    return (
      <div class={`bn-field${glitching ? ' bn-glitch' : ''}`}>
        <Location ep={ep} reporter={reporter} beat={beat} speaking={speaking} delaying={delaying} ms={props.ms} progress={props.progress} />
        {speaking === 'field' && bubble('field')}
        {speaking === 'jeff' && bubble('jeff')}
      </div>
    );
  // The double box: the anchor in the studio on the left, the reporter on location on the right.
  const anchorFace = speaking === anchor.seat ? deskFace(beat, anchor.seat) : beat.heat >= 2 ? 'angry' : 'neutral';
  const anchorArt = deskArt(anchor.art, anchorFace);
  return (
    <div class="bn-split">
      <div class="bn-box bn-box-studio">
        <img class="bn-layer" src={backdropUrl} alt="" />
        <Figure p={anchor} face="neutral" painted={anchorArt} talking={speaking === anchor.seat} />
        <span class="bn-box-tag">BSN STUDIO</span>
      </div>
      <div class={`bn-box bn-box-field${glitching ? ' bn-glitch' : ''}`}>
        <Location ep={ep} reporter={reporter} beat={beat} speaking={speaking} delaying={delaying} ms={props.ms} progress={props.progress} />
        <span class="bn-box-tag">{ep.field!.dateline.split(',')[0]}</span>
        {delaying && <span class="bn-delay">SATELLITE DELAY</span>}
      </div>
      {speaking && speaking !== 'guest' && bubble(speaking === 'field' ? 'right' : speaking === 'jeff' ? 'jeff' : 'left')}
    </div>
  );
}
