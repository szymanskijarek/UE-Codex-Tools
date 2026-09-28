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

  it('every career has a distinct active ability and valid passive', () => {
    const actives = new Set(bundle.careers.map((c) => c.active));
    expect(actives.size).toBe(bundle.careers.length);
  });
});
