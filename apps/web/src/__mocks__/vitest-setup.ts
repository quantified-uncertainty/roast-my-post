// This file sets up mocks for Vitest
// Vitest will automatically use these mocks when vi.mock() is called

import { vi } from 'vitest';

// Mock server-only module
vi.mock('server-only', () => ({}));

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  auth: vi.fn(),
}));

// Mock next-auth providers
vi.mock('next-auth/providers/resend', () => ({
  default: vi.fn(() => ({
    id: 'resend',
    name: 'Resend',
    type: 'email',
  })),
}));

// Mock Prisma adapter
vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({
    createUser: vi.fn(),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByAccount: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    linkAccount: vi.fn(),
    unlinkAccount: vi.fn(),
    createSession: vi.fn(),
    getSessionAndUser: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    createVerificationToken: vi.fn(),
    useVerificationToken: vi.fn(),
  })),
}));

// Mock next/font/google
vi.mock('next/font/google', () => ({
  Inter: vi.fn(() => ({
    className: 'inter-font',
    style: { fontFamily: 'Inter' },
  })),
}));

// Export for use in tests
export default {};