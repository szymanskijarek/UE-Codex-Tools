/**
 * Career story art (12, art/STORY_BRIEF.md Part A): art/story/*.png →
 * apps/client/src/career/story-art/*.webp.
 *
 *   pnpm --filter @cc/art-pipeline story
 *
 * Cards (opaque scenes shown in posts and threads) are lossy WebP at 960 px
 * wide; badges and stickers (transparent) keep their alpha at 256 px.
 */
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SRC = join(ROOT, 'art/story');
const OUT = join(ROOT, 'apps/client/src/career/story-art');
/** Opaque scenes; everything else (stickers, badges) keeps its transparency. */
const CARDS = new Set(['feed-empty', 'intro-card', 'farewell-card', 'offer-letter', 'rugpull-card']);

for (const f of readdirSync(SRC).filter((f) => f.endsWith('.png')).sort()) {
  const name = basename(f, '.png');
  const img = sharp(join(SRC, f));
  const out = join(OUT, `${name}.webp`);
  if (CARDS.has(name)) await img.resize({ width: 960, withoutEnlargement: true }).webp({ quality: 70, effort: 6 }).toFile(out);
  else await img.resize({ width: 256, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 90, effort: 6 }).toFile(out);
  console.log(`✓ ${f} → story-art/${name}.webp`);
}
