import type { Episode } from './episode';

/** Every week's script (episodes/*.json), newest first. */
const files = import.meta.glob('./episodes/*.json', { eager: true, import: 'default' }) as Record<string, Episode>;

export const EPISODES: Episode[] = Object.values(files).sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : a.id < b.id ? 1 : -1));

/** The ones on air (`active` isn't `false`), newest first: the picker, the default and the feed ads. */
export const ON_AIR: Episode[] = EPISODES.filter((e) => e.active !== false);

/** `?ep=<id>` picks any episode, on air or not; otherwise this week's (the newest on air). */
export function pickEpisode(search = window.location.search): Episode {
  const want = new URLSearchParams(search).get('ep');
  return EPISODES.find((e) => e.id === want) ?? ON_AIR[0] ?? EPISODES[0]!;
}
