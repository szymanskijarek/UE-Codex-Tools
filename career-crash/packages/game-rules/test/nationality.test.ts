import { describe, expect, it } from 'vitest';
import { bundle } from '@cc/content';
import { applyNationalBoost, canChangeNationality, nationalBoost, nationalityKeys, summitTotals } from '../src/nationality';
import type { CharacterSnapshot } from '@cc/sim';

const hour = '2026-10-07T14';
const summit = { hour, totals: { PL: 30, ENG: 30, FR: 12, DE: 5, ES: 5, IT: 4, JP: 3, BR: 3, MX: 2, CA: 2, IE: 2, US: 1 } };

describe('nationality (economy.nationality)', () => {
  it('ranks a country by the hour’s likes, ties sharing a rank', () => {
    expect(nationalBoost(bundle, 'PL', summit)).toMatchObject({ rank: 1, likes: 30, tier: { id: 'head' } });
    expect(nationalBoost(bundle, 'ENG', summit)?.rank).toBe(1);
    expect(nationalBoost(bundle, 'FR', summit)).toMatchObject({ rank: 3, tier: { id: 'podium' } });
    expect(nationalBoost(bundle, 'DE', summit)).toMatchObject({ rank: 4, tier: { id: 'support' } });
    // Rank 9: three-way tie on 2 likes, still in the top ten.
    expect(nationalBoost(bundle, 'IE', summit)).toMatchObject({ rank: 9, tier: { id: 'support' } });
    // Twelfth, no likes, no country or no data: nothing.
    expect(nationalBoost(bundle, 'US', summit)).toBeNull();
    expect(nationalBoost(bundle, 'SCO', summit)).toBeNull();
    expect(nationalBoost(bundle, undefined, summit)).toBeNull();
    expect(nationalBoost(bundle, 'PL', null)).toBeNull();
  });

  it('adds up an hour from the service tallies', () => {
    expect(summitTotals([{}, { PL: 1 }, { PL: 3, FR: 1 }], { PL: 2, DE: 1 })).toEqual({ PL: 5, FR: 1, DE: 1 });
  });

  it('is a small boost: a few stat points, at most one short kick-off status', () => {
    for (const t of bundle.economy.nationality.tiers) {
      const total = Object.values(t.stats).reduce((a, b) => a + (b ?? 0), 0);
      expect(total, t.id).toBeGreaterThan(0);
      expect(total, t.id).toBeLessThanOrEqual(6);
      if (t.status) expect(bundle.statuses.some((s) => s.id === t.status!.status), t.id).toBe(true);
      expect(bundle.locale[`nationality.${t.id}.name`], t.id).toBeTruthy();
    }
    const snap = { stats: { confidence: 10, charisma: 10, strength: 10 } } as unknown as CharacterSnapshot;
    const b = applyNationalBoost(snap, nationalBoost(bundle, 'PL', summit));
    expect(b.stats.confidence).toBe(10 + (bundle.economy.nationality.tiers[0]!.stats.confidence ?? 0));
    expect(b.startStatuses?.[0]?.status).toBe('status.pumped');
    expect(applyNationalBoost(snap, null)).toBe(snap);
  });

  it('can be changed once a day; the first pick is free', () => {
    const now = Date.parse('2026-10-07T14:00:00Z');
    expect(canChangeNationality(bundle, undefined, now)).toBe(true);
    expect(canChangeNationality(bundle, now - 3_600_000, now)).toBe(false);
    expect(canChangeNationality(bundle, now - 24 * 3_600_000, now)).toBe(true);
    expect(nationalityKeys(bundle)).toContain('PL');
  });
});
