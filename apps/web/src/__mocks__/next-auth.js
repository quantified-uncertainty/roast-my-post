// Mock for next-auth package
const mockHandlers = {
  GET: jest.fn(),
  POST: jest.fn(),
};

const mockSignIn = jest.fn();
const mockSignOut = jest.fn();

const NextAuth = jest.fn(() => ({
  handlers: mockHandlers,
  signIn: mockSignIn,
  signOut: mockSignOut,
  auth: jest.fn(),
}));

module.exports = {
  __esModule: true,
  default: NextAuth,
  NextAuth,
  NextAuthConfig: {},
};