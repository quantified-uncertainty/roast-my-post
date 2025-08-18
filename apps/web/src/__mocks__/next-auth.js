// Mock for next-auth package
import { vi } from 'vitest';

const mockHandlers = {
  GET: vi.fn(),
  POST: vi.fn(),
};

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

const NextAuth = vi.fn(() => ({
  handlers: mockHandlers,
  signIn: mockSignIn,
  signOut: mockSignOut,
  auth: vi.fn(),
}));

export default NextAuth;
export { NextAuth };
export const NextAuthConfig = {};