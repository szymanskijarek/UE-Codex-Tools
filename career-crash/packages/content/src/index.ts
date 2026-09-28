import type { ContentBundle } from '@cc/content-schema';
import raw from '../dist/bundle.json';

/** The compiled content bundle. Run `pnpm content:build` to regenerate. */
export const bundle = raw as unknown as ContentBundle;
