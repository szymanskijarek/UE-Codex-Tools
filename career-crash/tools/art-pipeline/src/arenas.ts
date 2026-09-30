/**
 * Arena backdrops: art/arenas/<arena>.png (full-size paintings) →
 * apps/client/src/replay/arenas/<arena>.webp.
 *
 *   pnpm --filter @cc/art-pipeline arenas
 *
 * Also converts any sprite sheet still shipped as PNG (from before the
 * pipeline wrote WebP) to lossless WebP — same pixels — and points
 * puppets.json at the new files. That part is a no-op once converted.
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { writeBackdrop } from './encode';

const ROOT = new URL('../../../', import.meta.url).pathname;
const REPLAY = join(ROOT, 'apps/client/src/replay');

const ARENAS = join(ROOT, 'art/arenas');
for (const f of readdirSync(ARENAS).filter((f) => f.endsWith('.png'))) {
  const out = join(REPLAY, 'arenas', `${basename(f, '.png')}.webp`);
  await writeBackdrop(join(ARENAS, f), out);
  console.log(`✓ ${f} → arenas/${basename(out)}`);
}
for (const f of readdirSync(join(REPLAY, 'arenas')).filter((f) => f.endsWith('.jpg'))) rmSync(join(REPLAY, 'arenas', f));

for (const dir of ['faces', 'items', 'obstacles', 'puppets']) {
  for (const f of readdirSync(join(REPLAY, dir)).filter((f) => f.endsWith('.png'))) {
    const src = join(REPLAY, dir, f);
    await sharp(src).webp({ lossless: true, effort: 6 }).toFile(src.replace(/\.png$/, '.webp'));
    rmSync(src);
    console.log(`✓ ${dir}/${f} → webp`);
  }
}
const index = join(REPLAY, 'puppets/puppets.json');
if (existsSync(index)) writeFileSync(index, readFileSync(index, 'utf8').replace(/"file": "([^"]+)\.png"/g, '"file": "$1.webp"'));
