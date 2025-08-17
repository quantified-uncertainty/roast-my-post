// Mock for next-auth resend provider
import { vi } from 'vitest';

const ResendProvider = vi.fn((options) => ({
  id: 'resend',
  type: 'email',
  name: 'Resend',
  ...options
}));

export default ResendProvider;