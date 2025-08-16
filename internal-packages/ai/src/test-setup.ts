// Test setup file
// Add any global test configuration here

// Mock console methods to reduce noise in tests
// Set DEBUG_TESTS=true environment variable to see console output
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error output even when not debugging
    error: console.error,
  };
}

// Set test timeout
jest.setTimeout(30000);