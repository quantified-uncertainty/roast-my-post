import { defineConfig } from 'vitest/config';
import path from 'path';

// Configuration for integration tests
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.integration.vtest.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 60000,  // 1 minute for integration tests
    teardownTimeout: 10000,
    pool: 'forks',
    maxWorkers: 2,
    isolate: false,
    maxConcurrency: 3,  // Limit concurrent tests
    reporters: ['default'],
    bail: 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});