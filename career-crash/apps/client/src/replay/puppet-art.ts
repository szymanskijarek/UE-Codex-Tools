import manifest from './puppets/puppets.json';

/** Sliced career art (tools/art-pipeline puppets): atlas URL + part rectangles/anchors. No Pixi here, so UI can use it. */
export interface PartDef {
  x: number;
  y: number;
  w: number;
  h: number;
  a: [number, number];
  b: [number, number];
}
export interface PuppetDef {
  file: string;
  w: number;
  h: number;
  parts: Record<string, PartDef>;
}

export const PUPPET_DEFS = manifest as unknown as Record<string, PuppetDef>;
const URLS = import.meta.glob('./puppets/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function puppetUrl(career: string): string | null {
  const def = PUPPET_DEFS[career];
  return (def && URLS[`./puppets/${def.file}`]) ?? null;
}
