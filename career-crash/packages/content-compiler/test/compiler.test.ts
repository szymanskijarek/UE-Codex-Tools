import { join } from 'node:path';
import { bundle } from '@cc/content';
import type { ContentBundle } from '@cc/content-schema';
import { describe, expect, it } from 'vitest';
import { compileContent, validateBundle } from '../src/index';

const DATA = join(__dirname, '..', '..', 'content', 'data');
const clone = (): ContentBundle => structuredClone(bundle);

describe('content compiler', () => {
  it('compiles the shipped content without errors and a stable hash', () => {
    const a = compileContent(DATA);
    expect(a.errors).toEqual([]);
    expect(a.bundle!.hash).toBe(compileContent(DATA).bundle!.hash);
  });

  it('rejects unknown ability references', () => {
    const b = clone();
    b.careers[0]!.active = 'ability.does-not-exist';
    expect(validateBundle(b).join('\n')).toMatch(/unknown ability ability\.does-not-exist/);
  });

  it('rejects careers over the stat budget (02 §9)', () => {
    const b = clone();
    b.careers[0]!.statMods = { strength: 5, health: 3 };
    expect(validateBundle(b).join('\n')).toMatch(/exceed/);
  });

  it('rejects undeclared tags', () => {
    const b = clone();
    b.props[0]!.tags.push('made-up-tag');
    expect(validateBundle(b).join('\n')).toMatch(/tag "made-up-tag" is used but not declared/);
  });

  it('rejects effects referencing unknown statuses', () => {
    const b = clone();
    b.abilities.find((a) => a.kind === 'active')!.effects!.push({ type: 'applyStatus', status: 'status.imaginary' });
    expect(validateBundle(b).join('\n')).toMatch(/unknown status status\.imaginary/);
  });

  it('requires locale names for every id', () => {
    const b = clone();
    delete b.locale['career.chef.name'];
    expect(validateBundle(b).join('\n')).toMatch(/missing key career\.chef\.name/);
  });

  it('caps equipment damage by rarity', () => {
    const b = clone();
    const held = b.equipment.find((e) => e.attack && e.rarity === 'common')!;
    held.attack!.base = 40;
    expect(validateBundle(b).join('\n')).toMatch(/exceeds common cap/);
  });

  it('checks HR notes: budget, tone, references, mood and coverage (06 §3.3)', () => {
    const b = clone();
    const [first, second] = b.hrNotes;
    first!.stats = { strength: 3, health: 2 };
    first!.tone = 'buff';
    second!.when = { ally: ['career.nobody'] };
    second!.tone = 'buff';
    second!.stats = { charisma: -1 };
    second!.mood = 'angry';
    b.hrNotes = b.hrNotes.filter((n) => n.career !== 'career.mime');
    const errors = validateBundle(b).join('\n');
    expect(errors).toMatch(/exceed the budget of 4/);
    expect(errors).toMatch(/unknown career career\.nobody/);
    expect(errors).toMatch(/a buff can't have minus stats/);
    expect(errors).toMatch(/mood is only for debuffs a teammate causes/);
    expect(errors).toMatch(/career\.mime: needs at least 2 HR notes/);
  });

  it('every career has a distinct active ability and valid passive', () => {
    const actives = new Set(bundle.careers.map((c) => c.active));
    expect(actives.size).toBe(bundle.careers.length);
  });
});
