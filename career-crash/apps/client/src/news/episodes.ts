import type { Episode } from './episode';

/** Every week's script (episodes/*.json), newest first. */
const files = import.meta.glob('./episodes/*.json', { eager: true, import: 'default' }) as Record<string, Episode>;

export const EPISODES: Episode[] = Object.values(files).sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : a.id < b.id ? 1 : -1));

/** `?ep=<id>` picks an episode; otherwise this week's (the newest). */
export function pickEpisode(search = window.location.search): Episode {
  const want = new URLSearchParams(search).get('ep');
  return EPISODES.find((e) => e.id === want) ?? EPISODES[0]!;
}
