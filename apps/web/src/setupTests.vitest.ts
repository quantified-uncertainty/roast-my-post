import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

// Add any other global setup needed for Vitest