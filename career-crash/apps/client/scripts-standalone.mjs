/* global URL, console */
// Builds apps/client/dist-standalone/career-crash.html: the Sandbox as one self-contained file.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = new URL('./dist-standalone/assets/', import.meta.url).pathname;
const files = readdirSync(dir);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/<\/script/gi, '<\\/script');
// A full document: without the viewport meta, phones lay the page out at
// desktop width and zoom it out.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0a66c2" />
<title>Career Crash</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script type="module">${js}</script>
</body>
</html>
`;
writeFileSync(new URL('./dist-standalone/career-crash.html', import.meta.url), html);
console.log('career-crash.html', (html.length / 1024).toFixed(0), 'KB; js files', files.filter((f) => f.endsWith('.js')).length);
