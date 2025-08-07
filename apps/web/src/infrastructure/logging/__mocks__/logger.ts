// Mock logger that doesn't output to console during tests
export const logger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// For tests that need to verify logger was called
export const mockLogger = logger;