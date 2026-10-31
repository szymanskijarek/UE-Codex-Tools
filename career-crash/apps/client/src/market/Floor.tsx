import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LiveCommentator, type LiveLine } from '@cc/commentary';
import { bundle } from '@cc/content';
import {
  addStandings,
  candleInput,
  castMember,
  emptyStandings,
  floorClock,
  marketMood,
  scoreField,
  tallyCandle,
  type FloorClock,
  type ScoredCoin,
  type Standing,
} from '@cc/game-rules';
import type { MarketDef } from '@cc/content-schema';
import { TICKS_PER_SECOND, type BattleEvent } from '@cc/sim';
import { ReplayPlayer } from '../replay/player';
import { BattleRenderer } from '../replay/renderer';
import { music } from '../replay/music';
import { keepAwake } from '../wake-lock';
import { Portrait } from '../ui/components';
import type { LoadedFeed, MarketFeed } from './feed';
import { fightersOf, tallyPastCandles } from './past';

/** What the session says right now (13 §3): which moment the floor shows, and what to tell the viewer. */
export interface SessionView {
  floorMs: number;
  /** The market is trading: false replays the last period with the lights down. */
  live: boolean;
  banner?: string;
  closingBell?: boolean;
  /** The day's first period: its start is the Opening Bell, later ones only bring new prices. */
  firstPeriod?: boolean;
}

/** One market floor page: Crypto Bros (08) or Regards, Wall Street (13). */
export interface FloorConfig {
  def: MarketDef;
  /** Console tag. */
  tag: string;
  /** Prefix of the floor's lines in live.json (`market_opening`, `stocks_opening`…). */
  texts: string;
  title: string;
  logo: string;
  /** The ticker portraits' frame. */
  frame: string;
  feed: MarketFeed;
  /** Heading of the standings: "This hour". */
  periodName: string;
  /** Before the mood figure in the header: "market", "S&P 500". */
  moodLabel: string;
  /** Data credit in the footer. */
  credit: string;
  /** Exchange hours (13): wall time → what the floor shows. Without it the floor runs on the wall clock. */
  session?: (nowMs: number) => SessionView;
  /** A period's label ("09:30–10:00 ET"); the default is the UTC hour. */
  periodLabel?: (hour: string) => string;
}

const FEED_MAX = 30;
/** How long the LIQUIDATED moment holds the screen. */
const LIQUIDATION_MS = 2600;
/** Behind the wall clock by more than this (ticks): play a little faster to catch up; far more, jump. */
const DRIFT_SOFT = 10;
const DRIFT_HARD = 120;

/**
 * Viewer's clock. `?t=2026-10-05T14:37:00Z` pins the floor to another moment
 * (screenshots, checking a past hour); the clock then runs on from there.
 */
const CLOCK_OFFSET = (() => {
  const t = new URLSearchParams(window.location.search).get('t');
  const at = t ? Date.parse(t) : NaN;
  return Number.isFinite(at) ? at - Date.now() : 0;
})();
const now = () => Date.now() + CLOCK_OFFSET;

interface FeedLine {
  key: number;
  text: string;
  kind: string;
}

interface Liquidation {
  sym: string;
  name: string;
  by: string;
  until: number;
}

