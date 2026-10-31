import { render } from 'preact';
import { bundle } from '@cc/content';
import { sessionState, sessionTime, type MarketSnapshot } from '@cc/game-rules';
import { Floor, type FloorConfig, type SessionView } from '../market/Floor';
import { marketFeed } from '../market/feed';
import mock from './mock-feed.json';
import frameUrl from '../cryptobro/ticker-frame.webp';
import logoUrl from './logo.png';
import '../styles.css';
import '../cryptobro/cryptobro.css';
import './wallstreet.css';

const DEF = bundle.markets.find((m) => m.id === 'market.stocks')!;
const TZ = DEF.session!.tz;
/** Where the feed worker serves the half-hourly snapshots (13 §10.2). `VITE_STOCKS_FEED_URL` points dev builds elsewhere. */
const FEED = (import.meta.env?.VITE_STOCKS_FEED_URL as string | undefined) ?? 'https://feed.careercrash.org/stocks';
const PERIOD_MS = (DEF.periodSec ?? 3600) * 1000;
const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: TZ });

/** "2d 4h", "3h 12m", "8m". */
function until(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}m`;
}

/** The exchange's hours (13 §3): live while it trades, a dimmed replay of the last half hour otherwise. */
function session(nowMs: number): SessionView {
  const s = sessionState(DEF, nowMs);
  const opens = `${s.phase === 'pre' ? 'today' : weekday.format(s.nextOpenMs)} at ${sessionTime(DEF, s.nextOpenMs)} ET (in ${until(s.nextOpenMs - nowMs)})`;
  const banner =
    s.phase === 'pre'
      ? `☕ Pre-market. Opening Bell ${opens}. Meanwhile: yesterday's last half hour.`
      : s.phase === 'after'
        ? `🌙 Market closed. Replaying the last half hour. Opens ${opens}.`
        : `🏖️ Market closed today. Replaying the last session's final half hour. Opens ${opens}.`;
  return { floorMs: s.floorMs, live: s.phase === 'open', banner: s.phase === 'open' ? undefined : banner, closingBell: s.closingBell, firstPeriod: s.firstPeriod };
}

const config: FloorConfig = {
  def: DEF,
  tag: 'wallstreet',
  texts: 'stocks',
  title: 'Regards, Wall Street',
  logo: logoUrl,
  frame: frameUrl,
  feed: marketFeed(FEED, mock as MarketSnapshot),
  periodName: 'This half hour',
  moodLabel: 'S&P 500',
  credit: 'Prices: Alpaca (IEX).',
  session,
  periodLabel: (h) => {
    const start = Date.parse(`${h}:00Z`);
    return `${sessionTime(DEF, start)}–${sessionTime(DEF, start + PERIOD_MS)}\u00a0ET`;
  },
};

const app = document.getElementById('app')!;
// Clear the page's no-JavaScript text first: Preact renders next to it rather than replacing it.
app.replaceChildren();
render(<Floor cfg={config} />, app);
