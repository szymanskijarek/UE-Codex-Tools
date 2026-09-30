import type { ContentBundle } from '@cc/content-schema';
import type { Rng } from '@cc/sim';

/**
 * Player-built character names: optional titles before the name, a first and a
 * last name, optional titles after it ("Dr Prof. Andrew White, MBA, Dog Dad").
 * Every part comes from content/data/names.json, so names need no moderation.
 */
export interface NameParts {
  pre: string[];
  first: string;
  last: string;
  post: string[];
}

export const MAX_NAME_PREFIXES = 3;
export const MAX_NAME_SUFFIXES = 3;

export function formatName(n: NameParts): string {
  return [[...n.pre, n.first, n.last].join(' '), ...n.post].join(', ');
}

export function isNameParts(bundle: ContentBundle, n: unknown): n is NameParts {
  if (!n || typeof n !== 'object') return false;
  const x = n as Partial<NameParts>;
  const { first, last, prefixes, suffixes } = bundle.names;
  const all = (l: unknown, from: string[], max: number) =>
    Array.isArray(l) && l.length <= max && new Set(l).size === l.length && l.every((w) => from.includes(w as string));
  return (
    first.includes(x.first as string) &&
    last.includes(x.last as string) &&
    all(x.pre, prefixes, MAX_NAME_PREFIXES) &&
    all(x.post, suffixes, MAX_NAME_SUFFIXES)
  );
}

/** Just the first name, for tight spots (arena labels, "Pack it for …"): skips titles before it. */
export function shortName(bundle: ContentBundle, name: string): string {
  let rest = name.split(',')[0]!.trim();
  for (let again = true; again; ) {
    again = false;
    for (const p of bundle.names.prefixes) {
      if (rest.startsWith(`${p} `)) {
        rest = rest.slice(p.length + 1);
        again = true;
      }
    }
  }
  return rest.split(' ')[0] || name;
}

/** A plain random name; titles are sprinkled in only when `titles` is set (the picker's 🎲). */
export function randomNameParts(bundle: ContentBundle, rng: Rng, titles = false): NameParts {
  const { first, last, prefixes, suffixes } = bundle.names;
  const some = (from: string[], max: number) => {
    const out: string[] = [];
    for (let n = rng.int(max + 1); n > 0; n--) {
      const w = rng.pick(from);
      if (!out.includes(w)) out.push(w);
    }
    return out;
  };
  return {
    pre: titles && rng.int(2) ? some(prefixes, 2) : [],
    first: rng.pick(first),
    last: rng.pick(last),
    post: titles ? some(suffixes, 2) : [],
  };
}

/** Name parts for an older character whose name was a plain "First Last" from the lists (null otherwise). */
export function partsFromName(bundle: ContentBundle, name: string): NameParts | null {
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  return bundle.names.first.includes(first!) && bundle.names.last.includes(last) ? { pre: [], first: first!, last, post: [] } : null;
}
