import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  build: { outDir: process.env.VITE_BUILD_DIR || 'dist' },
});
