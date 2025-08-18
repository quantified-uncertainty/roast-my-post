import { defineConfig } from 'vitest/config';
import path from 'path';

// Configuration for E2E tests
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.e2e.vtest.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 120000,  // 2 minutes for E2E tests
    teardownTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Run E2E tests sequentially
        isolate: true,
        maxForks: 1,
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