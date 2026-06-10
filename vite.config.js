import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  root: 'apps/electron/renderer',
  base: './',
  build: {
    outDir: '../../../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5190,
    strictPort: true,
    fs: {
      // workspaces のソース(.ts)を dev で直接読めるようモノレポルートを許可
      allow: [path.resolve(__dirname)],
    },
  },
  resolve: {
    alias: {
      '@marginalia/ui-react': path.resolve(__dirname, './packages/ui-react/src/index.ts'),
      '@marginalia/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
      '@marginalia/ports': path.resolve(__dirname, './packages/ports/src/index.ts'),
    },
  },
});
