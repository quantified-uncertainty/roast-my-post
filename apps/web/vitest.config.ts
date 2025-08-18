import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    typecheck: {
      enabled: false, // Disable built-in typecheck to avoid conflicts
    },
    setupFiles: ['./src/setupTests.vitest.ts'],
    server: {
      deps: {
        inline: [
          'next-auth',
          'next-auth/providers/resend',
          '@auth/prisma-adapter',
          'server-only'
        ]
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.vitest.ts',
        '**/*.config.ts',
        '**/*.config.js',
      ],
    },
    include: [
      'src/**/*.vtest.{ts,tsx}',
      'src/**/*.vspec.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      '**/*.e2e.test.{ts,tsx}',
      '**/tests/playwright/**',
    ],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // @roast/ai subpaths - must come before the main @roast/ai
      { find: '@roast/ai/text-location/line-based', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/text-location/line-based/index.ts') },
      { find: '@roast/ai/tools/fuzzy-text-locator/core', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/tools/fuzzy-text-locator/core.ts') },
      { find: '@roast/ai/analysis-plugins/utils/textHelpers', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/analysis-plugins/utils/textHelpers.ts') },
      { find: '@roast/ai/analysis-plugins/types/plugin-types', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/analysis-plugins/types/plugin-types.ts') },
      { find: '@roast/ai/server', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/server.ts') },
      { find: '@roast/ai/tools/all-tools', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/tools/all-tools.ts') },
      // Main package paths
      { find: '@roast/ai', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/index.ts') },
      { find: '@roast/db', replacement: path.resolve(__dirname, '../../internal-packages/db/src/index.ts') },
      { find: '@roast/domain', replacement: path.resolve(__dirname, '../../internal-packages/domain/src/index.ts') },
      // Mock paths
      { find: 'server-only', replacement: path.resolve(__dirname, './src/__mocks__/server-only.js') },
      { find: 'next-auth', replacement: path.resolve(__dirname, './src/__mocks__/next-auth.js') },
      { find: 'next-auth/providers/resend', replacement: path.resolve(__dirname, './src/__mocks__/next-auth/providers/resend.js') },
      { find: '@auth/prisma-adapter', replacement: path.resolve(__dirname, './src/__mocks__/@auth/prisma-adapter.js') },
      { find: 'next/font/google', replacement: path.resolve(__dirname, './src/__mocks__/next/font/google.js') },
    ],
  },
});