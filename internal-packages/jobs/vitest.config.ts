import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.vtest.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/*.integration.vtest.{ts,tsx}'],
    teardownTimeout: 10000,
    pool: 'forks',
    maxWorkers: 4,
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});