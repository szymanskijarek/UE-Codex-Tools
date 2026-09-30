import { bundle } from '@cc/content';
import { createBattle, Rng, step, type BattleInput } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import {
  careerOffers,
  careerSnapshot,
  aiLoadout,
  difficulty,
  fightPay,
  ensureRoots,
  generateRecruit,
  grow,
  opponentTeam,
  pointsLeft,
  rankOf,
  RANK_XP,
  skillTree,
  stageInfo,
  STAGES_PER_ARENA,
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

describe('items and pay', () => {
  function duel(loadout: string[]): { input: BattleInput; cc: CareerChar } {
    const cc = fresh();
    cc.loadout = loadout;
    const input: BattleInput = {
      schemaVersion: 1,
      contentHash: bundle.hash,
      simVersion: '0',
      seed: 'items',
      arenaId: 'arena.office',
      mode: 'duel_3v3',
      teams: [
        { playerId: 'a', playerName: 'A', rating: 1000, characters: [careerSnapshot(bundle, cc)] },
        { playerId: 'b', playerName: 'B', rating: 1000, characters: [careerSnapshot(bundle, fresh('career.chef'))] },
      ],
      modifiers: [],
    };
    return { input, cc };
  }

  it('gear raises stats and only the first three items are carried', () => {
    const plain = createBattle(duel([]).input, bundle).world.entities.find((e) => e.team === 0 && e.kind === 'char')!;
    const { input } = duel(['item.steel-toe-boots', 'item.hi-vis-vest', 'item.meal-deal', 'item.cigarettes']);
    expect(input.teams[0]!.characters[0]!.loadout).toHaveLength(3);
    const geared = createBattle(input, bundle).world.entities.find((e) => e.team === 0 && e.kind === 'char')!;
    expect(geared.stats!.strength).toBe(plain.stats!.strength + 1);
    expect(geared.stats!.awareness).toBe(plain.stats!.awareness + 2);
    expect(geared.consumables).toEqual(['item.meal-deal']);
  });

  it('kick-off consumables fire at the start, others at their HP threshold', () => {
    const b = createBattle(duel(['item.cigarettes', 'item.meal-deal']).input, bundle);
    const me = b.world.entities.find((e) => e.team === 0 && e.kind === 'char')!;
    for (let i = 0; i < 5; i++) step(b.world);
    const used = () => b.world.events.filter((e) => e.type === 'consume' && e.a === me.id).map((e) => e.s);
    expect(used()).toEqual(['item.cigarettes']);
    expect(me.statuses.some((st) => st.id === 'status.buzzed')).toBe(true);
    me.hp = Math.floor(me.maxHp * 0.3);
    step(b.world);
    expect(used()).toEqual(['item.cigarettes', 'item.meal-deal']);
    expect(me.consumables).toEqual([]);
  });

  it('AI opponents pack more items on harder difficulties', () => {
    const count = (id: 'relaxed' | 'brutal') => {
      let n = 0;
      for (let i = 0; i < 20; i++) n += aiLoadout(bundle, Rng.fromSeed(`ai${i}`), difficulty(id), 8).length;
      return n;
    };
    expect(count('brutal')).toBeGreaterThan(count('relaxed'));
    expect(opponentTeam(bundle, 'seed', 6, difficulty('brutal'), 3).every((c) => (c.loadout ?? []).length === 3)).toBe(true);
  });

  it('pays more for a win and for each KO', () => {
    const d = difficulty('normal');
    expect(fightPay('win', 0, 0, d).total).toBeGreaterThan(fightPay('loss', 0, 0, d).total);
    expect(fightPay('win', 0, 2, d).total - fightPay('win', 0, 0, d).total).toBe(60);
    expect(fightPay('win', 5, 0, d).total).toBeGreaterThan(fightPay('win', 0, 0, d).total);
  });
});

describe('ladder bosses', () => {
  const bosses = bundle.careers.filter((c) => c.boss);

  it('every arena has its own boss at the end of its stages', () => {
    const seen = new Set<string>();
    for (let chapter = 0; chapter < bundle.arenas.length; chapter++) {
      const info = stageInfo(bundle, chapter * STAGES_PER_ARENA + STAGES_PER_ARENA - 1);
      expect(info.boss).toBe(true);
      expect(info.bossCareer).toBeTruthy();
      seen.add(info.bossCareer!);
    }
    expect(seen.size).toBe(bundle.arenas.length);
    expect(stageInfo(bundle, 0).bossCareer).toBeUndefined();
  });

  it('the boss leads the opposing team with every signature move, on any difficulty', () => {
    const stage = STAGES_PER_ARENA - 1;
    const info = stageInfo(bundle, stage);
    for (const d of ['relaxed', 'brutal'] as const) {
      const [boss, ...rest] = opponentTeam(bundle, 'seed', stage, difficulty(d), 3);
      expect(boss!.c.careers).toEqual([info.bossCareer]);
      expect(boss!.c.name).toBe(info.bossName);
      const career = bosses.find((c) => c.id === info.bossCareer)!;
      const snap = careerSnapshot(bundle, boss!);
      for (const a of [career.active, career.passive, ...(career.extraActives ?? [])]) expect(snap.unlocked).toContain(a);
      for (const r of rest) expect(r.c.careers.some((c) => bosses.some((b) => b.id === c))).toBe(false);
    }
  });

  it('bosses are never recruited, generated or offered as a career', () => {
    const rng = Rng.fromSeed('boss-check');
    for (let i = 0; i < 300; i++) expect(bosses.some((b) => generateRecruit(bundle, rng, `r${i}`).careers.includes(b.id))).toBe(false);
    const all = bundle.careers.map((c) => c.id);
    for (let i = 0; i < 50; i++) expect(careerOffers(bundle, fresh().c, all, `offer-${i}`).some((id) => bosses.some((b) => b.id === id))).toBe(false);
  });
});
