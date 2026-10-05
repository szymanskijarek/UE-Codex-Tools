/**
 * Shared output encoders for the client's art.
 *
 * Sprite sheets are quantised to a palette exactly as before (that's where
 * most of the saving is), then stored as lossless WebP, which keeps those
 * pixels and is ~10% smaller than the palette PNG. Painted backdrops are lossy
 * WebP. Everything is inlined into the standalone build as base64, so every
 * byte here costs 4/3 of a byte there.
 */
import sharp, { type Sharp } from 'sharp';

export async function writeSheet(img: Sharp, path: string, opts: { dither?: number } = {}): Promise<void> {
  const png = await img.png({ compressionLevel: 9, palette: true, quality: 95, effort: 10, ...opts }).toBuffer();
  await sharp(png).webp({ lossless: true, effort: 6 }).toFile(path);
}

/** Painted arena backdrops: 1536 px wide, lossy at quality 70 (fighters are drawn on top; 80 cost ~25% more for no visible gain). */
export const BACKDROP_WIDTH = 1536;
export async function writeBackdrop(src: string, path: string): Promise<void> {
  await sharp(src).resize({ width: BACKDROP_WIDTH, withoutEnlargement: true }).webp({ quality: 70, effort: 6 }).toFile(path);
}
