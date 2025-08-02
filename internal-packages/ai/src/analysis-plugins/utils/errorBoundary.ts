/**
 * Error boundary utilities for plugin operations
 */

import { logger } from '../../shared/logger';

export interface ErrorBoundaryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  errorType?: 'timeout' | 'rate_limit' | 'network' | 'validation' | 'unknown';
  canRetry: boolean;
}

/**
 * Wraps an async operation with error boundary protection
 */
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  options: {
    name: string;
    timeout?: number;
    onError?: (error: Error) => void;
  }
): Promise<ErrorBoundaryResult<T>> {
  const { name, timeout = 60000, onError } = options;
  
  try {
    // Create timeout promise if timeout is specified
    let result: T;
    if (timeout > 0) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation '${name}' timed out after ${timeout}ms`)), timeout);
      });
      
      result = await Promise.race([
        operation(),
        timeoutPromise
      ]);
    } else {
      result = await operation();
    }
    
    return {
      success: true,
      data: result,
      canRetry: false
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Call error handler if provided
    if (onError) {
      onError(err);
    }
    
    // Classify error type
    const errorType = classifyError(err);
    const canRetry = isRetryableError(errorType, err);
    
    logger.error(`Error in operation '${name}':`, {
      error: err.message,
      errorType,
      canRetry,
      stack: err.stack
    });
    
    return {
      success: false,
      error: err,
      errorType,
      canRetry
    };
  }
}

/**
 * Wraps multiple async operations with individual error boundaries
 * Returns all results, both successful and failed
 */
export async function withErrorBoundaryBatch<T>(
  operations: Array<{
    name: string;
    operation: () => Promise<T>;
    timeout?: number;
  }>
): Promise<Array<{ name: string; result: ErrorBoundaryResult<T> }>> {
  const results = await Promise.allSettled(
    operations.map(async ({ name, operation, timeout }) => ({
      name,
      result: await withErrorBoundary(operation, { name, timeout })
    }))
  );
  
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // This shouldn't happen since withErrorBoundary catches errors
      return {
        name: 'unknown',
        result: {
          success: false,
          error: new Error(result.reason),
          errorType: 'unknown' as const,
          canRetry: false
        }
      };
    }
  });
}

/**
 * Classify error type for better handling
 */
function classifyError(error: Error): ErrorBoundaryResult<any>['errorType'] {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return 'rate_limit';
  }
  
  if (
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('connection')
  ) {
    return 'network';
  }
  
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('must be')
  ) {
    return 'validation';
  }
  
  return 'unknown';
}

/**
 * Determine if an error is retryable based on type
 */
function isRetryableError(errorType: ErrorBoundaryResult<any>['errorType'], error: Error): boolean {
  switch (errorType) {
    case 'timeout':
    case 'rate_limit':
    case 'network':
      return true;
    case 'validation':
      return false;
    case 'unknown':
      // Check for other retryable patterns
      const message = error.message.toLowerCase();
      return message.includes('temporarily unavailable') || 
             message.includes('service unavailable') ||
             /5\d\d/.test(message); // 5xx errors
    default:
      return false;
  }
}