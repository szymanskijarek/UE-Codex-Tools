import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LiveCommentator, type LiveLine } from '@cc/commentary';
import { bundle } from '@cc/content';
import { addInfluence, emptyInfluence, floorClock, sessionInput, tallySession, type FloorClock, type Influence, type ScoredCountry } from '@cc/game-rules';
import { TICKS_PER_SECOND, type BattleEvent } from '@cc/sim';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import { music } from '../replay/music';
import { keepAwake } from '../wake-lock';
import { countryName, DEF, flagUrl, guessHome, info, KEYS, search } from './countries';
import { frozenTally, like, myLikes, pendingLikes } from './likes';
import { tallyPastSessions } from './past';

const FEED_MAX = 30;
/** Behind the wall clock by more than this (ticks): play a little faster to catch up; far more, jump. */
const DRIFT_SOFT = 10;
const DRIFT_HARD = 120;
/** How long a SURGE placard stays up at the start of a session (ms). */
const SURGE_MS = 7000;

/** Viewer's clock; `?t=2026-10-06T14:37:00Z` pins the floor to another moment (screenshots, Rewind). */
const CLOCK_OFFSET = (() => {
  const t = new URLSearchParams(window.location.search).get('t');
  const at = t ? Date.parse(t) : NaN;
  return Number.isFinite(at) ? at - Date.now() : 0;
})();
const now = () => Date.now() + CLOCK_OFFSET;

/** `?c=pl` follows a country (09 §8.1); else the last one you followed, else a guess from your browser language. */
function firstFollow(): string {
  const q = new URLSearchParams(window.location.search).get('c')?.toUpperCase();
  if (q && DEF.cast[q]) return q;
  try {
    const saved = localStorage.getItem('incident:follow');
    if (saved && DEF.cast[saved]) return saved;
  } catch {
    // no storage
  }
  return guessHome() ?? 'ENG';
}

interface FeedLine {
  key: number;
  text: string;
  kind: string;
}

