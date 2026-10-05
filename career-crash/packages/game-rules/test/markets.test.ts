import { bundle } from '@cc/content';
import { simulate } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { addStandings, candleInput, emptyStandings, floorClock, marketFighter, pickField, scoreField, tallyCandle, type MarketCoin, type MarketSnapshot } from '../src/markets';

const def = bundle.markets.find((m) => m.id === 'market.crypto')!;

const coin = (symbol: string, capRank: number, changeBp: number): MarketCoin => ({ symbol, capRank, changeBp });
const COINS: MarketCoin[] = [
  coin('BTC', 1, 40),
  coin('ETH', 2, -30),
  coin('USDT', 3, 0),
  coin('XRP', 4, 120),
  coin('BNB', 5, 10),
  coin('SOL', 6, 260),
  coin('USDC', 7, 0),
  coin('DOGE', 8, -100),
  coin('TRX', 9, 5),
  coin('ADA', 10, -60),
  coin('HYPE', 11, -640),
  coin('LINK', 12, 70),
  coin('AVAX', 13, -20),
];

describe('market floors (08)', () => {
  it('picks the top of the field by market cap, without stablecoins', () => {
    const field = pickField(def, COINS).map((c) => c.symbol);
    expect(field).toHaveLength(def.field);
    expect(field).not.toContain('USDT');
    expect(field).not.toContain('USDC');
    expect(field).toContain('LINK');
    expect(field).not.toContain('AVAX');
  });

  it('scores against the field, so a red hour still has winners', () => {
    const red = COINS.map((c) => ({ ...c, changeBp: c.changeBp - 500 }));
    const a = scoreField(def, COINS).map((c) => c.score);
    const b = scoreField(def, red).map((c) => c.score);
    expect(b).toEqual(a);
    const s = scoreField(def, COINS);
    expect(s.find((c) => c.symbol === 'SOL')!.score).toBe(def.score.max);
    expect(s.find((c) => c.symbol === 'SOL')!.pumping).toBe(true);
    expect(s.every((c) => Math.abs(c.score) <= def.score.max)).toBe(true);
  });

  it('a crashing coin is over-leveraged; a calm hour has nobody leveraged by its change', () => {
    const s = scoreField(def, COINS);
    expect(s.find((c) => c.symbol === 'HYPE')!.leveraged).toBe(true);
    expect(s.filter((c) => c.leveraged).map((c) => c.symbol)).toEqual(['HYPE']);
    const flat = scoreField(
      def,
      COINS.map((c) => ({ ...c, changeBp: 0 })),
    );
    expect(flat.some((c) => c.leveraged)).toBe(false);
  });

  it('a better hour makes a stronger fighter with the same build', () => {
    const [btc] = scoreField(def, COINS);
    const up = marketFighter(bundle, def, { ...btc!, score: def.score.max, pumping: true });
    const down = marketFighter(bundle, def, { ...btc!, score: -def.score.max, dumping: true });
    const total = (s: typeof up.stats) => Object.values(s).reduce((a, b) => a + b, 0);
    expect(up.level).toBeGreaterThan(down.level);
    expect(total(up.stats)).toBeGreaterThan(total(down.stats));
    expect(up.name).toBe(down.name);
    expect(up.appearance).toEqual(down.appearance);
    expect(up.persona).toBe('npc.bro-btc');
    expect(up.startStatuses?.[0]?.status).toBe('status.pumped');
    expect(down.startStatuses?.[0]?.status).toBe('status.embarrassed');
  });

  it('coins without a persona of their own are Anon Bro', () => {
    const hype = scoreField(def, COINS).find((c) => c.symbol === 'HYPE')!;
    const f = marketFighter(bundle, def, hype);
    expect(f.persona).toBe(def.anon.persona);
    expect(f.name).toContain('HYPE');
  });

  it('the clock splits the hour into candles with a circuit breaker after each', () => {
    const at = (iso: string) => floorClock(def, Date.parse(iso));
    const slotS = (def.candle.ticks + def.candle.breakerTicks) / 20;
    expect(at('2026-10-05T14:00:00Z')).toMatchObject({ hour: '2026-10-05T14', candle: 0, tick: 0, breaker: false });
    expect(at('2026-10-05T14:00:00Z').candles).toBe(Math.floor(3600 / slotS));
    const inBreaker = at(new Date(Date.parse('2026-10-05T14:00:00Z') + (def.candle.ticks / 20 + 1) * 1000).toISOString());
    expect(inBreaker).toMatchObject({ candle: 0, breaker: true });
    expect(at('2026-10-05T14:59:59Z').candle).toBe(at('2026-10-05T14:00:00Z').candles - 1);
    // The hour opens with the Opening Bell and its last candle ends early for the Closing Bell.
    expect(at('2026-10-05T14:00:05Z').opening).toBe(true);
    expect(at('2026-10-05T14:30:05Z').opening).toBe(false);
    const closing = at('2026-10-05T14:59:30Z');
    expect(closing).toMatchObject({ closing: true, breaker: false, fightTicks: def.candle.ticks - def.candle.closingTicks });
    expect(at('2026-10-05T14:57:00Z').closing).toBe(false);
  });

  it('every viewer gets the same candle, and standings add up', () => {
    const snap: MarketSnapshot = { market: def.id, hour: '2026-10-05T14', coins: COINS };
    const input = candleInput(bundle, def, snap, 2);
    expect(input.endless?.round).toBe(2);
    expect(input.teams).toHaveLength(def.field);
    const short = { ...input, endless: { ...input.endless!, ticks: 1200 } };
    const a = simulate(short, bundle);
    const b = simulate(structuredClone(short), bundle);
    expect(b.resultHash).toBe(a.resultHash);
    const symbols = input.teams.map((t) => t.playerId);
    const fighters = a.result.characters.map((c) => ({ id: c.entityId, team: c.team, counters: c.counters }));
    const rows = tallyCandle(def, symbols, a.events, fighters);
    const kos = a.events.filter((e) => e.type === 'ko' && fighters.some((f) => f.id === e.b)).length;
    expect(rows.reduce((n, r) => n + r.koed, 0)).toBe(kos);
    const hour = addStandings(def, emptyStandings(symbols), rows);
    const best = Math.max(...rows.map((r) => r.points));
    expect(hour.filter((r) => r.candlesWon === 1).every((r) => rows.find((x) => x.symbol === r.symbol)!.points === best)).toBe(true);
  });
});
