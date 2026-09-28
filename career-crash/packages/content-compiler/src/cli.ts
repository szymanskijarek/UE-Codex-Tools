import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from './index';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const { bundle, errors } = compileContent(join(root, 'data'));
if (!bundle) {
  console.error(`Content build failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const out = join(root, 'dist');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'bundle.json'), JSON.stringify(bundle));
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ contentHash: bundle.hash, careers: bundle.careers.length, props: bundle.props.length, rules: bundle.rules.length }, null, 2));
console.log(
  `Content OK: hash ${bundle.hash} — ${bundle.careers.length} careers, ${bundle.abilities.length} abilities, ${bundle.props.length} props, ` +
    `${bundle.rules.length} rules, ${bundle.arenas.length} arenas, ${bundle.masteries.length} masteries`,
);