function fill(kind: string, vars: Record<string, string | number>): string {
  const list = bundle.live[kind] ?? [];
  const tpl = list[Math.floor(Math.random() * list.length)] ?? '';
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

const pct = (bp: number) => `${bp > 0 ? '+' : ''}${(bp / 100).toFixed(2)}%`;

function Spark({ points, up }: { points?: number[]; up: boolean }) {
  if (!points || points.length < 2) return null;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const d = points.map((p, i) => `${((i / (points.length - 1)) * 60).toFixed(1)},${(18 - ((p - lo) / span) * 16).toFixed(1)}`).join(' ');
  return (
    <svg class="cb-spark" viewBox="0 0 60 20" aria-hidden="true">
      <polyline points={d} fill="none" stroke={up ? 'var(--cb-up)' : 'var(--cb-down)'} stroke-width="1.6" stroke-linejoin="round" />
    </svg>
  );
}

export function Floor({ cfg }: { cfg: FloorConfig }) {
  const DEF = cfg.def;
  /** The moment on the floor: the wall clock, or a replay outside exchange hours. */
  const floorNow = () => (cfg.session ? cfg.session(now()).floorMs : now());
  const host = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState<FloorClock>(() => floorClock(DEF, floorNow()));
  const [feed, setFeed] = useState<LoadedFeed | null>(null);
  const [lines, setLines] = useState<FeedLine[]>([]);
  const [past, setPast] = useState<Map<number, Standing[]>>(new Map());
  const [liq, setLiq] = useState<Liquidation | null>(null);
  const [muted, setMuted] = useState(true);
  const [follow, setFollow] = useState<string | null>(null);
  const [, setFrame] = useState(0);
  const playerRef = useRef<ReplayPlayer | null>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const keyRef = useRef(0);
  const followRef = useRef<string | null>(null);
  followRef.current = follow;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  /** The hour's standings right now (read by the render loop at the Closing Bell). */
  const closingRef = useRef<() => Standing[]>(() => []);

  const push = (text: string, kind: string) => {
    if (!text) return;
    setLines((l) => [{ key: keyRef.current++, text, kind }, ...l].slice(0, FEED_MAX));
  };

  // The hour's snapshot; fetched again when the hour turns.
  useEffect(() => {
    let alive = true;
    void cfg.feed.load(clock.hour).then((f) => alive && setFeed(f));
    return () => {
      alive = false;
    };
  }, [clock.hour]);

  // Hours on file for Rewind.
  const [hours, setHours] = useState<string[]>([]);
  useEffect(() => {
    void cfg.feed.hours().then(setHours);
  }, [clock.hour]);

  // The wall clock, a few times a second (the floor itself runs per frame).
  useEffect(() => {
    const id = setInterval(() => {
      setClock((c) => {
        const n = floorClock(DEF, floorNow());
        return n.candle !== c.candle || n.hour !== c.hour || n.breaker !== c.breaker || n.opening !== c.opening || n.closing !== c.closing || Math.floor(n.tick / 20) !== Math.floor(c.tick / 20) ? n : c;
      });
    }, 250);
    keepAwake(true);
    return () => {
      clearInterval(id);
      keepAwake(false);
    };
  }, []);

  const snapshot = feed && feed.snapshot.hour === clock.hour ? feed.snapshot : null;
  const scored: ScoredCoin[] = useMemo(() => (snapshot ? scoreField(DEF, snapshot.coins, snapshot.benchmarkBp) : []), [snapshot]);
  const symbols = useMemo(() => scored.map((c) => c.symbol.toUpperCase()), [scored]);
  const mood = snapshot ? marketMood(DEF, snapshot.coins, snapshot.benchmarkBp) : 0;
  const sess = cfg.session?.(now());
  const live = sess?.live ?? true;
  // Exchange floors (13) have no hourly Closing Bell: their last candle ends in an ordinary halt.
  const breaker = clock.breaker || (!!cfg.session && clock.closing);
  const closing = cfg.session ? !!sess?.closingBell : clock.closing;

  // Earlier candles of this hour, worked out in the background.
  useEffect(() => {
    setPast(new Map());
    if (!snapshot || clock.candle === 0) return;
    return tallyPastCandles(DEF, snapshot, clock.candle, (c, rows) => setPast((m) => new Map(m).set(c, rows)));
  }, [snapshot, clock.candle]);

  // The current candle: catch up to the wall clock, then play along with it.
  useEffect(() => {
    if (!snapshot || !host.current) return;
    const input = candleInput(bundle, DEF, snapshot, clock.candle);
    const t0 = performance.now();
    const player = new ReplayPlayer(input, { probe: false });
    // The floor's song follows the hour: a green market parties, a red one sulks.
    const song = marketMood(DEF, snapshot.coins, snapshot.benchmarkBp) < 0 ? 'trading-floor-bear' : 'trading-floor';
    const startAt = Math.min(floorClock(DEF, floorNow()).tick, input.endless!.ticks);
    player.seek(startAt);
    player.drainEvents();
    const catchUpMs = performance.now() - t0;
    console.info(`[${cfg.tag}] candle ${clock.candle + 1}: caught up ${startAt} ticks in ${catchUpMs.toFixed(0)} ms`);
    playerRef.current = player;
    const commentator = new LiveCommentator(bundle, input);
    commentator.consume(player.world.events, player.world.events, true);
    const renderer = new BattleRenderer(input);
    rendererRef.current = renderer;
    renderer.sfx.setMuted(mutedRef.current);
    const symOf = (entityId: number) => input.teams[player.world.byId.get(entityId)?.team ?? -1]?.playerId ?? '';
    const nameOf = (entityId: number) => player.world.byId.get(entityId)?.name ?? 'someone';
    const s0 = cfg.session?.(now());
    if (startAt < 40 && (s0?.live ?? true)) {
      if (clock.candle === 0) {
        const byChange = [...scored].sort((a, b) => b.changeBp - a.changeBp);
        const kind = s0 && !s0.firstPeriod ? 'prices' : 'opening';
        push(fill(`${cfg.texts}_${kind}`, { up: byChange[0]?.symbol.toUpperCase() ?? '', down: byChange[byChange.length - 1]?.symbol.toUpperCase() ?? '' }), 'open');
        music.sting('start');
      } else push(fill(`${cfg.texts}_open`, { v: clock.candle + 1, sym: symbols[0] ?? '' }), 'open');
    }
    let raf = 0;
    let last = performance.now();
    let alive = true;
    let liqUntil = 0;
    let breakerSaid = player.done;
    let lastUi = 0;
    let followed: string | null = null;
    void renderer.mount(host.current).then(() => {
      if (!alive) return;
      const loop = (t: number) => {
        if (!alive) return;
        const dt = Math.min(100, t - last);
        last = t;
        const c = floorClock(DEF, floorNow());
        const target = Math.min(c.tick, input.endless!.ticks);
        const behind = target - player.tick;
        if (behind > DRIFT_HARD) player.seek(target - 4);
        player.speed = behind > DRIFT_SOFT ? 1.2 : behind < -DRIFT_SOFT ? 0.85 : 1;
        const hold = t < liqUntil;
        const flow = hold ? 0.12 : renderer.timeScale();
        player.advance(dt * flow);
        const events: BattleEvent[] = player.drainEvents();
        renderer.render(player, flow ? dt : dt * 0.1, events);
        if (events.length) {
          for (const l of commentator.consume(events, player.world.events, false) as LiveLine[]) if (l.importance >= 2 && !l.kind.startsWith('end_')) push(l.text, l.kind);
          for (const e of events) {
            if (e.type === 'relist') push(fill(`${cfg.texts}_relist`, { sym: symOf(e.a), name: nameOf(e.a), v: e.v + 1 }), 'relist');
            else if (e.type === 'liquidated') {
              const sym = symOf(e.b);
              const by = e.a >= 0 && player.world.byId.get(e.a)?.kind === 'char' ? `${nameOf(e.a)} (${symOf(e.a)})` : 'the market';
              push(fill(`${cfg.texts}_liquidated`, { sym, name: nameOf(e.b), by }), 'liquidated');
              liqUntil = t + LIQUIDATION_MS;
              setLiq({ sym, name: nameOf(e.b), by, until: Date.now() + LIQUIDATION_MS });
              renderer.hitStop(450, 0.9);
              renderer.setReplay([e.b, ...(e.a >= 0 ? [e.a] : [])], '💥 LIQUIDATED', `${sym} · MARGIN CALL`, 0.6);
              music.sting('ko');
            }
          }
        }
        if (liqUntil && t >= liqUntil) {
          liqUntil = 0;
          followed = null;
          renderer.setReplay(null);
          setLiq(null);
        }
        if (player.done && !breakerSaid) {
          breakerSaid = true;
          const rows = tallyCandle(DEF, symbols, player.world.events, fightersOf(player.world, symbols.length)).sort((a, b) => b.points - a.points);
          if (clock.candle === clock.candles - 1 && !cfg.session) {
            // The Closing Bell: the hour's table is the earlier candles plus this one.
            const hourRows = closingRef.current();
            push(fill(`${cfg.texts}_closing`, { sym: hourRows[0]?.symbol ?? '', loser: hourRows[hourRows.length - 1]?.symbol ?? '' }), 'breaker');
            music.sting('win');
          } else {
            push(fill(`${cfg.texts}_breaker`, { sym: rows[0]?.symbol ?? '' }), 'breaker');
            music.sting('crash');
          }
        }
        // Follow one contender with the camera (tap in the ticker).
        const f = followRef.current;
        if (!hold && f !== followed) {
          followed = f;
          const ent = f ? player.world.entities.find((e) => e.kind === 'char' && e.summonOf < 0 && input.teams[e.team]?.playerId === f) : undefined;
          renderer.setReplay(ent ? [ent.id] : null, `👀 ${f}`, ent?.name ?? '', 1);
        }
        if (!mutedRef.current && !player.done) music.play(song);
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
  }, [snapshot, clock.candle]);

  // The exchange's Closing Bell (13 §3): one line in the feed as it rings.
  const bellRef = useRef(false);
  useEffect(() => {
    const ringing = !!sess?.closingBell && scored.length > 0;
    if (ringing && !bellRef.current) {
      const byChange = [...scored].sort((a, b) => b.changeBp - a.changeBp);
      push(fill(`${cfg.texts}_closing`, { spx: pct(snapshot?.benchmarkBp ?? 0), up: byChange[0]?.symbol ?? '', down: byChange[byChange.length - 1]?.symbol ?? '' }), 'breaker');
      music.sting('win');
    }
    bellRef.current = ringing;
  });

  const player = playerRef.current;
  const liveRows = player ? tallyCandle(DEF, symbols, player.world.events, fightersOf(player.world, symbols.length)) : emptyStandings(symbols);
  let hour = emptyStandings(symbols);
  for (let c = 0; c < clock.candle; c++) {
    const rows = past.get(c);
    if (rows) hour = addStandings(DEF, hour, rows);
  }
  const counting = clock.candle > 0 && past.size < clock.candle;
  const table = hour.map((h) => {
    const l = liveRows.find((r) => r.symbol === h.symbol)!;
    return { ...h, points: h.points + l.points, kos: h.kos + l.kos, liquidations: h.liquidations + l.liquidations };
  });
  table.sort((a, b) => b.points - a.points || a.symbol.localeCompare(b.symbol));
  closingRef.current = () => table;
  const mktRank = new Map([...scored].sort((a, b) => b.score - a.score).map((c, i) => [c.symbol.toUpperCase(), i + 1]));
  const winnerOf = (c: number) => {
    const rows = past.get(c);
    if (!rows) return null;
    return [...rows].sort((a, b) => b.points - a.points)[0]?.symbol ?? null;
  };
  const colorOf = (sym: string) => castMember(DEF, sym).art.color;
  const secsLeft = breaker || closing ? 0 : Math.max(0, Math.ceil((clock.fightTicks - clock.tick) / TICKS_PER_SECOND));
  const rewinding = CLOCK_OFFSET !== 0;
  const pickHour = (h: string) => {
    const u = new URL(window.location.href);
    if (h) u.searchParams.set('t', h.length === 13 ? `${h}:00:01Z` : `${h}:01Z`);
    else u.searchParams.delete('t');
    window.location.href = u.toString();
  };
  const hourLabel = cfg.periodLabel?.(clock.hour) ?? `${clock.hour.slice(11, 13)}:00–${String((Number(clock.hour.slice(11, 13)) + 1) % 24).padStart(2, '0')}:00\u00a0UTC`;

  const toggleSound = () => {
    const m = !muted;
    setMuted(m);
    rendererRef.current?.sfx.setMuted(m);
    music.unlock();
    if (m) music.finish(400);
  };

  return (
    <main class="cb-page">
      <header class="cb-head">
        <a class="cb-brand" href="/" title="Career Crash">
          <img class="cb-logo" src={cfg.logo} alt="" width={40} height={40} />
          <span>
            <b>{cfg.title}</b>
            <small>by Career Crash</small>
          </span>
        </a>
        <div class="cb-clock">
          <b>{hourLabel}</b>
          <small>
            {rewinding && <span class="cb-rewind-tag">⏪ Rewind · </span>}
            Candle {clock.candle + 1}/{clock.candles} · {closing ? 'closing bell' : !live ? 'replay' : breaker ? 'trading halted' : `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')} left`}
            <span class="cb-mood">
              {' '}
              · {cfg.moodLabel} {pct(mood)}
            </span>
          </small>
        </div>
        {(hours.length > 1 || rewinding) && (
          <select class="cb-rewind" aria-label="Rewind to an earlier hour" value={rewinding ? clock.hour : ''} onChange={(e) => pickHour((e.target as HTMLSelectElement).value)}>
            <option value="">● Live</option>
            {[...new Set([...hours, ...(rewinding ? [clock.hour] : [])])]
              .sort()
              .reverse()
              .map((h) => (
                <option value={h}>
                  ⏪ {h.slice(5, 10)} {cfg.periodLabel?.(h) ?? `${h.slice(11, 13)}:00 UTC`}
                </option>
              ))}
          </select>
        )}
        <button class="ghost small" onClick={toggleSound} aria-label={muted ? 'Sound on' : 'Sound off'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <div class="cb-ticker" role="list">
        {scored.map((c) => {
          const sym = c.symbol.toUpperCase();
          const m = castMember(DEF, sym);
          const ent = player?.world.entities.find((e) => e.kind === 'char' && e.summonOf < 0 && player.input.teams[e.team]?.playerId === sym);
          const hpBp = ent && ent.maxHp ? Math.round((ent.hp * 100) / ent.maxHp) : 100;
          const out = ent?.state === 'ko';
          return (
            <button role="listitem" class={`cb-coin${follow === sym ? ' on' : ''}${out ? ' out' : ''}`} style={{ '--c': m.art.color }} onClick={() => setFollow(follow === sym ? null : sym)} title={`${m.name} · ${bundle.locale[`${m.persona}.name`] ?? ''}`}>
              <span class="cb-coin-top">
                <span class="cb-face" style={{ backgroundImage: `url(${cfg.frame})` }}>
                  {/* Their face reacts to the market: shouting when pumping, shocked when leveraged, hurt when delisted. */}
                  <Portrait c={{ careers: [m.career], appearance: ent?.snap?.appearance ?? { skin: '#e0ac69', hair: '#3b2a1a', hairStyle: 0 }, persona: m.persona, art: m.sector ? DEF.sectors?.[m.sector]?.persona : undefined }} size={30} mood={out ? 'hurt' : c.leveraged ? 'surprised' : c.pumping ? 'angry' : 'neutral'} />
                </span>
                <b>{sym}</b>
                {c.leveraged && <span class="cb-badge lev">100×</span>}
                {c.pumping && <span class="cb-badge">🚀</span>}
              </span>
              <span class={`cb-chg ${c.changeBp >= 0 ? 'up' : 'down'}`}>{pct(c.changeBp)}</span>
              <Spark points={c.spark} up={(c.change24Bp ?? c.changeBp) >= 0} />
              <span class="cb-hp">
                <i style={{ width: `${out ? 0 : hpBp}%` }} />
              </span>
              <small class="cb-name">{out ? 'delisted' : m.name}</small>
            </button>
          );
        })}
      </div>

      <div class="cb-body">
        <div class="cb-stage-wrap">
          <div class={`stage cb-stage${live ? '' : ' cb-dim'}`} ref={host} />
          {clock.opening && snapshot && live && (
            <div class="cb-overlay opening">
              <b>{sess && !sess.firstPeriod ? '📊 NEW PRICES' : '🔔 OPENING BELL'}</b>
              <div class="cb-placards">
                {[...scored]
                  .sort((a, b) => b.changeBp - a.changeBp)
                  .map((c) => (
                    <span class={`cb-placard ${c.changeBp >= 0 ? 'up' : 'down'}`} style={{ '--c': colorOf(c.symbol) }}>
                      <b>{c.symbol.toUpperCase()}</b> {pct(c.changeBp)} {c.pumping ? '🚀' : c.leveraged ? '💀' : c.changeBp >= 0 ? '📈' : '📉'}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {closing && cfg.session && snapshot && (
            <div class="cb-overlay closing">
              <b>🔔 CLOSING BELL</b>
              <ol class="cb-podium">
                {[...scored]
                  .sort((a, b) => b.changeBp - a.changeBp)
                  .slice(0, 3)
                  .map((c, i) => (
                    <li style={{ '--c': colorOf(c.symbol) }}>
                      <span>{['🥇', '🥈', '🥉'][i]}</span> <b>{c.symbol}</b> {castMember(DEF, c.symbol).name} · {pct(c.changeBp)}
                    </li>
                  ))}
              </ol>
              <small>
                {cfg.moodLabel} {pct(snapshot.benchmarkBp ?? mood)} today · {sess?.banner}
              </small>
            </div>
          )}
          {closing && !cfg.session && (
            <div class="cb-overlay closing">
              <b>🔔 CLOSING BELL</b>
              <ol class="cb-podium">
                {table.slice(0, 3).map((r, i) => (
                  <li style={{ '--c': colorOf(r.symbol) }}>
                    <span>{['🥇', '🥈', '🥉'][i]}</span> <b>{r.symbol}</b> {castMember(DEF, r.symbol).name} · {r.points} pts
                  </li>
                ))}
              </ol>
              {table.length > 0 && (
                <small>
                  🔔 {castMember(DEF, table[0]!.symbol).name} rings the bell · 🪧 {castMember(DEF, table[table.length - 1]!.symbol).name} ({table[table.length - 1]!.symbol}) will work for gas
                </small>
              )}
              <small>Next hour's bros in {Math.ceil(clock.msToNext / 1000)}s</small>
            </div>
          )}
          {feed?.delayed && !clock.opening && live && <div class="cb-delayed">{bundle.live[`${cfg.texts}_delayed`]?.[0]}</div>}
          {!live && !closing && sess?.banner && <div class="cb-delayed cb-closed">{sess.banner}</div>}
          {breaker && live && (
            <div class="cb-overlay breaker">
              <b>⛔ TRADING HALTED</b>
              <small>Circuit breaker · next candle in {Math.ceil(clock.msToNext / 1000)}s</small>
            </div>
          )}
          {liq && (
            <div class="cb-overlay liq">
              <small>
                {liq.name.includes(liq.sym) ? liq.name : `${liq.name} (${liq.sym})`} · by {liq.by}
              </small>
            </div>
          )}
          {!snapshot && <div class="cb-overlay">Opening the market…</div>}
        </div>

        <aside class="cb-side">
          <section class="cb-card">
            <h2>
              {cfg.periodName} <small class="muted">{counting ? 'counting earlier candles…' : 'market share points'}</small>
            </h2>
            <ol class="cb-table">
              {table.map((r, i) => (
                <li style={{ '--c': colorOf(r.symbol) }}>
                  <span class="cb-rank">{i + 1}</span>
                  <b>{r.symbol}</b>
                  <span class="cb-pts">{r.points}</span>
                  <small class="muted">
                    {r.kos} KO{r.liquidations ? ` · ${r.liquidations} 💥` : ''} · mkt #{mktRank.get(r.symbol)}
                  </small>
                </li>
              ))}
            </ol>
            <div class="cb-candles" aria-label="Candles this hour">
              {Array.from({ length: clock.candles }, (_, c) => {
                const w = winnerOf(c);
                return <span class={`cb-candle${c === clock.candle ? ' now' : ''}${c < clock.candle ? ' done' : ''}`} style={w ? { background: colorOf(w) } : undefined} title={w ? `Candle ${c + 1}: ${w}` : `Candle ${c + 1}`} />;
              })}
            </div>
          </section>
          <section class="cb-card cb-feed">
            <h2>Floor feed</h2>
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

      <footer class="cb-foot">
        <b>Not financial advice. Not advice of any kind.</b> Fictional characters; no real people.{' '}
        {feed?.sample ? 'Prototype: sample market data.' : cfg.credit} No cookies, no tracking. <a href="/">Play Career Crash →</a>
      </footer>
    </main>
  );
}
