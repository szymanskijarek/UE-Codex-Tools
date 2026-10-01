import { bundle } from '@cc/content';
import { Rng, simulate } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { battleInput, randomTeam } from '../../../packages/sim/test/fixtures';
import { pickPhotoMoment } from '../src/career/photo-moment';

describe('fight photo moment', () => {
  it('picks a real fighter at a moment inside the fight, the same way every time', () => {
    const rng = Rng.fromSeed('photo');
    const kinds = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const input = battleInput(bundle, `ph${i}`, [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')]);
      const m = pickPhotoMoment(input);
      expect(m).not.toBeNull();
      expect(pickPhotoMoment(structuredClone(input))).toEqual(m);
      const out = simulate(input, bundle);
      const fighter = out.result.characters.find((c) => c.entityId === m!.id);
      expect(fighter, `entity ${m!.id} is one of the six fighters`).toBeDefined();
      expect(fighter!.team).toBe(m!.team);
      expect(m!.tick).toBeGreaterThanOrEqual(20);
      kinds.add(m!.kind);
    }
    // Throws and tosses happen in most fights; airborne shots should come up.
    expect(kinds.has('air')).toBe(true);
  });
});
