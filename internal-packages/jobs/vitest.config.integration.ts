import { configDefaults, defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['**/*.integration.vtest.{ts,tsx}'],
    exclude: configDefaults.exclude,
    testTimeout: 45000,
    hookTimeout: 15000,
  },
});
