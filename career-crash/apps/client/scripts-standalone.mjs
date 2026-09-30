/* global URL, console */
// Builds the standalone game (career mode + Sandbox, offline) as one self-contained page:
// apps/client/dist-standalone/career-crash.html and career-crash.artifact.html.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = new URL('./dist-standalone/assets/', import.meta.url).pathname;
const files = readdirSync(dir);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/<\/script/gi, '<\\/script');
// Shared by both outputs.
const head = `<title>Career Crash</title>
<style>${css}</style>
`;
const body = `<div id="app"></div>
<script type="module">${js}</script>
`;
// career-crash.html: a full document to open as a file. Without the viewport
// meta, phones lay the page out at desktop width and zoom it out.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0a66c2" />
${head}</head>
<body>
${body}</body>
</html>
`;
// career-crash.artifact.html: the same page as a fragment for publishing as a
// claude.ai Artifact, whose host wraps it in its own document (charset,
// viewport) and serves it under a strict CSP — everything is inline.
writeFileSync(new URL('./dist-standalone/career-crash.html', import.meta.url), html);
writeFileSync(new URL('./dist-standalone/career-crash.artifact.html', import.meta.url), head + body);
console.log('career-crash.html', (html.length / 1024).toFixed(0), 'KB; js files', files.filter((f) => f.endsWith('.js')).length);
