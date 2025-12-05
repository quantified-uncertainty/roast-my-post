/**
 * Job Context
 *
 * Uses AsyncLocalStorage to propagate job context through async call stack:
 * - Worker ID: Identifies which worker instance is processing (for log filtering)
 * - Job ID: Current job being processed
 * - Timeout: Job deadline for graceful timeout handling
 */

import { AsyncLocalStorage } from 'async_hooks';
import { hostname } from 'os';

interface JobContext {
  workerId: string;
  jobId?: string;
  startTime?: number;
  timeoutMs?: number;
}

const contextStorage = new AsyncLocalStorage<JobContext>();

/**
 * Generate worker ID: hostname(last 4) + pid(4), max 8 chars
 * Uses last 4 chars of hostname since prefixes are often identical across workers
 * Example: "er-11234" or "xyz95678"
 */
function generateWorkerId(): string {
  const host = hostname().slice(-4);
  const pid = process.pid.toString().slice(-4).padStart(4, '0');
  return `${host}${pid}`.slice(0, 8);
}

let globalWorkerId: string | undefined;

/**
 * Initialize worker context at startup.
 * Call once when worker process starts.
 */
export function initWorkerContext(): void {
  globalWorkerId = generateWorkerId();
}

/**
 * Get worker ID (from context or global)
 */
export function getWorkerId(): string | undefined {
  return contextStorage.getStore()?.workerId ?? globalWorkerId;
}

/**
 * Get current job ID from context
 */
export function getCurrentJobId(): string | undefined {
  return contextStorage.getStore()?.jobId;
}

/**
 * Run a function with full job context.
 * Sets job ID, start time, and timeout for the duration of the function.
 */
export function runWithJobContext<T>(
  opts: { jobId: string; timeoutMs: number },
  fn: () => T
): T {
  return contextStorage.run(
    {
      workerId: globalWorkerId ?? generateWorkerId(),
      jobId: opts.jobId,
      startTime: Date.now(),
      timeoutMs: opts.timeoutMs,
    },
    fn
  );
}

/**
 * Get remaining time until job timeout (in milliseconds).
 * Returns undefined if no timeout context is set.
 */
export function getRemainingTimeMs(): number | undefined {
  const ctx = contextStorage.getStore();
  if (!ctx?.startTime || !ctx?.timeoutMs) return undefined;
  return Math.max(0, ctx.timeoutMs - (Date.now() - ctx.startTime));
}

/**
 * Minimum time buffer (15s) to ensure there's enough time for a meaningful API call.
 * If less than this time remains, we consider the job effectively timed out
 * to avoid wasted API calls that would almost certainly fail.
 */
const MIN_TIME_BUFFER_MS = 15000;

/**
 * Check if job has exceeded its timeout (or doesn't have enough time remaining)
 */
export function isJobTimedOut(): boolean {
  const remaining = getRemainingTimeMs();
  return remaining !== undefined && remaining < MIN_TIME_BUFFER_MS;
}

/**
 * Error thrown when job timeout is exceeded
 */
export class JobTimeoutError extends Error {
  constructor(message = 'Job timeout exceeded') {
    super(message);
    this.name = 'JobTimeoutError';
  }
}

/**
 * Check job timeout and throw if exceeded.
 * Call between major operations to enable graceful early exit.
 */
export function checkJobTimeout(): void {
  if (isJobTimedOut()) {
    throw new JobTimeoutError();
  }
}
