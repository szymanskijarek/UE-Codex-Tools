import { render } from 'preact';
import { bundle } from '@cc/content';
import type { MarketSnapshot } from '@cc/game-rules';
import { Floor, type FloorConfig } from '../market/Floor';
import { marketFeed } from '../market/feed';
import mock from './mock-feed.json';
import frameUrl from './ticker-frame.webp';
import logoUrl from './logo.webp';
import '../styles.css';
import './cryptobro.css';

/**
 * Where the hourly feed worker serves snapshots (08 §10, apps/markets).
 * `VITE_FEED_URL` points dev builds at a local `wrangler dev` (http://localhost:8788/crypto).
 */
const FEED = (import.meta.env?.VITE_FEED_URL as string | undefined) ?? 'https://feed.careercrash.org/crypto';

const config: FloorConfig = {
  def: bundle.markets.find((m) => m.id === 'market.crypto')!,
  tag: 'cryptobro',
  texts: 'market',
  title: 'Crypto Bros',
  logo: logoUrl,
  frame: frameUrl,
  feed: marketFeed(FEED, mock as MarketSnapshot),
  periodName: 'This hour',
  moodLabel: 'market',
  credit: 'Market data: CoinGecko.',
};

const app = document.getElementById('app')!;
// Clear the page's no-JavaScript text first: Preact renders next to it rather than replacing it.
app.replaceChildren();
render(<Floor cfg={config} />, app);
