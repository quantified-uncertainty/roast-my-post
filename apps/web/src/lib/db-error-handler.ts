import { Prisma } from '@roast/db';

/**
 * User-friendly error messages for common database errors
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public meta?: Record<string, any>
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Convert Prisma errors to user-friendly messages
 */
export function handlePrismaError(error: unknown): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field';
        return new DatabaseError(
          `A record with this ${field} already exists`,
          error.code,
          error.meta
        );
      
      case 'P2003':
        // Foreign key constraint violation
        return new DatabaseError(
          'This operation would violate a foreign key constraint',
          error.code,
          error.meta
        );
      
      case 'P2025':
        // Record not found
        return new DatabaseError(
          'The requested record was not found',
          error.code,
          error.meta
        );
      
      case 'P2014':
        // Relation violation
        return new DatabaseError(
          'The change would violate a required relation',
          error.code,
          error.meta
        );
      
      case 'P2016':
        // Query interpretation error
        return new DatabaseError(
          'Unable to interpret the database query',
          error.code,
          error.meta
        );
      
      default:
        return new DatabaseError(
          `Database error: ${error.message}`,
          error.code,
          error.meta
        );
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError(
      'Invalid data provided to the database',
      'VALIDATION_ERROR'
    );
  }
  
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new DatabaseError(
      'A critical database error occurred. Please try again later.',
      'RUST_PANIC'
    );
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError(
      'Unable to connect to the database. Please try again later.',
      'INITIALIZATION_ERROR'
    );
  }
  
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new DatabaseError(
      'An unknown database error occurred',
      'UNKNOWN_ERROR'
    );
  }
  
  // Generic error handling
  if (error instanceof Error) {
    return new DatabaseError(error.message);
  }
  
  return new DatabaseError('An unexpected error occurred');
}

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  customMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const dbError = handlePrismaError(error);
    if (customMessage) {
      dbError.message = `${customMessage}: ${dbError.message}`;
    }
    throw dbError;
  }
}

/**
 * Helper for findUnique that throws a user-friendly error if not found
 */
export async function findUniqueOrThrow<T>(
  findFn: () => Promise<T | null>,
  entityName: string
): Promise<T> {
  const result = await findFn();
  if (!result) {
    throw new DatabaseError(`${entityName} not found`, 'P2025');
  }
  return result;
}

/**
 * Helper for handling batch operations with partial failure support
 */
export async function batchWithErrorHandling<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options?: {
    stopOnError?: boolean;
    maxConcurrency?: number;
  }
): Promise<{ 
  successful: Array<{ item: T; result: R }>;
  failed: Array<{ item: T; error: DatabaseError }>;
}> {
  const { stopOnError = false, maxConcurrency = 5 } = options || {};
  
  const successful: Array<{ item: T; result: R }> = [];
  const failed: Array<{ item: T; error: DatabaseError }> = [];
  
  // Process in chunks for concurrency control
  for (let i = 0; i < items.length; i += maxConcurrency) {
    const chunk = items.slice(i, i + maxConcurrency);
    const promises = chunk.map(async (item) => {
      try {
        const result = await operation(item);
        successful.push({ item, result });
      } catch (error) {
        const dbError = handlePrismaError(error);
        failed.push({ item, error: dbError });
        if (stopOnError) {
          throw dbError;
        }
      }
    });
    
    await Promise.all(promises);
  }
  
  return { successful, failed };
}

/**
 * Retry logic for transient database errors
 */
export async function retryOnTransientError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: DatabaseError | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = handlePrismaError(error);
      
      // Only retry on transient errors
      const transientCodes = ['P1001', 'P1002', 'P1008', 'P1017'];
      if (!lastError.code || !transientCodes.includes(lastError.code)) {
        throw lastError;
      }
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}