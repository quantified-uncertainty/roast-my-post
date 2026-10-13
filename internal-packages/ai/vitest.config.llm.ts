import { defineConfig } from 'vitest/config';
import path from 'path';

// Special configuration for LLM tests that require API calls
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.llm.vtest.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 120000,  // 2 minutes for LLM API calls
    teardownTimeout: 10000,
    pool: 'forks',
    maxWorkers: 1,
    isolate: true,
    fileParallelism: false,
    reporters: ['default'],
    bail: 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});