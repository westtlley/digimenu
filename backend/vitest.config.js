import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Carregar env ANTES de testDb.js
    setupFiles: ['./tests/setup/loadTestEnv.js', './tests/setup/testDb.js'],
    testTimeout: 30000,
    fileParallelism: false,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
