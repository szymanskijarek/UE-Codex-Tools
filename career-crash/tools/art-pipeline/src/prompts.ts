/**
 * Template-driven art prompts (04 A-3): one prompt per paper-doll part per career,
 * prop and item, all sharing the style preamble so outputs stay consistent.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@cc/content';

const STYLE =
  'Stylised 2D game art, big-headed cartoon proportions, thick dark outline (#1b1f2a), flat bright colours with a single soft shadow tone, ' +
  'lit from top-left, 3/4 view facing right, transparent background, no text, consistent with a modular paper-doll rig.';

const name = (id: string): string => bundle.locale[`${id}.name`] ?? id;

interface Prompt {
  id: string;
  kind: 'hat' | 'upper' | 'held' | 'accessory' | 'prop';
  size: [number, number];
  prompt: string;
}

const prompts: Prompt[] = [];
for (const c of bundle.careers) {
  const career = name(c.id);
  prompts.push({ id: `art.${c.id}.hat`, kind: 'hat', size: [128, 96], prompt: `${STYLE} Headwear only for a ${career}. Main colour ${c.art.hat ?? c.art.color}. Everyday modern workwear, slightly exaggerated.` });
  prompts.push({ id: `art.${c.id}.upper`, kind: 'upper', size: [128, 128], prompt: `${STYLE} Upper-body outfit only (no head, no arms beyond sleeves) for a ${career}. Main colour ${c.art.color}. Recognisable at 48 px.` });
}
for (const e of bundle.equipment) {
  prompts.push({ id: `art.${e.id}`, kind: e.slot === 'held' ? 'held' : 'accessory', size: e.slot === 'held' ? [96, 96] : [64, 64], prompt: `${STYLE} A single ${name(e.id).toLowerCase()} as a ${e.slot === 'held' ? 'hand-held item' : 'wearable accessory'}. Everyday object, comedic but realistic.` });
}
for (const p of bundle.props) {
  const area = p.art.shape === 'area';
  prompts.push({
    id: `art.${p.id}`,
    kind: 'prop',
    size: area ? [256, 256] : [Math.max(48, Math.round((p.radiusMm * 2) / 10)), Math.max(48, Math.round((p.radiusMm * 2) / 10))],
    prompt: area
      ? `${STYLE} Top-down tiling blob of ${name(p.id).toLowerCase()} on a floor, semi-transparent, soft edges, colour ${p.art.color}.`
      : `${STYLE} A ${name(p.id).toLowerCase()} as a game prop, colour ${p.art.color}, sitting on the floor.`,
  });
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'prompts.json'), JSON.stringify({ contentHash: bundle.hash, style: STYLE, prompts }, null, 2));
console.log(`Wrote ${prompts.length} prompts to tools/art-pipeline/out/prompts.json`);
