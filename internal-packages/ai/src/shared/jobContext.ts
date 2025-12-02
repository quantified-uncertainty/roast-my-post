/**
 * Job Context for logging
 *
 * Uses AsyncLocalStorage to track job ID across async call stack.
 * All loggers can access the current job ID without explicit passing.
 */

import { AsyncLocalStorage } from 'async_hooks';

interface JobContext {
  jobId: string;
}

const jobContextStorage = new AsyncLocalStorage<JobContext>();

/**
 * Get the current job ID from context (if any)
 */
export function getCurrentJobId(): string | undefined {
  return jobContextStorage.getStore()?.jobId;
}

/**
 * Run a function with a job ID in context.
 * All logs within this function (and its async children) will include the job ID.
 */
export function runWithJobId<T>(jobId: string, fn: () => T): T {
  return jobContextStorage.run({ jobId }, fn);
}
