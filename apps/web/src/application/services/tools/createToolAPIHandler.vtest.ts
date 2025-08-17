import { vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createToolAPIHandler } from './createToolAPIHandler';
import { Tool } from '@roast/ai';
import { auth } from '@/infrastructure/auth/auth';
import { logger } from '@/infrastructure/logging/logger';

// Mock the auth module
vi.mock('@/infrastructure/auth/auth');
vi.mock('@/infrastructure/logging/logger');

// Mock the AI logger
vi.mock('@roast/ai', () => ({
  ...jest.requireActual('@roast/ai'),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock config module
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
    auth: {
      secret: 'test-secret-for-testing',
      nextAuthUrl: 'http://localhost:3000',
      resendKey: undefined,
      emailFrom: undefined
    },
    ai: {
      anthropicApiKey: 'test-key'
    }
  }
}));

describe('createToolAPIHandler', () => {
  const mockTool: Tool<any, any> = {
    config: {
      id: 'test-tool',
      name: 'Test Tool',
      description: 'A test tool',
      version: '1.0.0',
      category: 'utility'
    },
    inputSchema: {} as any,
    outputSchema: {} as any,
    execute: vi.fn().mockResolvedValue({ result: 'success' }),
    run: vi.fn(),
    validateAccess: vi.fn().mockResolvedValue(true),
    beforeExecute: vi.fn().mockResolvedValue(undefined),
    afterExecute: vi.fn().mockResolvedValue(undefined),
    getInputJsonSchema: vi.fn().mockReturnValue({ type: 'object', properties: {} }),
    getOutputJsonSchema: vi.fn().mockReturnValue({ type: 'object', properties: {} })
  };

  const mockRequest = (body: any) => ({
    json: vi.fn().mockResolvedValue(body)
  }) as unknown as NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.BYPASS_TOOL_AUTH;
  });

  describe('Authentication', () => {
    it('should require authentication when BYPASS_TOOL_AUTH is not set', async () => {
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue(null);

      const route = createToolAPIHandler(mockTool);
      const response = await route(mockRequest({ test: 'data' }));
      const data = await response.json();

      expect(mockAuth).toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('should require authentication when BYPASS_TOOL_AUTH is false', async () => {
      process.env.BYPASS_TOOL_AUTH = 'false';
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue(null);

      const route = createToolAPIHandler(mockTool);
      const response = await route(mockRequest({ test: 'data' }));
      const data = await response.json();

      expect(mockAuth).toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('should bypass authentication when BYPASS_TOOL_AUTH=true in development', async () => {
      process.env.BYPASS_TOOL_AUTH = 'true';
      const mockAuth = auth as jest.Mock;

      const route = createToolAPIHandler(mockTool);
      const response = await route(mockRequest({ test: 'data' }));
      const data = await response.json();

      expect(mockAuth).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toEqual({ result: 'success' });
      expect(logger.info).toHaveBeenCalledWith(
        '[DEV] Bypassing authentication for Test Tool tool'
      );
    });

    it('should use authenticated user ID when session exists', async () => {
      const { logger: aiLogger } = require('@roast/ai');
      const mockAuth = auth as jest.Mock;
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
        expires: new Date().toISOString()
      } as any);

      const route = createToolAPIHandler(mockTool);
      const response = await route(mockRequest({ test: 'data' }));
      const data = await response.json();

      expect(mockAuth).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTool.execute).toHaveBeenCalledWith(
        { test: 'data' },
        expect.objectContaining({
          userId: 'user-123',
          logger: aiLogger
        })
      );
    });
  });

  describe('Production Safety', () => {
    beforeEach(() => {
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
          auth: {
            secret: 'test-secret-for-testing',
            nextAuthUrl: 'http://localhost:3000',
            resendKey: undefined,
            emailFrom: undefined
          },
          ai: {
            anthropicApiKey: 'test-key'
          }
        }
      }));
    });

    it('should NOT bypass authentication in production even with BYPASS_TOOL_AUTH=true', async () => {
      process.env.BYPASS_TOOL_AUTH = 'true';
      
      // Clear the module cache and re-mock auth before importing
      vi.clearAllMocks();
      jest.resetModules();
      
      // Re-mock auth module after reset
      jest.doMock('@/infrastructure/auth/auth', () => ({
        auth: vi.fn().mockResolvedValue(null)
      }));
      
      // Re-import to get the mocked version
      const { createToolAPIHandler: createToolAPIHandlerProd } = await import('./createToolAPIHandler');
      const { auth: authProd } = await import('@/infrastructure/auth/auth');
      
      const route = createToolAPIHandlerProd(mockTool);
      const response = await route(mockRequest({ test: 'data' }));
      const data = await response.json();

      expect(authProd).toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      process.env.BYPASS_TOOL_AUTH = 'true';
      
      const errorTool: Tool<any, any> = {
        config: mockTool.config,
        inputSchema: mockTool.inputSchema,
        outputSchema: mockTool.outputSchema,
        execute: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
        run: mockTool.run,
        validateAccess: mockTool.validateAccess,
        beforeExecute: mockTool.beforeExecute,
        afterExecute: mockTool.afterExecute,
        getInputJsonSchema: mockTool.getInputJsonSchema,
        getOutputJsonSchema: mockTool.getOutputJsonSchema
      };

      const route = createToolAPIHandler(errorTool);
      const response = await route(mockRequest({ test: 'data' }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Tool execution failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle JSON parsing errors', async () => {
      process.env.BYPASS_TOOL_AUTH = 'true';
      
      const badRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as unknown as NextRequest;

      const route = createToolAPIHandler(mockTool);
      const response = await route(badRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });
  });
});