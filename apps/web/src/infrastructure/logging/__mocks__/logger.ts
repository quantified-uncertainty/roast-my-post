import { vi } from 'vitest';

// Mock logger that doesn't output to console during tests
export const logger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// For tests that need to verify logger was called
export const mockLogger = logger;