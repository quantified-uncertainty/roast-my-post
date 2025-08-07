/**
 * Standardized error handling system
 * Consistent error types and handling across the application
 */

import { isProduction } from './environment';
import { Prisma } from '@roast/db';

/**
 * Base application error class
 * All custom errors should extend this
 */
export class AppError extends Error {
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: isProduction() ? undefined : this.details,
      timestamp: this.timestamp,
      stack: isProduction() ? undefined : this.stack,
    };
  }
}

/**
 * Specific error types for different scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      503,
      originalError
    );
  }
}

/**
 * Convert any error to an AppError
 * Handles Prisma errors, standard errors, and unknown errors
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Invalid data provided', {
      message: error.message
    });
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      'Database connection failed',
      'DATABASE_CONNECTION_ERROR',
      503,
      { message: error.message },
      false // Not operational - system error
    );
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'INTERNAL_ERROR',
      500,
      { originalError: error.name }
    );
  }

  // Unknown error
  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    { error: String(error) },
    false
  );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return new ConflictError(
        `A record with this ${field} already exists`,
        { field, meta: error.meta }
      );
    }
    
    case 'P2025':
      return new NotFoundError('Record');
    
    case 'P2003':
      return new ValidationError(
        'Foreign key constraint violation',
        { field: error.meta?.field_name }
      );
    
    case 'P2014':
      return new ValidationError(
        'The change would violate a required relation',
        error.meta
      );
    
    default:
      return new AppError(
        `Database error: ${error.message}`,
        `PRISMA_${error.code}`,
        500,
        error.meta
      );
  }
}

/**
 * Error handler for Express/Next.js API routes
 */
export function handleApiError(error: unknown): Response {
  const appError = normalizeError(error);
  
  // Log error if it's not operational (unexpected system errors)
  if (!appError.isOperational) {
    console.error('Non-operational error:', appError);
    // Here you would send to error tracking service (Sentry, etc)
  }

  return new Response(
    JSON.stringify({
      error: {
        message: appError.message,
        code: appError.code,
        details: isProduction() ? undefined : appError.details
      }
    }),
    {
      status: appError.statusCode,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}

/**
 * Assert a condition and throw if false
 */
export function assert(
  condition: any,
  message: string,
  code: string = 'ASSERTION_FAILED'
): asserts condition {
  if (!condition) {
    throw new AppError(message, code, 500);
  }
}

/**
 * Assert that a value is not null/undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${name} is required`);
  }
}

/**
 * Create a typed error handler for async functions
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw normalizeError(error);
    }
  }) as T;
}