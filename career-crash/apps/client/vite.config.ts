import preact from '@preact/preset-vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  build:
    // VITE_INLINE: everything in one file (the single-file build). VITE_STANDALONE alone is the
    // offline game (career mode + Sandbox) as a normal multi-file site, as served on careercrash.org.
    process.env.VITE_INLINE === '1'
      ? { target: 'es2022', outDir: 'dist-standalone', assetsInlineLimit: 100_000_000, cssCodeSplit: false, chunkSizeWarningLimit: 5000, rollupOptions: { output: { inlineDynamicImports: true } } }
      : // careercrash.org/cryptobro (08), /incident (09) and /news (10) are more pages of the same site.
        { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { input: { index: resolve(root, 'index.html'), cryptobro: resolve(root, 'cryptobro/index.html'), incident: resolve(root, 'incident/index.html'), news: resolve(root, 'news/index.html') } } },
});
