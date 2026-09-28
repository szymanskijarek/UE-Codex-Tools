/* global URL, console */
// Builds apps/client/dist-standalone/career-crash.html: the Sandbox as one self-contained file.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = new URL('./dist-standalone/assets/', import.meta.url).pathname;
const files = readdirSync(dir);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/<\/script/gi, '<\\/script');
const html = `<title>Career Crash</title>
<style>${css}</style>
<div id="app"></div>
<script type="module">${js}</script>
`;
writeFileSync(new URL('./dist-standalone/career-crash.html', import.meta.url), html);
console.log('career-crash.html', (html.length / 1024).toFixed(0), 'KB; js files', files.filter((f) => f.endsWith('.js')).length);
