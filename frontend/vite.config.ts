import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(root, 'src'),
      },
      {
        find: '@mrrokesh/shared/tokens.css',
        replacement: path.resolve(root, '../packages/shared/src/tokens/tokens.css'),
      },
      {
        find: '@mrrokesh/shared',
        replacement: path.resolve(root, '../packages/shared/src/index.ts'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: {
      allow: [path.resolve(root, '..')],
    },
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
