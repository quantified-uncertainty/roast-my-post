import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';
import { config } from 'dotenv';
import path from 'path';

// Load real environment variables for model tests
config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    setupFiles: ['./src/setupModelTests.vitest.ts'],
    include: [
      'src/**/*.vtest.{ts,tsx}',
      'src/**/*.vspec.{ts,tsx}',
    ],
  },
});