import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.vtest.{ts,tsx}'],
    exclude: [
      '**/*.llm.vtest.{ts,tsx}',
      '**/*.integration.vtest.{ts,tsx}',
      '**/*.e2e.vtest.{ts,tsx}',
      '**/plugin-system-full-e2e.integration.vtest.ts',
      '**/analyzeDocument.plugin-ids.vtest.ts',
    ],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 5000,
    teardownTimeout: 1000,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 8,
        isolate: false,
      },
    },
    reporters: ['default'],
    bail: 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});