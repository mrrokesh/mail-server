import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(root, '..'), '');
  const apiTarget =
    env.VITE_API_TARGET ||
    (env.API_PORT ? `http://127.0.0.1:${env.API_PORT}` : 'http://127.0.0.1:4000');

  return {
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
        '/api': apiTarget,
        '/.well-known': apiTarget,
        '/mail/config-v1.1.xml': apiTarget,
      },
    },
  };
});
