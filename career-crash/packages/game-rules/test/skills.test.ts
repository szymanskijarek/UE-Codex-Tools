import { bundle } from '@cc/content';
import { createBattle, Rng } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import {
  careerSnapshot,
  difficulty,
  ensureRoots,
  generateRecruit,
  grow,
  opponentTeam,
  pointsLeft,
  rankOf,
  RANK_XP,
  skillTree,
  unlockBlocker,
  unlockNode,
  type CareerChar,
} from '../src';

function fresh(career = 'career.firefighter'): CareerChar {
  const c = generateRecruit(bundle, Rng.fromSeed('sk'), 'sk-1', { careerPool: [career] });
  const cc: CareerChar = { c, careerXp: {}, nodes: [] };
  ensureRoots(bundle, cc);
  return cc;
}

describe('career skill trees', () => {
  it('every starting career has a tree rooted in its main move', () => {
    for (const c of bundle.careers.filter((x) => x.tier === 1)) {
      const tree = skillTree(bundle, c.id);
      expect(tree[0]!.ability).toBe(c.active);
      expect(tree.some((n) => n.ability === c.passive)).toBe(true);
      expect(tree.some((n) => n.kind === 'capstone')).toBe(true);
    }
  });

  it('ranks gate rows and skill points gate unlocks', () => {
    const cc = fresh();
    const tree = skillTree(bundle, 'career.firefighter');
    const passive = tree.find((n) => n.kind === 'passive')!;
    const reflex = tree.find((n) => n.kind === 'reflex')!;
    expect(pointsLeft(bundle, cc, 'career.firefighter')).toBe(1);
    expect(unlockBlocker(bundle, cc, reflex)).toMatch(/Junior/);
    expect(unlockNode(bundle, cc, passive.id)).toBeNull();
    expect(pointsLeft(bundle, cc, 'career.firefighter')).toBe(0);
    const g = grow(bundle, cc, RANK_XP[1]);
    expect(g.rankAfter).toBe(2);
    expect(rankOf(cc.careerXp['career.firefighter']!)).toBe(2);
    expect(unlockNode(bundle, cc, reflex.id)).toBeNull();
  });

  it('battle snapshots only carry unlocked career moves, and the sim respects them', () => {
    const cc = fresh();
    const snap = careerSnapshot(bundle, cc);
    const career = bundle.careers.find((c) => c.id === 'career.firefighter')!;
    expect(snap.unlocked).toEqual([career.active]);
    const opp = fresh('career.chef');
    const b = createBattle(
      {
        schemaVersion: 1,
        contentHash: bundle.hash,
        simVersion: '0',
        seed: 'sk',
        arenaId: 'arena.office',
        mode: 'duel_3v3',
        teams: [
          { playerId: 'a', playerName: 'A', rating: 1000, characters: [snap] },
          { playerId: 'b', playerName: 'B', rating: 1000, characters: [careerSnapshot(bundle, opp)] },
        ],
        modifiers: [],
      },
      bundle,
    );
    const e = b.world.entities.find((x) => x.snapshotId === snap.id)!;
    for (const x of career.extraActives ?? []) expect(e.actives).not.toContain(x);
    expect(e.actives).toContain(career.active);
  });

  it('harder difficulties field stronger, better-skilled opponents', () => {
    const skills = (id: 'relaxed' | 'normal' | 'hard' | 'brutal') => opponentTeam(bundle, 'seed', 6, difficulty(id), 3).reduce((n, c) => n + c.nodes.length, 0);
    expect(skills('relaxed')).toBeLessThan(skills('normal'));
    expect(skills('normal')).toBeLessThanOrEqual(skills('hard'));
    expect(skills('hard')).toBeLessThan(skills('brutal'));
    const lvl = (id: 'relaxed' | 'brutal') => opponentTeam(bundle, 'seed', 6, difficulty(id), 3)[0]!.c.level;
    expect(lvl('brutal')).toBeGreaterThan(lvl('relaxed'));
  });
});
