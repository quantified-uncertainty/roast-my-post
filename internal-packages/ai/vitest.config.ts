import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.vtest.{ts,tsx}'],
    exclude: ['**/*.llm.vtest.{ts,tsx}'],  // Exclude LLM tests by default
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 30000,
    teardownTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        maxForks: 4,
      },
    },
    reporters: ['default'],
    bail: 0,  // Don't stop on first failure
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});