import { describe, expect, it } from 'vitest';
import { Rng } from '@cc/sim';
import { COMPANY_ADJECTIVES, COMPANY_NOUNS, COMPANY_SUFFIXES, companyLabel, isCompanyName, randomCompany } from '../src/company';

describe('company names', () => {
  it('only accepts words from the lists', () => {
    expect(isCompanyName({ adj: 'Agile', noun: 'Wombats', suffix: 'sp. z o.o.' })).toBe(true);
    expect(isCompanyName({ adj: 'Agile', noun: 'anything typed', suffix: 'Ltd' })).toBe(false);
    expect(isCompanyName({ adj: 'Agile', noun: 'Wombats' })).toBe(false);
    expect(isCompanyName(null)).toBe(false);
  });

  it('random names are valid and deterministic', () => {
    const a = randomCompany(Rng.fromSeed('x'));
    expect(isCompanyName(a)).toBe(true);
    expect(randomCompany(Rng.fromSeed('x'))).toEqual(a);
    expect(companyLabel(a)).toBe(`${a.adj} ${a.noun} ${a.suffix}`);
  });

  it('lists have no duplicates', () => {
    for (const l of [COMPANY_ADJECTIVES, COMPANY_NOUNS, COMPANY_SUFFIXES]) expect(new Set(l).size).toBe(l.length);
  });
});
