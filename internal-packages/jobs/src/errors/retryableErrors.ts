/**
 * Retryable Error Classification
 *
 * Determines whether an error should trigger a pg-boss retry or fail immediately.
 * Used by the worker to decide how to handle job failures.
 */

import { JobTimeoutError } from '@roast/ai/server';

/**
 * Error patterns that should NOT be retried (permanent failures)
 */
const NON_RETRYABLE_PATTERNS = [
  // Validation errors
  'validation',
  'invalid',
  'schema error',
  'type error',
  'syntax error',
  'parse error',

  // Auth errors
  'unauthorized',
  'forbidden',
  'authentication',
  'not authenticated',

  // Not found
  'not found',
  '404',

  // Bad request
  'bad request',
  '400',

  // Business logic errors
  'document version not found',
  'agent version not found',
  'evaluation not found',
  'job not found',

  // This is the hard limit and we discard this result so we don't want to retry it
  'response was truncated at 8000 tokens',

  // Claude API timeouts indicate systemic issues (document too large/complex) - won't resolve with retries
  'claude api call timed out',
];

/**
 * Error patterns that SHOULD be retried (transient failures)
 */
const RETRYABLE_PATTERNS = [
  // Network errors
  'timeout',
  'timed out',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'socket hang up',
  'connection reset',
  'network',

  // Rate limiting
  'rate limit',
  'too many requests',
  '429',

  // Server errors
  'internal server error',
  '500',
  '502',
  '503',
  '504',
  'service unavailable',
  'gateway timeout',
  'bad gateway',

  // API errors (temporary)
  'api error',
  'overloaded',
];

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Handle API error objects with status codes
    const anyError = error as Record<string, unknown>;
    if ('message' in anyError && typeof anyError.message === 'string') {
      return anyError.message;
    }
    if ('status' in anyError) {
      return `HTTP ${anyError.status}`;
    }
  }
  return String(error);
}

/**
 * Extract HTTP status code from error if available
 */
function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const anyError = error as Record<string, unknown>;
    if ('status' in anyError && typeof anyError.status === 'number') {
      return anyError.status;
    }
    if ('statusCode' in anyError && typeof anyError.statusCode === 'number') {
      return anyError.statusCode;
    }
  }
  return undefined;
}

/**
 * Determine if an error should trigger a retry
 *
 * Returns true for transient errors (network, rate limit, server errors)
 * Returns false for permanent errors (validation, auth, not found, timeout)
 */
export function isRetryableError(error: unknown): boolean {
  // Job timeout errors are never retryable
  if (error instanceof JobTimeoutError) {
    return false;
  }

  const errorMessage = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);

  // Check status code first if available
  if (status !== undefined) {
    // 4xx errors are generally not retryable (client errors)
    // Exception: 429 (rate limit) is retryable
    if (status === 429) {
      return true;
    }
    if (status >= 400 && status < 500) {
      return false;
    }
    // 5xx errors are retryable (server errors)
    if (status >= 500 && status < 600) {
      return true;
    }
  }

  // Check for non-retryable patterns first (more specific)
  if (NON_RETRYABLE_PATTERNS.some((pattern) => errorMessage.includes(pattern))) {
    return false;
  }

  // Check for retryable patterns
  if (RETRYABLE_PATTERNS.some((pattern) => errorMessage.includes(pattern))) {
    return true;
  }

  // Default: don't retry unknown errors to avoid infinite loops
  return false;
}

/**
 * Sanitize error message for database storage
 * Removes problematic characters and truncates if needed
 */
export function sanitizeErrorMessage(error: unknown, maxLength = 1000): string {
  let errorMessage = getErrorMessage(error);

  // Remove problematic Unicode characters
  errorMessage = errorMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Truncate if too long
  if (errorMessage.length > maxLength) {
    errorMessage = errorMessage.substring(0, maxLength - 3) + '...';
  }

  return errorMessage;
}
