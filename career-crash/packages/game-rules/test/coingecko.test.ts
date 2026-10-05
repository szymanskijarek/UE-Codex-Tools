import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { castMember, hourOf, pickField, snapshotFromCoinGecko, snapshotsFromHistory, type CoinGeckoMarket } from '../src';

const def = bundle.markets.find((m) => m.id === 'market.crypto')!;

describe('CoinGecko snapshots (08 §10)', () => {
  it('maps, ranks and de-duplicates coins', () => {
    const rows: CoinGeckoMarket[] = [
      { id: 'b', symbol: 'eth', current_price: 4000, market_cap_rank: 2, price_change_percentage_1h_in_currency: -0.4 },
      { id: 'a', symbol: 'btc', current_price: 112345.678, market_cap_rank: 1, price_change_percentage_1h_in_currency: 1.234, price_change_percentage_24h_in_currency: -2 },
      { id: 'c', symbol: 'eth', current_price: 1, market_cap_rank: 300 },
      { id: 'd', symbol: 'nope', current_price: null, market_cap_rank: 5 },
    ];
    const s = snapshotFromCoinGecko(rows, '2026-10-05T14');
    expect(s.coins.map((c) => c.symbol)).toEqual(['BTC', 'ETH']);
    expect(s.coins[0]).toMatchObject({ changeBp: 123, change24Bp: -200, capRank: 1, price: 112345.68 });
  });

  it('rebuilds past hours from price histories', () => {
    const t0 = Date.parse('2026-10-05T10:00:00Z');
    const prices: [number, number][] = Array.from({ length: 30 }, (_, i) => [t0 - 26 * 3_600_000 + i * 3_600_000, 100 + i]);
    const [h] = snapshotsFromHistory([{ symbol: 'sol', capRank: 6, prices }], [hourOf(t0)]);
    // 126 at 10:00 against 125 at 09:00.
    expect(h!.coins[0]).toMatchObject({ symbol: 'SOL', changeBp: 80 });
  });

  it('renamed tickers keep their bro; excluded ones never fight', () => {
    expect(castMember(def, 'GRAM').name).toBe('Tony Tons');
    expect(castMember(def, 'ZEC')).toBe(def.anon);
    const field = pickField(def, ['BTC', 'USDT', 'FIGR_HELOC', 'WBT', 'ETH'].map((symbol, i) => ({ symbol, capRank: i + 1, changeBp: 0 })));
    expect(field.map((c) => c.symbol)).toEqual(['BTC', 'ETH']);
  });
});
