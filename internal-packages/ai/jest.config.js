module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.test.ts',
    '**/*.integration.test.ts',
    '**/*.llm.test.ts',
    '**/*.e2e.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { 
      useESM: true,
      isolatedModules: true,
      tsconfig: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.integration.test.ts',
    '!src/**/*.llm.test.ts',
    '!src/**/*.e2e.test.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // Handle ES modules properly
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@roast)/)'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^nanoid$': '<rootDir>/../../node_modules/.pnpm/nanoid@3.3.11/node_modules/nanoid/index.cjs'
  },
  // Detect what's keeping the process alive
  detectOpenHandles: true,
};