import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from './auth-helpers';
import { commonErrors } from './api-response-helpers';
import { standardRateLimit, getClientIdentifier } from './rate-limiter';
import { z } from 'zod';

interface SecurityOptions {
  requireAuth?: boolean;
  rateLimit?: boolean;
  validateBody?: z.ZodSchema;
  checkOwnership?: (userId: string, request: NextRequest) => Promise<boolean>;
}

/**
 * Security middleware that combines auth, rate limiting, and validation
 * Use this to wrap API route handlers for consistent security
 */
export function withSecurity(
  handler: (request: NextRequest, context: any) => Promise<Response>,
  options: SecurityOptions = {}
) {
  return async (request: NextRequest, context: any) => {
    try {
      // 1. Rate limiting
      if (options.rateLimit) {
        const clientId = getClientIdentifier(request);
        const { success, remaining, reset } = await standardRateLimit.check(clientId);
        
        if (!success) {
          return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toISOString(),
            },
          });
        }
        
        // Add rate limit headers to response
        const response = await handler(request, context);
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', reset.toISOString());
        return response;
      }
      
      // 2. Authentication
      let userId: string | undefined;
      if (options.requireAuth) {
        userId = await authenticateRequest(request);
        if (!userId) {
          return commonErrors.unauthorized();
        }
      }
      
      // 3. Input validation
      if (options.validateBody && request.method !== 'GET') {
        const body = await request.json();
        const parsed = options.validateBody.safeParse(body);
        
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          const errorMessages: Record<string, string> = {};
          for (const [field, errors] of Object.entries(fieldErrors)) {
            errorMessages[field] = Array.isArray(errors) ? errors[0] : '';
          }
          return commonErrors.validationError(errorMessages);
        }
        
        // Replace request body with validated data
        (request as any).validatedBody = parsed.data;
      }
      
      // 4. Ownership check
      if (options.checkOwnership && userId) {
        const hasAccess = await options.checkOwnership(userId, request);
        if (!hasAccess) {
          return commonErrors.forbidden();
        }
      }
      
      // 5. Add security headers
      const response = await handler(request, context);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      
      return response;
    } catch (error) {
      console.error('Security middleware error:', error);
      return commonErrors.serverError();
    }
  };
}