import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { createBattle, simulate } from '../src/simulate';
import { disarm, DROPPED_WEAPON, startChoke, takeWeapon } from '../src/systems/weapons';
import { spawnProp, SHOVE } from '../src/world';
import { battleInput, char } from './fixtures';

const team = (p: string, careers: string[]) => ({ playerId: p, playerName: p, rating: 1000, characters: careers.map((c, i) => char(`${p}${i}`, [c], 'personality.aggressive', { held: bundle.careers.find((x) => x.id === c)?.art.heldItem ?? null })) });

function duel() {
  const b = createBattle(battleInput(bundle, 'weapons', [team('A', ['career.chef']), team('B', ['career.builder'])], 'arena.construction'), bundle);
  const [a, z] = b.world.entities.filter((e) => e.kind === 'char');
  return { b, a: a!, z: z! };
}

describe('weapons, disarms and choke holds', () => {
  it('a disarmed fighter drops their weapon, fights bare-handed, and anyone can pick it up', () => {
    const { b, a, z } = duel();
    const weapon = a.weapon;
    expect(weapon).not.toBe('');
    disarm(b.world, a, z.x, z.y, -1);
    expect(a.weapon).toBe('');
    expect(a.attack).toEqual(SHOVE);
    const dropped = b.world.entities.find((e) => e.def === DROPPED_WEAPON && !e.removed)!;
    expect(dropped.weapon).toBe(weapon);
    // The enemy (after losing their own) can use it.
    disarm(b.world, z, a.x, a.y, -1);
    expect(takeWeapon(b.world, z, dropped)).toBe(true);
    expect(z.weapon).toBe(weapon);
    expect(z.attack).toEqual(bundle.equipment.find((x) => x.id === weapon)!.attack);
  });

  it('heavy weapons need empty hands, hit hard and break after their swings', () => {
    const { b, a } = duel();
    const hammer = spawnProp(b.world, 'prop.sledgehammer', a.x + 300, a.y)!;
    expect(takeWeapon(b.world, a, hammer)).toBe(true);
    expect(a.heldId).toBe(-1); // still holding their career weapon
    disarm(b.world, a, a.x - 100, a.y, -1);
    takeWeapon(b.world, a, hammer);
    expect(a.heldId).toBe(hammer.id);
    const def = bundle.props.find((p) => p.id === 'prop.sledgehammer')!;
    expect(a.attack).toEqual(def.heavy!.attack);
    expect(a.attack.knockbackMm).toBeGreaterThan(4000);
  });

  it('a choke hold locks both fighters and hurts the victim until released', () => {
    const { b, a, z } = duel();
    z.x = a.x + 500;
    z.y = a.y;
    disarm(b.world, a, z.x, z.y, -1);
    const hp = z.hp;
    startChoke(b.world, a, z, -1);
    expect(z.statuses.some((s) => s.id === 'status.choked')).toBe(true);
    expect(a.statuses.some((s) => s.id === 'status.choking')).toBe(true);
    for (let i = 0; i < 12; i++) b.step();
    expect(z.hp).toBeLessThan(hp);
  });

  it('battles use disarms, chokes and heavy weapons', () => {
    let disarms = 0;
    let chokes = 0;
    let heavy = 0;
    for (let i = 0; i < 12; i++) {
      const out = simulate(battleInput(bundle, `wx${i}`, [team('A', ['career.chef', 'career.builder', 'career.dj']), team('B', ['career.teacher', 'career.farmer', 'career.lawyer'])], 'arena.construction'), bundle);
      disarms += out.events.filter((e) => e.type === 'disarm').length;
      chokes += out.events.filter((e) => e.type === 'choke').length;
      heavy += out.events.filter((e) => e.type === 'pickUp' && e.v === 2).length;
    }
    expect(disarms).toBeGreaterThan(0);
    expect(chokes).toBeGreaterThan(0);
    expect(heavy).toBeGreaterThan(0);
  });
});
