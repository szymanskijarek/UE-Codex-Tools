// Bundles solo mode into one self-contained HTML file (no server, no imports):
//   node scripts/build-standalone.mjs [out.html]      (default: dist/fine-print.html)
// Open it straight from disk, host it anywhere, or send it to your phone.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(ROOT, 'dist', 'fine-print.html');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Dependency order: each module may only import from ones above it.
const MODULES = ['shared/content.js', 'shared/sim.js', 'client/audio.js', 'client/render.js', 'client/main.js'];

function wrapModule(path) {
  const name = basename(path, '.js');
  let src = read(path);
  const exports = [...src.matchAll(/^export (?:const|let|function|class) (\w+)/gm)].map((m) => m[1]);
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*'([^']+)';/gm, (_, names, from) => `const {${names}} = __mods['${basename(from, '.js')}'];`);
  if (/^import /m.test(src)) throw new Error(`${path}: unsupported import form`);
  src = src.replace(/^export (const|let|function|class) /gm, '$1 ');
  return `__mods['${name}'] = (() => {\n${src}\nreturn { ${exports.join(', ')} };\n})();\n`;
}

const html = read('index.html');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[^>]*src="client\/main\.js"[^>]*><\/script>/, '');
const title = html.match(/<title>(.*?)<\/title>/)[1];
const css = read('client/style.css') + `
/* standalone: single dark look; keep the HUD clear of notches and home bars */
:root { color-scheme: dark; background: var(--ink); }
body { background: var(--ink); }
#hud, #touch { inset: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px) 0; }
`;
const js = `'use strict';\nwindow.FP_STANDALONE = true;\nconst __mods = {};\n${MODULES.map(wrapModule).join('\n')}`;

const page = `<title>${title}</title>
<style>
${css}
</style>
${body.trim()}
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024).toFixed(0)} KB)`);
