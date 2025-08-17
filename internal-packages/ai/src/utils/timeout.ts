/**
 * Centralized timeout utilities for consistent timeout handling across the codebase
 */

/**
 * Default timeout value in milliseconds (60 seconds)
 */
export const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Timeout configuration options
 */
export interface TimeoutOptions {
  /** Timeout duration in milliseconds */
  timeoutMs?: number;
  /** Custom error message for timeout */
  errorMessage?: string;
  /** Optional cleanup function to run on timeout */
  onTimeout?: () => void;
}

/**
 * Wraps a promise with a timeout that properly cleans up after itself.
 * This prevents memory leaks from uncleaned timeout handles.
 * 
 * @param promise - The promise to wrap with a timeout
 * @param options - Timeout configuration options
 * @returns The result of the promise if it completes before timeout
 * @throws Error if the promise times out
 * 
 * @example
 * ```typescript
 * // Simple usage with default timeout
 * const result = await withTimeout(fetchData());
 * 
 * // Custom timeout and message
 * const result = await withTimeout(
 *   fetchData(),
 *   { 
 *     timeoutMs: 5000,
 *     errorMessage: 'Data fetch timed out after 5 seconds'
 *   }
 * );
 * 
 * // With cleanup callback
 * const controller = new AbortController();
 * const result = await withTimeout(
 *   fetch(url, { signal: controller.signal }),
 *   {
 *     timeoutMs: 10000,
 *     onTimeout: () => controller.abort()
 *   }
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    errorMessage = `Operation timed out after ${timeoutMs}ms`,
    onTimeout
  } = options;

  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      // Call cleanup callback if provided
      if (onTimeout) {
        try {
          onTimeout();
        } catch (error) {
          console.error('Error in timeout cleanup callback:', error);
        }
      }
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  // Race the original promise against the timeout
  return Promise.race([promise, timeoutPromise]).finally(() => {
    // Always clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
  });
}

/**
 * Creates a reusable timeout wrapper with preset options.
 * Useful for creating domain-specific timeout functions.
 * 
 * @param defaultOptions - Default options for this timeout wrapper
 * @returns A configured withTimeout function
 * 
 * @example
 * ```typescript
 * // Create a timeout wrapper for API calls
 * const withApiTimeout = createTimeoutWrapper({
 *   timeoutMs: 30000,
 *   errorMessage: 'API call timed out'
 * });
 * 
 * // Use it multiple times with consistent settings
 * const user = await withApiTimeout(fetchUser());
 * const posts = await withApiTimeout(fetchPosts());
 * ```
 */
export function createTimeoutWrapper(defaultOptions: TimeoutOptions) {
  return <T>(promise: Promise<T>, overrides?: TimeoutOptions): Promise<T> => {
    return withTimeout(promise, { ...defaultOptions, ...overrides });
  };
}

/**
 * Timeout presets for common use cases
 */
export const TimeoutPresets = {
  /** Quick operations (5 seconds) */
  QUICK: 5000,
  /** Standard operations (30 seconds) */
  STANDARD: 30000,
  /** API calls (60 seconds) */
  API_CALL: 60000,
  /** LLM/AI operations (3 minutes) */
  LLM_CALL: 180000,
  /** Long-running operations (5 minutes) */
  LONG_RUNNING: 300000,
  /** Extra long operations (10 minutes) */
  EXTRA_LONG: 600000,
} as const;

/**
 * Pre-configured timeout wrappers for common use cases
 */
export const Timeouts = {
  /** For quick, local operations */
  quick: createTimeoutWrapper({
    timeoutMs: TimeoutPresets.QUICK,
    errorMessage: 'Quick operation timed out'
  }),

  /** For standard operations */
  standard: createTimeoutWrapper({
    timeoutMs: TimeoutPresets.STANDARD,
    errorMessage: 'Operation timed out'
  }),

  /** For API calls */
  api: createTimeoutWrapper({
    timeoutMs: TimeoutPresets.API_CALL,
    errorMessage: 'API call timed out'
  }),

  /** For LLM/AI operations */
  llm: createTimeoutWrapper({
    timeoutMs: TimeoutPresets.LLM_CALL,
    errorMessage: 'AI operation timed out'
  }),

  /** For long-running operations */
  longRunning: createTimeoutWrapper({
    timeoutMs: TimeoutPresets.LONG_RUNNING,
    errorMessage: 'Long-running operation timed out'
  }),
} as const;