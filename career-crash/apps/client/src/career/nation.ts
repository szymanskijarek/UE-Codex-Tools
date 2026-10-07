import { bundle } from '@cc/content';
import { nationalityKeys, statLabel, type NationalBoost } from '@cc/game-rules';
import type { StatKey } from '@cc/content-schema';
import { nameOf } from '../i18n';
import { countryName } from './feed';

/** The UK's nations as emoji tag sequences; everyone else from their ISO code. */
const TAG_FLAGS: Record<string, string> = { ENG: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', SCO: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', WAL: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}' };

/** A country's flag as an emoji (no images, so the single-file build stays small). */
export function flagEmoji(key: string): string {
  if (TAG_FLAGS[key]) return TAG_FLAGS[key]!;
  return key.length === 2 ? String.fromCodePoint(...[...key.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
}

/** Every country a career character can be from, by name. */
export const NATIONS = nationalityKeys(bundle)
  .map((key) => ({ key, name: countryName(key) }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** "#2 at the Summit last hour (31 likes)". */
export function standingText(b: NationalBoost): string {
  return `#${b.rank} at the Summit last hour (${b.likes} like${b.likes === 1 ? '' : 's'})`;
}

/** The boost in words, from the data: "+2 Confidence, +1 Charisma, pumped at kick-off". */
export function boostText(tier: NationalBoost['tier']): string {
  const parts = Object.entries(tier.stats).map(([k, n]) => `${(n ?? 0) > 0 ? '+' : ''}${n} ${statLabel(k as StatKey)}`);
  if (tier.status) parts.push(`${nameOf(tier.status.status).toLowerCase()} for ${Math.round(tier.status.durationTicks / 20)} s at kick-off`);
  return parts.join(', ');
}
