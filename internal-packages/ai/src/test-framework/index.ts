/**
 * @deprecated This test framework is deprecated and should not be used.
 * 
 * Use the simpler test helpers instead:
 * - /analysis-plugins/__tests__/helpers/test-helpers.ts
 * - /analysis-plugins/__tests__/helpers/shared-fixtures.ts
 * 
 * See DEPRECATED.md for migration guide.
 */

// Minimal exports for backward compatibility only
export * from './types';
export * from './fixtures';

// The following are deprecated and should not be used:
// export * from './builders';    // Use plain objects instead
// export * from './factories';   // Use shared-fixtures instead
// export * from './assertions';  // Use test-helpers instead
// export * from './mocks';       // Use Jest mocks instead
// export * from './runners';     // Use Jest's native test runner