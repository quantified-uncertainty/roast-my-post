/**
 * Utilities to reduce API route duplication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * Standard API route configuration
 */
export interface RouteConfig {
  requireAuth?: boolean;
  rateLimit?: boolean;
  validateBody?: z.ZodSchema;
  validateParams?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
  logRequests?: boolean;
  corsEnabled?: boolean;
}

/**
 * Standard error responses
 */
export const StandardErrors = {
  unauthorized: () => NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  ),
  
  forbidden: () => NextResponse.json(
    { error: "Access forbidden" },
    { status: 403 }
  ),
  
  badRequest: (message: string = "Invalid request") => NextResponse.json(
    { error: message },
    { status: 400 }
  ),
  
  notFound: (resource: string = "Resource") => NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  ),
  
  methodNotAllowed: (method: string) => NextResponse.json(
    { error: `Method ${method} not allowed` },
    { status: 405 }
  ),
  
  tooManyRequests: () => NextResponse.json(
    { error: "Too many requests" },
    { status: 429 }
  ),
  
  internalError: (message: string = "Internal server error") => NextResponse.json(
    { error: message },
    { status: 500 }
  ),
  
  validationError: (errors: unknown) => NextResponse.json(
    { error: "Validation failed", details: errors },
    { status: 400 }
  )
};

/**
 * Route handler type for standardized routes
 */
export type RouteHandler<T = any> = (
  request: NextRequest,
  context: {
    params?: any;
    query?: any;
    body?: any;
    userId?: string;
  }
) => Promise<NextResponse<T>>;

/**
 * Authentication utilities
 */
class AuthUtils {
  static async authenticateRequest(request: NextRequest): Promise<string | undefined> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    
    // TODO: Implement actual token validation
    // SECURITY: This method must be implemented before production use
    // Current implementation throws to prevent security vulnerability
    throw new Error('Authentication not implemented - do not use in production');
  }

  static async isAdmin(userId: string): Promise<boolean> {
    // TODO: Check if user is admin
    return false;
  }
}

/**
 * Rate limiting utilities (simple in-memory implementation)
 */
class RateLimitUtils {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS = 100; // per window

  static isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const request = this.requests.get(identifier);
    
    if (!request || now > request.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.WINDOW_MS });
      return false;
    }
    
    if (request.count >= this.MAX_REQUESTS) {
      return true;
    }
    
    request.count++;
    return false;
  }
}

/**
 * Parameter extraction utilities
 */
class ParamUtils {
  static async extractBody<T>(request: NextRequest, schema?: z.ZodSchema<T>): Promise<T> {
    try {
      const body = await request.json();
      if (schema) {
        return schema.parse(body);
      }
      return body;
    } catch (_error) {
      throw new Error('Invalid JSON body');
    }
  }

  static extractQuery(request: NextRequest): Record<string, string> {
    const { searchParams } = new URL(request.url);
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      query[key] = value;
    });
    return query;
  }

  static extractParams(context: { params?: Record<string, string> }): Record<string, string> {
    return context.params || {};
  }
}

/**
 * Main route wrapper that consolidates common patterns
 */
export function createRoute(
  handler: RouteHandler,
  config: RouteConfig = {}
): (request: NextRequest, context: any) => Promise<NextResponse> {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string | undefined;

    try {
      // 1. CORS handling
      if (config.corsEnabled) {
        if (request.method === 'OPTIONS') {
          return new NextResponse(null, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        }
      }

      // 2. Authentication
      if (config.requireAuth) {
        userId = await AuthUtils.authenticateRequest(request);
        if (!userId) {
          return StandardErrors.unauthorized();
        }
      }

      // 3. Rate limiting
      if (config.rateLimit) {
        const identifier = userId || (request as any).ip || 'anonymous';
        if (RateLimitUtils.isRateLimited(identifier)) {
          return StandardErrors.tooManyRequests();
        }
      }

      // 4. Parameter extraction and validation
      let body, params, query;
      
      try {
        // Extract parameters
        params = ParamUtils.extractParams(context);
        query = ParamUtils.extractQuery(request);
        
        // Extract and validate body for non-GET requests
        if (request.method !== 'GET' && request.headers.get('content-type')?.includes('application/json')) {
          body = await ParamUtils.extractBody(request, config.validateBody);
        }

        // Validate params and query if schemas provided
        if (config.validateParams) {
          params = config.validateParams.parse(params);
        }
        if (config.validateQuery) {
          query = config.validateQuery.parse(query);
        }

      } catch (error) {
        if (error instanceof z.ZodError) {
          return StandardErrors.validationError(error.errors);
        }
        return StandardErrors.badRequest(error instanceof Error ? error.message : 'Validation failed');
      }

      // 5. Request logging
      if (config.logRequests) {
        logger.info('API request', {
          method: request.method,
          url: request.url,
          userId,
          timestamp: new Date().toISOString()
        });
      }

      // 6. Call the actual handler
      const response = await handler(request, {
        params,
        query,
        body,
        userId
      });

      // 7. Response logging
      if (config.logRequests) {
        logger.info('API response', {
          method: request.method,
          url: request.url,
          userId,
          status: response.status,
          duration: Date.now() - startTime
        });
      }

      // 8. Add CORS headers to response if enabled
      if (config.corsEnabled) {
        response.headers.set('Access-Control-Allow-Origin', '*');
      }

      return response;

    } catch (error) {
      // Standard error handling
      logger.error('API route error', {
        method: request.method,
        url: request.url,
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime
      });

      return StandardErrors.internalError();
    }
  };
}

/**
 * Specialized route creators for common patterns
 */
export const RouteCreators = {
  /**
   * Create a protected route that requires authentication
   */
  protected: (handler: RouteHandler, additionalConfig: Omit<RouteConfig, 'requireAuth'> = {}) =>
    createRoute(handler, { ...additionalConfig, requireAuth: true }),

  /**
   * Create a public route with rate limiting
   */
  public: (handler: RouteHandler, additionalConfig: Omit<RouteConfig, 'rateLimit'> = {}) =>
    createRoute(handler, { ...additionalConfig, rateLimit: true }),

  /**
   * Create a route with full validation
   */
  validated: (
    handler: RouteHandler,
    schemas: {
      body?: z.ZodSchema;
      params?: z.ZodSchema;
      query?: z.ZodSchema;
    },
    additionalConfig: RouteConfig = {}
  ) =>
    createRoute(handler, {
      ...additionalConfig,
      validateBody: schemas.body,
      validateParams: schemas.params,
      validateQuery: schemas.query
    }),

  /**
   * Create an admin-only route
   */
  admin: (handler: RouteHandler, additionalConfig: RouteConfig = {}) =>
    createRoute(
      async (request, context) => {
        if (!context.userId) {
          return StandardErrors.unauthorized();
        }
        
        const isAdmin = await AuthUtils.isAdmin(context.userId);
        if (!isAdmin) {
          return StandardErrors.forbidden();
        }
        
        return handler(request, context);
      },
      { ...additionalConfig, requireAuth: true }
    )
};

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  stringId: z.object({
    id: z.string().min(1, "ID is required")
  }),

  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20)
  }),

  contentBody: z.object({
    content: z.string().min(1, "Content is required")
  }),

  optionsQuery: z.object({
    includeMetadata: z.string().optional().transform(val => val === 'true'),
    format: z.enum(['json', 'text']).optional()
  })
};

