import { bundle } from '@cc/content';
import { createBattle, Rng, step, type BattleInput } from '@cc/sim';
import { describe, expect, it } from 'vitest';
import {
  activeHrNotes,
  applyHrNotes,
  careerSnapshot,
  describeHrEffect,
  describeHrWhen,
  ensureRoots,
  generateRecruit,
  hrMood,
  hrNotesOf,
  readHrFile,
  unreadHrNotes,
  type CareerChar,
  type HrContext,
} from '../src';

function person(career: string, id = career, personality?: string): CareerChar {
  const c = generateRecruit(bundle, Rng.fromSeed(`hr:${id}`), id, { careerPool: [career] });
  if (personality) c.personality = personality;
  const cc: CareerChar = { c, careerXp: {}, nodes: [] };
  ensureRoots(bundle, cc);
  return cc;
}

const ctx = (over: Partial<HrContext> = {}): HrContext => ({ arenaId: 'arena.office', allies: [], enemies: [], boss: false, ...over });
const ids = (cc: CareerChar, c: HrContext) => activeHrNotes(bundle, cc, c).map((a) => a.note.id);

describe('personnel files (06)', () => {
  it('every starting and tier-2 career has at least two notes, bosses none', () => {
    for (const c of bundle.careers) expect(hrNotesOf(bundle, [c.id]).length >= 2).toBe(!c.boss);
  });

  it('switches notes on by arena, colleague, opponent, gear and snack', () => {
    const chef = person('career.chef');
    expect(ids(chef, ctx())).toEqual([]);
    expect(ids(chef, ctx({ arenaId: 'arena.diner' }))).toEqual(['hr.chef-not-my-kitchen']);
    const critic = person('career.food-critic', 'critic');
    expect(ids(chef, ctx({ allies: [critic] }))).toEqual(['hr.chef-one-star-review']);
    // Opponents don't count as colleagues.
    expect(ids(chef, ctx({ enemies: [critic] }))).toEqual([]);
    expect(ids(critic, ctx({ enemies: [chef] }))).toEqual(['hr.food-critic-notebook-out']);
    const builder = person('career.builder');
    builder.gear = [{ uid: 'x', base: 'loot.hard-hat', rarity: 'normal', stats: {} }];
    expect(ids(builder, ctx())).toEqual(['hr.builder-proper-ppe']);
    const barista = person('career.barista');
    barista.loadout = ['item.energy-drink'];
    expect(ids(barista, ctx())).toEqual(['hr.barista-tolerance']);
  });

  it('matches teammates by tag, personality and agency temp, and names who set it off', () => {
    const nurse = person('career.nurse');
    const medic = person('career.paramedic', 'medic');
    const [active] = activeHrNotes(bundle, nurse, ctx({ allies: [medic] }));
    expect(active?.note.id).toBe('hr.nurse-ward-round');
    expect(active?.by).toEqual([medic.c.name]);
    const trainer = person('career.personal-trainer');
    expect(ids(trainer, ctx({ allies: [person('career.chef', 'lazy-chef', 'personality.lazy')] }))).toEqual(['hr.personal-trainer-lazy-clients']);
    const temp = { ...person('career.chef', 'temp'), temp: true };
    expect(ids(person('career.programmer'), ctx({ allies: [temp] }))).toEqual(['hr.programmer-onboarding-the-temp']);
    // Agency temps carry no file of their own.
    expect(ids({ ...person('career.chef', 't2'), temp: true }, ctx({ arenaId: 'arena.diner' }))).toEqual([]);
  });

  it('scowls only at teammate-caused debuffs', () => {
    const chef = person('career.chef');
    expect(hrMood(activeHrNotes(bundle, chef, ctx({ arenaId: 'arena.diner' })))).toBeNull();
    expect(hrMood(activeHrNotes(bundle, chef, ctx({ allies: [person('career.food-critic', 'c')] })))).toBe('angry');
    expect(hrMood(activeHrNotes(bundle, person('career.marine-biologist'), ctx({ allies: [chef] })))).toBe('hurt');
  });

  it('reveals the whole file when it is opened, and new careers arrive unread', () => {
    const cc = person('career.chef');
    expect(unreadHrNotes(bundle, cc).length).toBe(2);
    readHrFile(bundle, cc);
    expect(unreadHrNotes(bundle, cc)).toEqual([]);
    cc.c.careers.push('career.firefighter');
    expect(unreadHrNotes(bundle, cc).map((n) => n.career)).toEqual(['career.firefighter', 'career.firefighter']);
  });

  it('describes conditions and effects in plain words', () => {
    const n = hrNotesOf(bundle, ['career.chef']).find((x) => x.id === 'hr.chef-one-star-review')!;
    expect(describeHrWhen(bundle, n)).toBe('With a Food Critic in the squad');
    expect(describeHrEffect(bundle, n)).toBe('−2 Confidence, starts Embarrassed (15 s)');
  });

  it('folds stats into the snapshot and fires kick-off statuses in the fight', () => {
    const chef = person('career.chef');
    const critic = person('career.food-critic', 'critic');
    const active = activeHrNotes(bundle, chef, ctx({ allies: [critic] }));
    const plain = careerSnapshot(bundle, chef);
    const snap = applyHrNotes(plain, active);
    expect(snap.stats.confidence).toBe(Math.max(1, plain.stats.confidence - 2));
    expect(snap.startStatuses).toEqual([{ status: 'status.embarrassed', durationTicks: 300 }]);
    expect(applyHrNotes(plain, [])).toBe(plain);
    const input: BattleInput = {
      schemaVersion: 1,
      contentHash: bundle.hash,
      simVersion: '0',
      seed: 'hr',
      arenaId: 'arena.office',
      mode: 'duel_3v3',
      teams: [
        { playerId: 'a', playerName: 'A', rating: 1000, characters: [snap] },
        { playerId: 'b', playerName: 'B', rating: 1000, characters: [careerSnapshot(bundle, person('career.mime', 'mime'))] },
      ],
      modifiers: [],
    };
    const b = createBattle(input, bundle);
    const me = b.world.entities.find((e) => e.team === 0 && e.kind === 'char')!;
    const them = b.world.entities.find((e) => e.team === 1 && e.kind === 'char')!;
    for (let i = 0; i < 5; i++) step(b.world);
    expect(me.statuses.some((s) => s.id === 'status.embarrassed')).toBe(true);
    expect(them.statuses.some((s) => s.id === 'status.embarrassed')).toBe(false);
  });
});
