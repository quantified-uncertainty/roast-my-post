/**
 * Integration tests for the math verification tool API route
 * Tests both authenticated and bypass modes
 */

import { NextRequest } from 'next/server';
import { POST } from './route';
import { auth } from '@/infrastructure/auth/auth';

// Mock dependencies
jest.mock('@/infrastructure/auth/auth');
jest.mock('@roast/domain', () => ({
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
    }
  }
}));

// Mock the actual tool execution to avoid calling Claude
jest.mock('@roast/ai/server', () => ({
  checkMathWithMathJsTool: {
    config: {
      id: 'check-math-with-mathjs',
      name: 'Check Math with MathJS',
      path: '/tools/check-math-with-mathjs'
    },
    execute: jest.fn().mockImplementation(async (input) => {
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
    jest.clearAllMocks();
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
      const mockAuth = auth as jest.MockedFunction<typeof auth>;
      mockAuth.mockResolvedValue(null);

      const request = createRequest({ statement: '2 + 2 = 4' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not authenticated');
    });

    it('should process requests with valid authentication', async () => {
      const mockAuth = auth as jest.MockedFunction<typeof auth>;
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
      const mockAuth = auth as jest.MockedFunction<typeof auth>;
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
      expect(data.error).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should not bypass authentication in production', async () => {
      // Mock production environment
      jest.resetModules();
      jest.doMock('@roast/domain', () => ({
        config: {
          env: {
            isDevelopment: false,
            isProduction: true,
            isTest: false,
            nodeEnv: 'production'
          },
          features: {
            dockerBuild: false
          },
          ai: {
            anthropicApiKey: 'test-key'
          }
        }
      }));

      process.env.BYPASS_TOOL_AUTH = 'true';
      const mockAuth = auth as jest.MockedFunction<typeof auth>;
      mockAuth.mockResolvedValue(null);

      // Re-import route with production config
      const { POST: POST_PROD } = await import('./route');
      
      const request = createRequest({ statement: '2 + 2 = 4' });
      const response = await POST_PROD(request);
      const data = await response.json();

      expect(mockAuth).toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });
  });
});