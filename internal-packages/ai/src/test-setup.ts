// Test setup file for Jest
// Add any global test configuration here

// Load environment variables from .env files
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load from multiple .env files in order of precedence
const envFiles = [
  '.env.local',
  '.env'
];

for (const envFile of envFiles) {
  const envPath = path.resolve(__dirname, '../../../', envFile);
  dotenv.config({ path: envPath });
}

// Increase timeout for integration tests that make API calls
jest.setTimeout(120000); // 2 minutes for tests that make real API calls

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