// Set up test environment variables
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';

// Suppress console output during tests unless explicitly needed
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Only show console output if SHOW_TEST_LOGS environment variable is set
if (!process.env.SHOW_TEST_LOGS) {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    // Keep debug for debugging purposes
    debug: console.debug
  };
}

// Restore original console for specific tests that need to verify console output
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Re-mock console after restoration
global.mockConsole = () => {
  if (!process.env.SHOW_TEST_LOGS) {
    global.console = {
      ...console,
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: console.debug
    };
  }
};