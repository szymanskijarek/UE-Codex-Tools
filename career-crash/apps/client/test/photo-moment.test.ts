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
      // A second subject (whoever landed the blow) is a fighter in the same battle.
      if (m!.with !== undefined && m!.kind !== 'critter' && m!.kind !== 'spooked') expect(out.result.characters.some((c) => c.entityId === m!.with)).toBe(true);
      kinds.add(m!.kind);
    }
    // Not the same kind of shot every time (it used to be nearly always a flight).
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('steers away from the previous photo\'s kind of shot', () => {
    const rng = Rng.fromSeed('photo-last');
    let same = 0;
    for (let i = 0; i < 10; i++) {
      const input = battleInput(bundle, `pl${i}`, [randomTeam(bundle, rng, 3, 'A'), randomTeam(bundle, rng, 3, 'B')]);
      const first = pickPhotoMoment(input)!;
      if (pickPhotoMoment(input, [], first)!.kind === first.kind) same++;
    }
    expect(same).toBeLessThan(10);
  });
});
