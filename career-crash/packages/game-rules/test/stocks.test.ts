import { bundle } from '@cc/content';
import { createBattle } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { candleInput, candlesPerHour, floorClock, marketMood, scoreField, type MarketCoin, type MarketSnapshot } from '../src/markets';
import { sessionState, sessionTime, zonedToMs } from '../src/stocks';

const def = bundle.markets.find((m) => m.id === 'market.stocks')!;
const at = (iso: string) => Date.parse(iso);

const coin = (symbol: string, capRank: number, changeBp: number): MarketCoin => ({ symbol, capRank, changeBp });
const STOCKS: MarketCoin[] = [
  coin('NVDA', 1, 240),
  coin('MSFT', 2, 30),
  coin('AAPL', 3, -20),
  coin('GOOGL', 4, 60),
  coin('GOOG', 5, 60),
  coin('AMZN', 6, -110),
  coin('META', 7, 10),
  coin('AVGO', 8, 150),
  coin('TSLA', 9, -420),
  coin('BRK.B', 10, 5),
  coin('JPM', 11, 25),
  coin('WMT', 12, 40),
];

describe('Regards, Wall Street (13): the trading session', () => {
  it('opens at 9:30 New York time on both sides of the clock change', () => {
    // Friday 30 Oct 2026 is still daylight time (UTC−4); Monday 2 Nov is standard time (UTC−5).
    expect(new Date(zonedToMs('2026-10-30', '09:30', 'America/New_York')).toISOString()).toBe('2026-10-30T13:30:00.000Z');
    expect(new Date(zonedToMs('2026-11-02', '09:30', 'America/New_York')).toISOString()).toBe('2026-11-02T14:30:00.000Z');
    const s = sessionState(def, at('2026-11-02T14:45:00Z'));
    expect(s.phase).toBe('open');
    expect(s.firstPeriod).toBe(true);
    expect(s.floorMs).toBe(at('2026-11-02T14:45:00Z'));
    expect(sessionTime(def, s.floorMs)).toBe('09:45');
  });

  it('runs 30-minute periods of 5-minute candles, keyed by the period start', () => {
    expect(candlesPerHour(def)).toBe(6);
    const c = floorClock(def, at('2026-11-02T14:45:10Z'));
    expect(c.hour).toBe('2026-11-02T14:30');
    expect(c.candle).toBe(3);
    expect(c.closing).toBe(false);
  });

  it('is closed at weekends and replays the last session’s final half hour', () => {
    const now = at('2026-10-31T15:07:00Z');
    const s = sessionState(def, now);
    expect(s.phase).toBe('closed');
    expect(new Date(s.lastCloseMs).toISOString()).toBe('2026-10-30T20:00:00.000Z');
    expect(new Date(s.nextOpenMs).toISOString()).toBe('2026-11-02T14:30:00.000Z');
    expect(s.floorMs).toBeGreaterThanOrEqual(s.lastCloseMs - 1_800_000);
    expect(s.floorMs).toBeLessThan(s.lastCloseMs);
    expect(floorClock(def, s.floorMs).hour).toBe('2026-10-30T19:30');
  });

  it('knows pre-market, holidays, half days and the Closing Bell', () => {
    expect(sessionState(def, at('2026-11-02T13:00:00Z')).phase).toBe('pre');
    expect(sessionState(def, at('2026-11-26T16:00:00Z')).phase).toBe('closed'); // Thanksgiving
    const half = sessionState(def, at('2026-11-27T18:00:30Z')); // closed at 13:00 ET
    expect(half.phase).toBe('after');
    expect(half.closingBell).toBe(true);
    expect(new Date(half.lastCloseMs).toISOString()).toBe('2026-11-27T18:00:00.000Z');
    expect(sessionState(def, at('2026-11-27T18:30:00Z')).closingBell).toBe(false);
  });
});

describe('Regards, Wall Street (13): scoring against the S&P 500', () => {
  it('scores each stock against the index, not against the field', () => {
    const scored = scoreField(def, STOCKS, 50);
    expect(scored).toHaveLength(def.field);
    expect(scored.map((c) => c.symbol)).not.toContain('GOOG');
    const by = new Map(scored.map((c) => [c.symbol, c]));
    expect(by.get('NVDA')!.score).toBeGreaterThan(0);
    expect(by.get('AMZN')!.score).toBeLessThan(0);
    // Everyone moving with the index scores nothing.
    expect(scoreField(def, STOCKS.map((c) => ({ ...c, changeBp: 80 })), 80).every((c) => c.score === 0)).toBe(true);
    expect(marketMood(def, STOCKS, -35)).toBe(-35);
    expect(by.get('TSLA')!.leveraged).toBe(true);
  });

  it('builds a deterministic candle that runs', () => {
    const snap: MarketSnapshot = { market: 'stocks', hour: '2026-11-02T14:30', coins: STOCKS, benchmarkBp: 50 };
    const a = candleInput(bundle, def, snap, 2);
    const b = candleInput(bundle, def, snap, 2);
    expect(a).toEqual(b);
    expect(a.teams.map((t) => t.playerId)).toContain('BRK.B');
    expect(a.teams.find((t) => t.playerId === 'NVDA')!.characters[0]!.name).toBe('Overclock Owen');
    const battle = createBattle(a, bundle);
    for (let i = 0; i < 400 && !battle.done(); i++) battle.step();
    expect(battle.world.entities.filter((e) => e.kind === 'char').length).toBeGreaterThanOrEqual(10);
  });
});
