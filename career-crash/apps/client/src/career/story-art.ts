/**
 * Career story art (12; brief: art/STORY_BRIEF.md): cards for the feed and
 * Messaging, the temp markers and connection badges. Each piece is optional:
 * until it's imported (`pnpm --filter @cc/art-pipeline story`) the UI falls
 * back to emoji.
 */
const URLS = import.meta.glob('./story-art/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export type StoryArt = 'feed-empty' | 'intro-card' | 'farewell-card' | 'offer-letter' | 'rugpull-card' | 'temp-sticker' | 'temp-lanyard' | 'badge-1' | 'badge-2' | 'badge-3' | 'badge-4';

export function storyArt(name: StoryArt): string | undefined {
  return URLS[`./story-art/${name}.webp`];
}
