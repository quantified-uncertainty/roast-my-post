import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/setupTests.vitest.ts'],
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
      { find: '@roast/ai/text-location/line-based', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/text-location/line-based/index.ts') },
      { find: '@roast/ai', replacement: path.resolve(__dirname, '../../internal-packages/ai/src/index.ts') },
      { find: '@roast/db', replacement: path.resolve(__dirname, '../../internal-packages/db/src/index.ts') },
      { find: '@roast/domain', replacement: path.resolve(__dirname, '../../internal-packages/domain/src/index.ts') },
      { find: 'server-only', replacement: path.resolve(__dirname, './src/__mocks__/server-only.js') },
      { find: 'next-auth', replacement: path.resolve(__dirname, './src/__mocks__/next-auth.js') },
      { find: 'next-auth/providers/resend', replacement: path.resolve(__dirname, './src/__mocks__/next-auth/providers/resend.js') },
      { find: '@auth/prisma-adapter', replacement: path.resolve(__dirname, './src/__mocks__/@auth/prisma-adapter.js') },
      { find: 'next/font/google', replacement: path.resolve(__dirname, './src/__mocks__/next/font/google.js') },
    ],
  },
});