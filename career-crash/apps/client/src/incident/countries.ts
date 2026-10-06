import { bundle } from '@cc/content';
import { countriesDef, countryInfo, countryKeys } from '@cc/game-rules';

/** The countries floor (09) and helpers for the page: names in the viewer's language, flags, colours. */
export const DEF = countriesDef(bundle);
export const KEYS = countryKeys(DEF);

const FLAGS = import.meta.glob('./flags/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** The UK's nations have no ISO code of their own, so their names are fixed. */
const OWN_NAMES: Record<string, string> = { ENG: 'England', SCO: 'Scotland', WAL: 'Wales' };

const display = (() => {
  try {
    return new Intl.DisplayNames([navigator.language, 'en'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** A country's name in the viewer's own language (09 §8.8). */
export function countryName(key: string): string {
  if (OWN_NAMES[key]) return OWN_NAMES[key]!;
  try {
    return display?.of(key) ?? key;
  } catch {
    return key;
  }
}

export function flagUrl(key: string): string {
  const f = DEF.cast[key]?.flag ?? '';
  return FLAGS[`./flags/${f}.svg`] ?? '';
}

export const info = (key: string) => countryInfo(DEF, key);

/** The viewer's own country, guessed from their browser language only (no location lookup): `en-GB` → England. */
export function guessHome(): string | null {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const region = l.split('-')[1]?.toUpperCase();
    if (!region) continue;
    if (region === 'GB') return 'ENG';
    if (DEF.cast[region]) return region;
  }
  return null;
}

/** Find countries by name in the viewer's language, or by code. */
export function search(q: string): string[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return KEYS.filter((k) => countryName(k).toLowerCase().includes(s) || k.toLowerCase() === s || info(k).name.toLowerCase().includes(s)).slice(0, 8);
}
