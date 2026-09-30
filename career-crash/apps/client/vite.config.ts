import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

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
      : { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
