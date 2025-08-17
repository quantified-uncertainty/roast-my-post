/**
 * Error type definitions for the AI package
 */

/**
 * Network error codes that can occur during API calls
 */
export type NetworkErrorCode = 'ECONNRESET' | 'ETIMEDOUT' | 'ENOTFOUND' | 'ECONNREFUSED' | 'EHOSTUNREACH';

/**
 * Base error interface for API errors
 */
export interface ApiError extends Error {
  status?: number;
  code?: NetworkErrorCode | string;
  headers?: Headers | Record<string, string>;
  requestID?: string;
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Anthropic-specific error structure
 */
export interface AnthropicError extends Omit<ApiError, 'error'> {
  status: number;
  headers?: Headers | Record<string, string>;
  requestID: string;
  error: {
    type: 'error';
    error: {
      type: string;
      message: string;
    };
  };
}

/**
 * Type guard to check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    (typeof (error as ApiError).status === 'number' ||
     typeof (error as ApiError).code === 'string')
  );
}

/**
 * Type guard to check if an error is an Anthropic error
 */
export function isAnthropicError(error: unknown): error is AnthropicError {
  return (
    isApiError(error) &&
    typeof error.status === 'number' &&
    'requestID' in error
  );
}