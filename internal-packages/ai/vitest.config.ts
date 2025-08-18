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
      '**/*.e2e.vtest.{ts,tsx}'
    ],  // Exclude LLM, integration, and e2e tests by default
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 30000,
    teardownTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: false,  // Disable isolation for speed
        maxForks: 2,  // Reduce to 2 forks max
      },
    },
    maxConcurrency: 5,  // Limit concurrent tests per worker
    reporters: ['default'],
    bail: 0,  // Don't stop on first failure
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});