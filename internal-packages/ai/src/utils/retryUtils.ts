/**
 * Retry utilities for AI operations
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  logPrefix?: string;
}

/**
 * Execute a function with exponential backoff retry logic
 * @param fn The async function to execute
 * @param options Retry configuration
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelayMs, logPrefix = '[Retry]' } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between retries (exponential backoff)
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * baseDelayMs;
        console.log(`${logPrefix} Retrying (attempt ${attempt}/${maxRetries}) after ${delay}ms delay`);
        await sleep(delay);
      }

      const result = await fn();

      if (attempt > 1) {
        console.log(`${logPrefix} Succeeded on attempt ${attempt}`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isLastAttempt = attempt === maxRetries;
      
      console.error(`${logPrefix} Error (attempt ${attempt}/${maxRetries})`, {
        error: errorMessage,
        isLastAttempt
      });
      
      if (isLastAttempt) {
        throw error;
      }
    }
  }

  // This should never be reached due to the throw above
  throw new Error(`${logPrefix} Failed after ${maxRetries} attempts`);
}

/**
 * Sleep for the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}