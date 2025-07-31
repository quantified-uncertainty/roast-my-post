// Type declarations for @jest/globals
declare module '@jest/globals' {
  const globalJest: typeof import('jest');
  export const jest: typeof globalJest & {
    mock: typeof globalJest.mock;
    clearAllMocks: typeof globalJest.clearAllMocks;
    resetAllMocks: typeof globalJest.resetAllMocks;
    restoreAllMocks: typeof globalJest.restoreAllMocks;
  };
  export const test: typeof import('jest').test;
  export const it: typeof import('jest').it;
  export const describe: typeof import('jest').describe;
  export const expect: typeof import('jest').expect;
  export const beforeEach: typeof import('jest').beforeEach;
  export const afterEach: typeof import('jest').afterEach;
  export const beforeAll: typeof import('jest').beforeAll;
  export const afterAll: typeof import('jest').afterAll;
}