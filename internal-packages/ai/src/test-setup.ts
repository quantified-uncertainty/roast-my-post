// Test setup file for Vitest
// Add any global test configuration here

// Load environment variables from .env files
import * as dotenv from 'dotenv';
import * as path from 'path';
import { afterAll, vi } from 'vitest';

// Try to load from multiple .env files in order of precedence
const envFiles = [
  '.env.local',
  '.env'
];

for (const envFile of envFiles) {
  const envPath = path.resolve(__dirname, '../../../', envFile);
  dotenv.config({ path: envPath });
}

// Suppress console logs during tests unless explicitly needed
if (process.env.SUPPRESS_TEST_LOGS !== 'false') {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    // Keep error to see actual test failures
    error: console.error,
  };
}

// Add mock helper methods to all vi.fn() calls for Jest compatibility
const originalFn = vi.fn;
(vi as any).fn = (...args: any[]) => {
  const mock = originalFn(...args);
  if (!mock.mockResolvedValueOnce) {
    mock.mockResolvedValueOnce = (value: any) => mock.mockImplementationOnce(() => Promise.resolve(value));
  }
  if (!mock.mockRejectedValueOnce) {
    mock.mockRejectedValueOnce = (error: any) => mock.mockImplementationOnce(() => Promise.reject(error));
  }
  if (!mock.mockResolvedValue) {
    mock.mockResolvedValue = (value: any) => mock.mockImplementation(() => Promise.resolve(value));
  }
  if (!mock.mockRejectedValue) {
    mock.mockRejectedValue = (error: any) => mock.mockImplementation(() => Promise.reject(error));
  }
  return mock;
};

// Clean up resources after all tests complete
afterAll(async () => {
  // Give time for any pending async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}, 5000); // Add timeout to prevent hanging