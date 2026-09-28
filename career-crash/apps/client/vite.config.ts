import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  build:
    process.env.VITE_STANDALONE === '1'
      ? { target: 'es2022', outDir: 'dist-standalone', assetsInlineLimit: 100_000_000, cssCodeSplit: false, chunkSizeWarningLimit: 5000, rollupOptions: { output: { inlineDynamicImports: true } } }
      : { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
