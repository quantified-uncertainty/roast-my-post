import { Prisma } from "@roast/db";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Handle Prisma errors and convert them to user-friendly messages
 */
export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle specific Prisma error codes
    switch (error.code) {
      case 'P2002':
        throw new DatabaseError(
          'A record with this value already exists.',
          error.code,
          error
        );
      case 'P2025':
        throw new DatabaseError(
          'The requested record was not found.',
          error.code,
          error
        );
      case 'P2003':
        throw new DatabaseError(
          'Foreign key constraint failed. Related record not found.',
          error.code,
          error
        );
      case 'P2014':
        throw new DatabaseError(
          'The change would violate a required relation.',
          error.code,
          error
        );
      default:
        throw new DatabaseError(
          `Database operation failed: ${error.message}`,
          error.code,
          error
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new DatabaseError(
      'Invalid data provided to database operation.',
      'VALIDATION_ERROR',
      error
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new DatabaseError(
      'Failed to connect to the database. Please try again later.',
      'CONNECTION_ERROR',
      error
    );
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    throw new DatabaseError(
      'An unexpected database error occurred. Please try again.',
      'UNKNOWN_ERROR',
      error
    );
  }

  // Re-throw if it's already a DatabaseError
  if (error instanceof DatabaseError) {
    throw error;
  }

  // Unknown error
  throw new DatabaseError(
    'An unexpected error occurred during database operation.',
    'UNKNOWN',
    error
  );
}

/**
 * Wrapper for database operations with automatic error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorContext = context ? ` [${context}]` : '';
    console.error(`Database operation failed${errorContext}:`, error);
    handlePrismaError(error);
  }
}

/**
 * Type-safe wrapper for findUnique operations that ensures the record exists
 */
export async function findUniqueOrThrow<T>(
  operation: () => Promise<T | null>,
  entityName: string
): Promise<T> {
  const result = await operation();
  if (!result) {
    throw new DatabaseError(`${entityName} not found.`, 'P2025');
  }
  return result;
}