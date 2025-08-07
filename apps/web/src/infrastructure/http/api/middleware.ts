/**
 * API middleware for consistent request handling
 * Wraps all API routes with error handling, logging, and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/infrastructure/auth/auth';
import { 
  AppError, 
  AuthenticationError, 
  ValidationError,
  RateLimitError,
  handleApiError,
  normalizeError 
} from '@/shared/core/errors';
import { Result } from '@/shared/core/result';
import { logger } from '@/infrastructure/logging/logger';
import { isProduction } from '@/shared/core/environment';

type ApiHandler = (
  req: NextRequest,
  context: any
) => Promise<Response> | Response;

type MiddlewareOptions = {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validateBody?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
  logRequest?: boolean;
};

/**
 * Main API middleware wrapper
 * Provides error handling, authentication, validation, and logging
 */
export function withApiMiddleware(
  handler: ApiHandler,
  options: MiddlewareOptions = {}
): ApiHandler {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Log request if enabled
      if (options.logRequest !== false && !isProduction()) {
        logger.info('API Request', {
          requestId,
          method: req.method,
          url: req.url,
          headers: Object.fromEntries(req.headers.entries()),
        });
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await checkRateLimit(req, options.rateLimit);
        if (rateLimitResult.isError()) {
          throw rateLimitResult.error();
        }
      }

      // Authentication
      if (options.requireAuth || options.requireAdmin) {
        const session = await auth();
        
        if (!session?.user) {
          throw new AuthenticationError();
        }

        // Admin check
        if (options.requireAdmin && session.user.role !== 'ADMIN') {
          throw new AuthenticationError('Admin access required');
        }

        // Attach user to request for handler use
        (req as any).user = session.user;
      }

      // Body validation
      if (options.validateBody) {
        const body = await req.json();
        const validationResult = options.validateBody.safeParse(body);
        
        if (!validationResult.success) {
          throw new ValidationError(
            'Invalid request body',
            validationResult.error.flatten()
          );
        }
        
        // Attach validated body to request
        (req as any).validatedBody = validationResult.data;
      }

      // Query validation
      if (options.validateQuery) {
        const { searchParams } = new URL(req.url);
        const query = Object.fromEntries(searchParams.entries());
        const validationResult = options.validateQuery.safeParse(query);
        
        if (!validationResult.success) {
          throw new ValidationError(
            'Invalid query parameters',
            validationResult.error.flatten()
          );
        }
        
        // Attach validated query to request
        (req as any).validatedQuery = validationResult.data;
      }

      // Execute handler
      const response = await handler(req, context);

      // Log response if enabled
      if (options.logRequest !== false && !isProduction()) {
        const duration = Date.now() - startTime;
        logger.info('API Response', {
          requestId,
          status: response.status,
          duration,
        });
      }

      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set('X-Request-Id', requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      logger.error('API Error', {
        requestId,
        duration,
        error: normalizeError(error),
      });

      // Return error response
      return handleApiError(error);
    }
  };
}

/**
 * Simple in-memory rate limiter
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(
  req: NextRequest,
  limits: { requests: number; windowMs: number }
): Promise<Result<void, AppError>> {
  // Get client identifier (IP or user ID)
  const clientId = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  const now = Date.now();
  const windowStart = now - limits.windowMs;
  
  // Clean old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Check current rate
  const current = rateLimitStore.get(clientId);
  
  if (current) {
    if (current.count >= limits.requests) {
      const resetIn = Math.ceil((current.resetTime - now) / 1000);
      return Result.fail(
        new RateLimitError(`Rate limit exceeded. Try again in ${resetIn} seconds`)
      );
    }
    
    current.count++;
  } else {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + limits.windowMs,
    });
  }
  
  return Result.ok(undefined);
}

/**
 * Simplified wrapper for common GET endpoints
 */
export function apiGet(
  handler: ApiHandler,
  options?: Omit<MiddlewareOptions, 'validateBody'>
): ApiHandler {
  return withApiMiddleware(handler, options);
}

/**
 * Simplified wrapper for common POST endpoints
 */
export function apiPost<T extends z.ZodSchema>(
  schema: T,
  handler: (
    req: NextRequest & { validatedBody: z.infer<T>; user?: any },
    context: any
  ) => Promise<Response> | Response,
  options?: Omit<MiddlewareOptions, 'validateBody'>
): ApiHandler {
  return withApiMiddleware(handler as ApiHandler, {
    ...options,
    validateBody: schema,
  });
}

/**
 * Simplified wrapper for authenticated endpoints
 */
export function apiAuth(
  handler: (
    req: NextRequest & { user: any },
    context: any
  ) => Promise<Response> | Response,
  options?: MiddlewareOptions
): ApiHandler {
  return withApiMiddleware(handler as ApiHandler, {
    ...options,
    requireAuth: true,
  });
}

/**
 * Simplified wrapper for admin endpoints
 */
export function apiAdmin(
  handler: (
    req: NextRequest & { user: any },
    context: any
  ) => Promise<Response> | Response,
  options?: MiddlewareOptions
): ApiHandler {
  return withApiMiddleware(handler as ApiHandler, {
    ...options,
    requireAdmin: true,
  });
}