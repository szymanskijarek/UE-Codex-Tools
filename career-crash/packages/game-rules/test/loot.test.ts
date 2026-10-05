import { bundle } from '@cc/content';
import { LOOT_RARITIES } from '@cc/content-schema/constants';
import { createBattle, Rng, type BattleInput, type CharacterSnapshot } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import { careerSnapshot, ensureRoots, generateRecruit, grantableAbilities, isValidLoot, opponentGear, rarityDef, rollLoot, rollRarity, type CareerChar, type LootItem } from '../src';

function fighter(career: string, seed: string): CareerChar {
  const cc: CareerChar = { c: generateRecruit(bundle, Rng.fromSeed(seed), `f-${seed}`, { careerPool: [career] }), careerXp: {}, nodes: [] };
  ensureRoots(bundle, cc);
  return cc;
}

function battle(a: CharacterSnapshot, b: CharacterSnapshot, seed: string) {
  const input: BattleInput = {
    schemaVersion: 1,
    contentHash: bundle.hash,
    simVersion: '0',
    seed,
    arenaId: 'arena.office',
    mode: 'duel_3v3',
    teams: [
      { playerId: 'a', playerName: 'A', rating: 1000, characters: [a] },
      { playerId: 'b', playerName: 'B', rating: 1000, characters: [b] },
    ],
    modifiers: [],
  };
  return createBattle(input, bundle);
}

describe('loot', () => {
  it('rarer items are much harder to roll', () => {
    const rng = Rng.fromSeed('odds');
    const n: Record<string, number> = {};
    for (let i = 0; i < 40000; i++) {
      const r = rollRarity(bundle, rng);
      n[r] = (n[r] ?? 0) + 1;
    }
    const counts = LOOT_RARITIES.map((r) => n[r] ?? 0);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThan(counts[i - 1]! / 2);
    expect(counts[4]! / 40000).toBeLessThan(0.01);
    expect(counts[4]).toBeGreaterThan(0);
  });

  it('extra rolls (bosses, Brutal) improve the odds', () => {
    const avg = (rolls: number) => {
      const rng = Rng.fromSeed(`rolls${rolls}`);
      let s = 0;
      for (let i = 0; i < 5000; i++) s += LOOT_RARITIES.indexOf(rollRarity(bundle, rng, rolls));
      return s / 5000;
    };
    expect(avg(2)).toBeGreaterThan(avg(1));
  });

  it('every rolled item spends exactly its rarity points and passes validation', () => {
    const rng = Rng.fromSeed('items');
    let withAbility = 0;
    for (let i = 0; i < 3000; i++) {
      const it = rollLoot(bundle, rng, `u${i}`, 3);
      const sum = Object.values(it.stats).reduce((a, b) => a + b!, 0);
      expect(sum).toBe(rarityDef(bundle, it.rarity).points);
      expect(Object.keys(it.stats).length).toBeLessThanOrEqual(bundle.economy.loot.maxStatsPerItem);
      if (it.ability) {
        withAbility++;
        expect(rarityDef(bundle, it.rarity).abilityBp).toBeGreaterThan(0);
      }
      expect(isValidLoot(bundle, it)).toBe(true);
    }
    expect(withAbility).toBeGreaterThan(0);
  });

  it('rejects tampered items', () => {
    const good: LootItem = { uid: 'x', base: bundle.loot[0]!.id, rarity: 'normal', stats: { luck: 2 } };
    expect(isValidLoot(bundle, good)).toBe(true);
    expect(isValidLoot(bundle, { ...good, stats: { luck: 9 } })).toBe(false);
    expect(isValidLoot(bundle, { ...good, rarity: 'mythic' })).toBe(false);
    expect(isValidLoot(bundle, { ...good, base: 'loot.nope' })).toBe(false);
    expect(isValidLoot(bundle, { ...good, ability: bundle.careers[0]!.active })).toBe(false); // normal items never grant
    expect(isValidLoot(bundle, { ...good, rarity: 'uncommon', stats: { luck: 3 }, ability: 'ability.nope' })).toBe(false);
    const boss = bundle.careers.find((c) => c.boss)!;
    expect(isValidLoot(bundle, { ...good, rarity: 'legendary', stats: { luck: 6 }, ability: boss.active })).toBe(false);
  });

  it('gear adds its stats and its ability to the battle snapshot', () => {
    const cc = fighter('career.firefighter', 'gear');
    const before = careerSnapshot(bundle, cc);
    const florist = bundle.careers.find((c) => c.id === 'career.florist')!;
    cc.gear = [{ uid: 'g1', base: bundle.loot[0]!.id, rarity: 'epic', stats: { strength: 3, luck: 2 }, ability: florist.active }];
    const after = careerSnapshot(bundle, cc);
    expect(after.stats.strength).toBe(before.stats.strength + 3);
    expect(after.stats.luck).toBe(before.stats.luck + 2);
    expect(after.granted).toEqual([florist.active]);
    const b = battle(after, careerSnapshot(bundle, fighter('career.chef', 'opp')), 'g');
    const e = b.world.entities.find((x) => x.snapshotId === after.id)!;
    expect(e.actives).toContain(florist.active);
  });

  it('every grantable ability works on a fighter from a different career', () => {
    const all = [...grantableAbilities(bundle).entries()];
    expect(all.length).toBeGreaterThan(100);
    for (const [aid, owner] of all) {
      const career = owner === 'career.accountant' ? 'career.chef' : 'career.accountant';
      const cc = fighter(career, aid);
      cc.gear = [{ uid: 'g', base: bundle.loot[0]!.id, rarity: 'legendary', stats: { health: 6 }, ability: aid }];
      const snap = careerSnapshot(bundle, cc);
      const b = battle(snap, careerSnapshot(bundle, fighter('career.chef', `o${aid}`)), aid);
      const e = b.world.entities.find((x) => x.snapshotId === snap.id)!;
      const def = bundle.abilities.find((a) => a.id === aid)!;
      if (def.kind === 'active') expect(e.actives, aid).toContain(aid);
      for (let t = 0; t < 400 && !b.done(); t++) b.step();
    }
  });

  it('ladder opponents gain gear as the ladder goes on', () => {
    expect(opponentGear(bundle, Rng.fromSeed('o'), 0, 'x', false)).toHaveLength(0);
    expect(opponentGear(bundle, Rng.fromSeed('o'), 30, 'x', false)).toHaveLength(bundle.economy.loot.slots);
  });
});
