import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.AUTH_SECRET = 'test-secret';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/test',
}));

// Load Vitest mocks
import './__mocks__/vitest-setup';

// Add any other global setup needed for Vitest