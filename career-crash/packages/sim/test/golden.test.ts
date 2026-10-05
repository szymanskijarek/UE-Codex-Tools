import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@cc/content';
import { describe, expect, it } from 'vitest';
import { simulate } from '../src/simulate';
import { SIM_VERSION, type BattleInput } from '../src/types';

interface GoldenFile {
  simVersion: string;
  contentHash: string;
  cases: { name: string; input: BattleInput; resultHash: string; hashes: string[] }[];
}

const golden = JSON.parse(readFileSync(join(__dirname, 'golden', 'goldens.json'), 'utf8')) as GoldenFile;

/**
 * Golden replays (01 §4.3, §7). If this fails, the simulation or content changed
 * behaviour. Run `pnpm replay golden` to see which battles diverged, then
 * `pnpm golden:update` — and bump SIM_VERSION if sim code changed.
 */
describe('golden replays', () => {
  it('were generated for the current content and sim version', () => {
    expect(golden.contentHash, 'content changed: run `pnpm golden:update`').toBe(bundle.hash);
    expect(golden.simVersion, 'SIM_VERSION changed: run `pnpm golden:update`').toBe(SIM_VERSION);
  });

  for (const c of golden.cases) {
    it(c.name, () => {
      const out = simulate(c.input, bundle);
      expect(out.hashes).toEqual(c.hashes);
      expect(out.resultHash).toBe(c.resultHash);
    });
  }
});
