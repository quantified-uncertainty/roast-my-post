// Test setup file for Jest
// Add any global test configuration here

// Increase timeout for integration tests that make API calls
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
if (process.env.SUPPRESS_TEST_LOGS !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error to see actual test failures
    error: console.error,
  };
}