function fill(kind: string, vars: Record<string, string | number>): string {
  const list = bundle.live[kind] ?? [];
  const tpl = list[Math.floor(Math.random() * list.length)] ?? '';
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

function Flag({ k, size = 20 }: { k: string; size?: number }) {
  return <img class="di-flag" src={flagUrl(k)} alt="" width={Math.round((size * 4) / 3)} height={size} loading="lazy" />;
}

const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function Hall() {
  const host = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState<FloorClock>(() => floorClock(DEF, now()));
  const [lines, setLines] = useState<FeedLine[]>([]);
  const [past, setPast] = useState<Map<number, Influence[]>>(new Map());
  const [muted, setMuted] = useState(true);
  const [follow, setFollowState] = useState<string>(firstFollow);
  const [camera, setCamera] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [likesV, setLikesV] = useState(0);
  const [surges, setSurges] = useState<{ keys: string[]; until: number }>({ keys: [], until: 0 });
  const [, setFrame] = useState(0);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const keyRef = useRef(0);
  const cameraRef = useRef<string | null>(null);
  cameraRef.current = camera ? follow : null;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const closingRef = useRef<() => Influence[]>(() => []);

  const push = (text: string, kind: string) => {
    if (!text) return;
    setLines((l) => [{ key: keyRef.current++, text, kind }, ...l].slice(0, FEED_MAX));
  };
  const setFollow = (k: string) => {
    setFollowState(k);
    setQuery('');
    try {
      localStorage.setItem('incident:follow', k);
    } catch {
      // no storage
    }
  };

  // The wall clock, a few times a second (the floor itself runs per frame).
  useEffect(() => {
    const id = setInterval(() => {
      setClock((c) => {
        const n = floorClock(DEF, now());
        return n.candle !== c.candle || n.hour !== c.hour || n.breaker !== c.breaker || n.opening !== c.opening || n.closing !== c.closing || Math.floor(n.tick / 20) !== Math.floor(c.tick / 20) ? n : c;
      });
    }, 250);
    keepAwake(true);
    return () => {
      clearInterval(id);
      keepAwake(false);
    };
  }, []);

  // The session's input: likes frozen at its start (09 §5.3).
  const session = useMemo(() => {
    const tally = frozenTally(clock.hour, clock.candle);
    const prevTally = clock.candle > 0 ? frozenTally(clock.hour, clock.candle - 1) : undefined;
    const { input, lineup, scored, surges } = sessionInput(bundle, DEF, clock.hour, clock.candle, tally, prevTally);
    return { input, lineup, scored, tally, surges };
  }, [clock.hour, clock.candle]);

  // Earlier sessions of this hour, worked out in the background.
  useEffect(() => {
    setPast(new Map());
    if (clock.candle === 0) return;
    return tallyPastSessions(clock.hour, clock.candle, (s, rows) => setPast((m) => new Map(m).set(s, rows)));
  }, [clock.hour, clock.candle]);

  // The current session: catch up to the wall clock, then play along with it.
  useEffect(() => {
    if (!host.current) return;
    const { input, lineup, surges: jumped } = session;
    const t0 = performance.now();
    const player = new ReplayPlayer(input, { probe: false });
    const startAt = Math.min(floorClock(DEF, now()).tick, input.endless!.ticks);
    player.seek(startAt);
    player.drainEvents();
    console.info(`[incident] session ${clock.candle + 1}: caught up ${startAt} ticks in ${(performance.now() - t0).toFixed(0)} ms`);
    playerRef.current = player;
    const commentator = new LiveCommentator(bundle, input);
    commentator.consume(player.world.events, player.world.events, true);
    const renderer = new BattleRenderer(input);
    rendererRef.current = renderer;
    renderer.sfx.setMuted(mutedRef.current);
    const keyOf = (entityId: number) => input.teams[player.world.byId.get(entityId)?.team ?? -1]?.playerId ?? '';
    const vars = (k: string) => ({ country: countryName(k), name: info(k).name, flag: '' });
    // Surges at the seam (09 §5.4): scores that jumped since the last session.
    if (jumped.length && startAt < 140) {
      setSurges({ keys: jumped, until: Date.now() + SURGE_MS });
      for (const k of jumped.slice(0, 2)) push(fill('incident_surge', vars(k)), 'surge');
    }
    if (startAt < 40) {
      const first = lineup.order[0]!;
      push(clock.candle === 0 ? fill('incident_opening', { first: countryName(first), hour: `${clock.hour.slice(11, 13)}:00` }) : fill('incident_open', { v: clock.candle + 1, first: countryName(first) }), 'open');
      if (lineup.derby) push(fill('incident_derby', { a: countryName(lineup.derby.a), b: countryName(lineup.derby.b) }), 'derby');
      if (clock.candle === 0) music.sting('start');
    }
    let raf = 0;
    let last = performance.now();
    let alive = true;
    let recessSaid = player.done;
    let lastUi = 0;
    let followed: string | null = null;
    const badges = new Map(input.teams.map((t) => [t.playerId, flagUrl(t.playerId)]));
    void renderer
      .setBadges(badges)
      .then(() => renderer.mount(host.current!))
      .then(() => {
        if (!alive) return;
        const loop = (t: number) => {
          if (!alive) return;
          const dt = Math.min(100, t - last);
          last = t;
          const c = floorClock(DEF, now());
          const target = Math.min(c.tick, input.endless!.ticks);
          const behind = target - player.tick;
          if (behind > DRIFT_HARD) player.seek(target - 4);
          player.speed = behind > DRIFT_SOFT ? 1.2 : behind < -DRIFT_SOFT ? 0.85 : 1;
          const flow = renderer.timeScale();
          player.advance(dt * flow);
          const events: BattleEvent[] = player.drainEvents();
          renderer.render(player, flow ? dt : dt * 0.1, events);
          if (events.length) {
            for (const l of commentator.consume(events, player.world.events, false) as LiveLine[]) if (l.importance >= 2 && !l.kind.startsWith('end_')) push(l.text, l.kind);
            for (const e of events) {
              // An institution bursts in (09 §7.2).
              if (e.type === 'crash' && !mutedRef.current) music.sting('crash');
              if (e.type !== 'walkon') continue;
              const inK = input.teams[e.v]?.playerId ?? '';
              const outK = keyOf(e.b);
              if (outK) push(fill('incident_out', vars(outK)), 'out');
              push(fill('incident_walkon', vars(inK)), 'walkon');
            }
          }
          if (player.done && !recessSaid) {
            recessSaid = true;
            const rows = tallySession(DEF, input.teams.map((x) => x.playerId), player.world.events, player.tick).sort((a, b) => b.points - a.points);
            if (clock.candle === clock.candles - 1) {
              const hourRows = closingRef.current();
              push(fill('incident_closing', { country: countryName(hourRows[0]?.key ?? ''), last: countryName(hourRows[hourRows.length - 1]?.key ?? '') }), 'recess');
              music.sting('win');
            } else {
              push(fill('incident_recess', { country: countryName(rows[0]?.key ?? '') }), 'recess');
              music.sting('crash');
            }
          }
          // Follow your country with the camera.
          const f = cameraRef.current;
          const ent = f ? player.world.entities.find((x) => !x.removed && x.kind === 'char' && x.summonOf < 0 && input.teams[x.team]?.playerId === f) : undefined;
          const want = ent ? `${f}:${ent.id}` : null;
          if (want !== followed) {
            followed = want;
            renderer.setReplay(ent ? [ent.id] : null, ent ? `👀 ${countryName(f!)}` : '', ent?.name ?? '', 1);
          }
          if (!mutedRef.current && !player.done) music.play('office');
          if (t - lastUi > 250) {
            lastUi = t;
            setFrame((n) => n + 1);
          }
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
  }, [session]);

  const { input, lineup, scored } = session;
  const player = playerRef.current;
  const teamKeys = input.teams.map((t) => t.playerId);
  const live = player ? tallySession(DEF, teamKeys, player.world.events, player.tick) : emptyInfluence(teamKeys);
  let hour = emptyInfluence(KEYS);
  for (let c = 0; c < clock.candle; c++) {
    const rows = past.get(c);
    if (rows) hour = addInfluence(DEF, hour, rows);
  }
  const counting = clock.candle > 0 && past.size < clock.candle;
  const table = hour.map((h) => {
    const l = live.find((r) => r.key === h.key);
    return l ? { ...h, points: h.points + l.points, kos: h.kos + l.kos, floorS: h.floorS + l.floorS } : h;
  });
  table.sort((a, b) => b.points - a.points || (a.key < b.key ? -1 : 1));
  closingRef.current = () => table;
  const scoreOf = new Map<string, ScoredCountry>(scored.map((c) => [c.key, c]));

  // Who's on the floor and who's waiting (09 §4).
  const onFloor = player
    ? player.world.entities.filter((e) => !e.removed && e.kind === 'char' && e.summonOf < 0 && e.team >= 0 && e.team < teamKeys.length).map((e) => ({ key: teamKeys[e.team]!, hpBp: e.maxHp ? Math.round((e.hp * 100) / e.maxHp) : 100, out: e.state === 'ko' }))
    : lineup.order.slice(0, DEF.candle.seats ?? 10).map((key) => ({ key, hpBp: 100, out: false }));
  const lobby = player ? player.world.lobby.map((t) => teamKeys[t]!) : lineup.order.slice(DEF.candle.seats ?? 10);
  const elapsedS = (player?.tick ?? 0) / TICKS_PER_SECOND;
  const walkOns = player ? player.world.events.filter((e) => e.type === 'walkon').length : 0;
  const perWalkOn = walkOns >= 3 ? elapsedS / walkOns : 11.5;
  const eta = (i: number) => Math.max(1, Math.round((i + 1) * perWalkOn));

  const followOnFloor = onFloor.find((f) => f.key === follow);
  const followLobby = lobby.indexOf(follow);
  const liked = myLikes(clock.hour).some((l) => l.key === follow);
  void likesV;
  const tallyNow = session.tally[follow] ?? 0;
  const pending = pendingLikes(clock.hour, clock.candle, follow);
  const seamAt = `${clock.hour.slice(11, 13)}:${String(((clock.candle + 1) * 5) % 60).padStart(2, '0')}`;
  const secsLeft = clock.breaker || clock.closing ? 0 : Math.max(0, Math.ceil((clock.fightTicks - clock.tick) / TICKS_PER_SECOND));
  const rewinding = CLOCK_OFFSET !== 0;
  const hourLabel = `${clock.hour.slice(11, 13)}:00–${String((Number(clock.hour.slice(11, 13)) + 1) % 24).padStart(2, '0')}:00\u00a0UTC`;
  const winnerOf = (c: number) => {
    const rows = past.get(c);
    return rows ? ([...rows].sort((a, b) => b.points - a.points)[0]?.key ?? null) : null;
  };
  const myRank = table.findIndex((r) => r.key === follow) + 1;
  const found = search(query);

  const doLike = () => {
    if (like(clock.hour, follow, clock.candle)) {
      setLikesV((v) => v + 1);
      push(fill('incident_liked', { country: countryName(follow) }), 'liked');
      setToast(`👍 +1 for ${countryName(follow)} · counts from ${seamAt}`);
      setTimeout(() => setToast(''), 2600);
    }
  };
  const share = async () => {
    const name = countryName(follow);
    const url = `${window.location.origin}/incident/?c=${follow.toLowerCase()}`;
    const kos = live.find((r) => r.key === follow)?.kos ?? 0;
    const text = followOnFloor
      ? `${name} is on the floor RIGHT NOW${kos ? ` with ${kos} KO${kos > 1 ? 's' : ''}` : ''}. Like to keep them standing 👉`
      : followLobby >= 0
        ? `${name} is on in ~${eta(followLobby) < 60 ? `${eta(followLobby)} seconds` : `${Math.round(eta(followLobby) / 60)} minutes`} and needs backup 👉`
        : `${name} needs you at the Diplomatic Incident 👉`;
    try {
      if (navigator.share) await navigator.share({ title: 'Diplomatic Incident', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setToast('📋 Link copied');
        setTimeout(() => setToast(''), 2000);
      }
    } catch {
      // cancelled
    }
  };
  const toggleSound = () => {
    const m = !muted;
    setMuted(m);
    rendererRef.current?.sfx.setMuted(m);
    music.unlock();
    if (m) music.finish(400);
  };

  return (
    <main class="cb-page di-page">
      <header class="cb-head">
        <a class="cb-brand" href="/" title="Career Crash">
          <span class="di-logo" aria-hidden="true">
            🔨
          </span>
          <span>
            <b>Diplomatic Incident</b>
            <small>by Career Crash</small>
          </span>
        </a>
        <div class="cb-clock">
          <b>{hourLabel}</b>
          <small>
            {rewinding && <span class="cb-rewind-tag">⏪ Rewind · </span>}
            Session {clock.candle + 1}/{clock.candles} · {clock.closing ? 'closing ceremony' : clock.breaker ? 'recess' : `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')} left`}
            {lineup.derby && <span class="di-derby-tag"> · ⚔️ derby hour</span>}
          </small>
        </div>
        <button class="ghost small" onClick={toggleSound} aria-label={muted ? 'Sound on' : 'Sound off'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <section class="di-likebar" style={{ '--c': info(follow).color }}>
        <div class="di-you">
          <Flag k={follow} size={36} />
          <div>
            <b>{countryName(follow)}</b>
            <small>
              {info(follow).name} ·{' '}
              {followOnFloor ? (followOnFloor.out ? 'down! being escorted out' : 'on the floor now') : followLobby >= 0 ? `in the lobby, #${followLobby + 1} · on in ~${eta(followLobby)}s` : 'waiting'}
              {myRank > 0 && ` · #${myRank} this hour`}
            </small>
          </div>
        </div>
        <div class="di-count">
          <b>{fmt(tallyNow)}</b>
          <small>likes this hour</small>
          {pending > 0 && <small class="di-pending">+{fmt(pending)} arriving at {seamAt}</small>}
        </div>
        <div class="di-actions">
          <button class={`di-like${liked ? ' done' : ''}`} onClick={doLike} disabled={liked} aria-label={liked ? 'Liked this hour' : `Like ${countryName(follow)}`}>
            {liked ? '✅ Liked' : '👍 Like'}
          </button>
          <button class="ghost small" onClick={() => void share()} aria-label="Share">
            📣 Send help
          </button>
          <button class={`ghost small${camera ? ' on' : ''}`} onClick={() => setCamera(!camera)} aria-label="Follow with the camera">
            🎥
          </button>
        </div>
        <div class="di-search">
          <input type="search" placeholder="Find a country…" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} aria-label="Find a country" />
          {found.length > 0 && (
            <ul class="di-found">
              {found.map((k) => (
                <li>
                  <button onClick={() => setFollow(k)}>
                    <Flag k={k} size={16} /> {countryName(k)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div class="cb-ticker di-chamber" role="list" aria-label="On the floor">
        {onFloor.map((f) => {
          const s = scoreOf.get(f.key);
          return (
            <button role="listitem" class={`cb-coin di-seat${follow === f.key ? ' on' : ''}${f.out ? ' out' : ''}`} style={{ '--c': info(f.key).color }} onClick={() => setFollow(f.key)} title={`${countryName(f.key)} · ${info(f.key).name}`}>
              <span class="cb-coin-top">
                <Flag k={f.key} size={18} />
                <b>{f.key}</b>
                {s?.mandate && <span class="cb-badge">📜</span>}
                {lineup.derby && (lineup.derby.a === f.key || lineup.derby.b === f.key) && <span class="cb-badge">⚔️</span>}
                {surges.until > Date.now() && surges.keys.includes(f.key) && <span class="cb-badge">📈</span>}
              </span>
              <span class="cb-hp">
                <i style={{ width: `${f.out ? 0 : f.hpBp}%` }} />
              </span>
              <small class="cb-name">{f.out ? 'escorted out' : countryName(f.key)}</small>
            </button>
          );
        })}
      </div>

      <div class="cb-body">
        <div class="cb-stage-wrap">
          <div class="stage cb-stage" ref={host} />
          {clock.opening && (
            <div class="cb-overlay opening di-ceremony">
              <b>🔨 OPENING CEREMONY</b>
              <div class="cb-placards">
                {lineup.order.slice(0, DEF.candle.seats ?? 10).map((k) => (
                  <span class="cb-placard up" style={{ '--c': info(k).color }}>
                    <Flag k={k} size={14} /> <b>{countryName(k)}</b>
                    {k === lineup.host ? ' 🏠' : ''}
                  </span>
                ))}
              </div>
              <small>
                Host this hour: {countryName(lineup.host)} (it's 8 in the evening there) · likes reset · one like per country per hour
              </small>
            </div>
          )}
          {surges.until > Date.now() && !clock.opening && (
            <div class="di-surge" role="status">
              📈 SURGE: {surges.keys.slice(0, 3).map((k) => countryName(k)).join(', ')}
            </div>
          )}
          {lineup.derby && player && player.tick < 200 && !clock.opening && (
            <div class="di-surge di-derby" role="status">
              ⚔️ DERBY: <Flag k={lineup.derby.a} size={14} /> {countryName(lineup.derby.a)} vs <Flag k={lineup.derby.b} size={14} /> {countryName(lineup.derby.b)}
            </div>
          )}
          {clock.breaker && (
            <div class="cb-overlay breaker di-recess">
              <b>🔨 RECESS</b>
              <small>
                Likes counted · next session in {Math.ceil(clock.msToNext / 1000)}s
              </small>
            </div>
          )}
          {clock.closing && (
            <div class="cb-overlay closing di-ceremony">
              <b>🏛️ CLOSING CEREMONY</b>
              <ol class="cb-podium">
                {table.slice(0, 3).map((r, i) => (
                  <li style={{ '--c': info(r.key).color }}>
                    <span>{['🥇', '🥈', '🥉'][i]}</span> <Flag k={r.key} size={16} /> <b>{countryName(r.key)}</b> · {r.points} influence
                  </li>
                ))}
              </ol>
              {table.length > 0 && (
                <small>
                  📜 {countryName(table[0]!.key)} passes the hour's resolution · 📝 {countryName(table[table.length - 1]!.key)} carries the minutes
                </small>
              )}
              <small>Next session in {Math.ceil(clock.msToNext / 1000)}s</small>
            </div>
          )}
        </div>

        <aside class="cb-side">
          <section class="cb-card di-lobby">
            <h2>
              Lobby <small class="muted">next to walk on</small>
            </h2>
            <ol class="di-queue">
              {lobby.slice(0, 12).map((k, i) => (
                <li class={`${k === follow ? 'on' : ''}${lineup.wildcards.includes(k) ? ' wild' : ''}`} style={{ '--c': info(k).color }}>
                  <button onClick={() => setFollow(k)} title={info(k).name}>
                    <Flag k={k} size={16} />
                    <span>{countryName(k)}</span>
                    {lineup.wildcards.includes(k) && <small class="di-wild">🃏</small>}
                    <small class="muted">~{eta(i)}s</small>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <section class="cb-card">
            <h2>
              This hour <small class="muted">{counting ? 'counting earlier sessions…' : 'influence'}</small>
            </h2>
            <ol class="cb-table di-table">
              {table.slice(0, 15).map((r, i) => (
                <li style={{ '--c': info(r.key).color }} class={r.key === follow ? 'on' : ''}>
                  <span class="cb-rank">{i + 1}</span>
                  <b>
                    <Flag k={r.key} size={13} /> {countryName(r.key)}
                  </b>
                  <span class="cb-pts">{r.points}</span>
                  <small class="muted">
                    {r.kos} KO · 👍 {fmt(session.tally[r.key] ?? 0)}
                  </small>
                </li>
              ))}
            </ol>
            <div class="cb-candles" aria-label="Sessions this hour">
              {Array.from({ length: clock.candles }, (_, c) => {
                const w = winnerOf(c);
                return <span class={`cb-candle${c === clock.candle ? ' now' : ''}${c < clock.candle ? ' done' : ''}`} style={w ? { background: info(w).color } : undefined} title={w ? `Session ${c + 1}: ${countryName(w)}` : `Session ${c + 1}`} />;
              })}
            </div>
          </section>
          <section class="cb-card cb-feed">
            <h2>Communiqués</h2>
            <ul>
              {lines.map((l) => (
                <li key={l.key} class={`k-${l.kind}`}>
                  {l.text}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {toast && <div class="di-toast">{toast}</div>}

      <footer class="cb-foot">
        <b>Not diplomacy. Not advice of any kind.</b> Fictional delegates; no real people, and no politics. Prototype: other viewers' likes are a sample; yours stay in this
        browser. No cookies, no tracking. Flags: flag-icons (MIT). <a href="/">Play Career Crash →</a>
      </footer>
    </main>
  );
}

