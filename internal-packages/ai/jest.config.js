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
      tsconfig: {
        moduleResolution: 'node',
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
    'node_modules/(?!(nanoid)/)'
  ],
  extensionsToTreatAsEsm: ['.ts'],
};