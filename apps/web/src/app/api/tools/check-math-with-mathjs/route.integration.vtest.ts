import { vi } from 'vitest';
/**
 * Integration tests for the math verification tool API route
 * Tests both authenticated and bypass modes
 */

import { NextRequest } from 'next/server';
import { POST } from './route';
import { auth } from '@/infrastructure/auth/auth';

// Mock dependencies
vi.mock('@/infrastructure/auth/auth');
vi.mock('@roast/domain', () => ({
  config: {
    env: {
      isDevelopment: true,
      isTest: true,
      isProduction: false,
      nodeEnv: 'test'
    },
    features: {
      dockerBuild: false
    },
    ai: {
      anthropicApiKey: 'test-key'
    },
    auth: {
      secret: 'test-secret',
      resendKey: undefined,
      emailFrom: undefined
    }
  },
  isDevelopment: vi.fn(() => true),
  isTest: vi.fn(() => true),
  isProduction: vi.fn(() => false)
}));

// Mock the actual tool execution to avoid calling Claude
vi.mock('@roast/ai/server', () => ({
  checkMathWithMathJsTool: {
    config: {
      id: 'check-math-with-mathjs',
      name: 'Check Math with MathJS',
      path: '/tools/check-math-with-mathjs'
    },
    execute: vi.fn().mockImplementation(async (input) => {
      // Validate required fields like the real tool would
      if (!input.statement) {
        throw new Error('Statement is required');
      }
      
      // Simulate tool behavior
      if (input.statement === '2 + 2 = 4') {
        return {
          statement: input.statement,
          status: 'verified_true',
          explanation: 'The statement is correct. 2 + 2 equals 4.'
        };
      } else if (input.statement === '2 + 2 = 5') {
        return {
          statement: input.statement,
          status: 'verified_false',
          explanation: 'The statement is incorrect. 2 + 2 equals 4, not 5.'
        };
      }
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: 'Unable to verify this statement.'
      };
    })
  }
}));

describe('Math Verification Tool API Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.BYPASS_TOOL_AUTH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (body: any): NextRequest => {
    return new NextRequest('http://localhost:3000/api/tools/check-math-with-mathjs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  };

  describe('Normal Authentication Mode', () => {
    it('should reject requests without authentication', async () => {
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue(null);

      const request = createRequest({ statement: '2 + 2 = 4' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authenticated');
    });

    it('should process requests with valid authentication', async () => {
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
        expires: new Date().toISOString()
      } as any);

      const request = createRequest({ statement: '2 + 2 = 4' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe('verified_true');
      expect(data.result.explanation).toContain('correct');
    });
  });

  describe('Bypass Authentication Mode', () => {
    beforeEach(() => {
      process.env.BYPASS_TOOL_AUTH = 'true';
    });

    it('should process requests without authentication when bypass is enabled', async () => {
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue(null);

      const request = createRequest({ statement: '2 + 2 = 4' });
      const response = await POST(request);
      const data = await response.json();

      expect(mockAuth).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe('verified_true');
    });

    it('should verify correct mathematical statements', async () => {
      const request = createRequest({ statement: '2 + 2 = 4' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toMatchObject({
        statement: '2 + 2 = 4',
        status: 'verified_true',
        explanation: expect.stringContaining('correct')
      });
    });

    it('should identify incorrect mathematical statements', async () => {
      const request = createRequest({ statement: '2 + 2 = 5' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toMatchObject({
        statement: '2 + 2 = 5',
        status: 'verified_false',
        explanation: expect.stringContaining('incorrect')
      });
    });

    it('should handle statements with context', async () => {
      const request = createRequest({ 
        statement: '2 + 2 = 4',
        context: 'Basic arithmetic'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe('verified_true');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      process.env.BYPASS_TOOL_AUTH = 'true';
      
      const request = new NextRequest('http://localhost:3000/api/tools/check-math-with-mathjs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle missing statement parameter', async () => {
      process.env.BYPASS_TOOL_AUTH = 'true';
      
      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Statement is required');
    });
  });

  describe('Security', () => {
    it('should not bypass authentication in production', async () => {
      // Temporarily override isDevelopment to return false (production mode)
      const originalIsDevelopment = require('@roast/domain').config.env.isDevelopment;
      Object.defineProperty(require('@roast/domain').config.env, 'isDevelopment', {
        value: false,
        configurable: true
      });

      process.env.BYPASS_TOOL_AUTH = 'true';
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue(null);

      try {
        const request = createRequest({ statement: '2 + 2 = 4' });
        const response = await POST(request);
        const data = await response.json();

        // In production, bypass should not work even if BYPASS_TOOL_AUTH is set
        expect(mockAuth).toHaveBeenCalled();
        expect(response.status).toBe(401);
        expect(data.error).toBe('Not authenticated');
      } finally {
        // Restore original value
        Object.defineProperty(require('@roast/domain').config.env, 'isDevelopment', {
          value: originalIsDevelopment,
          configurable: true
        });
      }
    });
  });
});