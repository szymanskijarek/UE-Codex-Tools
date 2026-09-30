import type { Rng } from '@cc/sim';

/**
 * Player company names are picked from these lists, never typed, so every name
 * other players could see is one we wrote. Store the words (not indexes) so the
 * lists can be reordered or extended; `isCompanyName` validates a stored name.
 */
export const COMPANY_ADJECTIVES = [
  'Synergy', 'Agile', 'Disruptive', 'Quarterly', 'Proactive', 'Holistic', 'Scalable', 'Bespoke',
  'Premium', 'Budget', 'Lean', 'Legacy', 'Global', 'Local', 'Strategic', 'Unpaid',
  'Overcaffeinated', 'Mandatory', 'Hybrid', 'Cloud', 'Organic', 'Artisanal', 'Turbo', 'Mega',
  'Discount', 'Reliable', 'Questionable', 'Emergency', 'Midweek', 'Weekend', 'Nocturnal', 'Visionary',
  'Sustainable', 'Innovative', 'Pivoting', 'Frictionless', 'Fully Remote', 'Open-Plan', 'Seasonal', 'Heritage',
] as const;

export const COMPANY_NOUNS = [
  'Llamas', 'Solutions', 'Dynamics', 'Synergies', 'Paperclips', 'Staplers', 'Spreadsheets', 'Pigeons',
  'Badgers', 'Toasters', 'Lanyards', 'Stakeholders', 'Deliverables', 'Interns', 'Muffins', 'Forklifts',
  'Traffic Cones', 'Rubber Ducks', 'Filing Cabinets', 'Photocopiers', 'Coffee Beans', 'Pixels', 'Hamsters', 'Clipboards',
  'Mops', 'Buckets', 'Sandwiches', 'Pencils', 'Biscuits', 'Gazebos', 'Wombats', 'Donkeys',
  'Meatballs', 'Pretzels', 'Kettles', 'Trolleys', 'Ferrets', 'Walruses', 'Crumpets', 'Umbrellas',
] as const;

export const COMPANY_SUFFIXES = [
  'Ltd', 'LLC', 'Inc.', 'GmbH', 'sp. z o.o.', 'S.A.', 'Plc', '& Partners',
  'Ventures', 'Enterprises', 'Holdings', 'Group', 'Consulting', 'International', 'Co.', '& Sons',
  'Collective', 'Labs', 'Worldwide', '(Pty) Ltd', 'AG', 'S.r.l.', 'B.V.', 'Oy', 'AB',
] as const;

export interface CompanyName {
  adj: string;
  noun: string;
  suffix: string;
}

export function companyLabel(c: CompanyName): string {
  return `${c.adj} ${c.noun} ${c.suffix}`;
}

export function isCompanyName(c: unknown): c is CompanyName {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  return (
    (COMPANY_ADJECTIVES as readonly unknown[]).includes(x.adj) &&
    (COMPANY_NOUNS as readonly unknown[]).includes(x.noun) &&
    (COMPANY_SUFFIXES as readonly unknown[]).includes(x.suffix)
  );
}

export function randomCompany(rng: Rng): CompanyName {
  return { adj: rng.pick(COMPANY_ADJECTIVES), noun: rng.pick(COMPANY_NOUNS), suffix: rng.pick(COMPANY_SUFFIXES) };
}
