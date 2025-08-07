/**
 * Job Service
 * 
 * Business logic layer for job processing.
 * Handles job lifecycle, retry decisions, and status management.
 * Orchestrates between repository and workflow layers.
 */

import type { 
  JobRepository, 
  JobEntity, 
  JobWithRelations, 
  CreateJobData, 
  UpdateJobStatusData 
} from '@roast/db';
import { JobStatus } from '@roast/db';
import { Logger } from '@roast/domain';

export interface JobServiceInterface {
  findNextPendingJob(): Promise<JobWithRelations | null>;
  claimNextPendingJob(): Promise<JobWithRelations | null>;
  createJob(data: CreateJobData): Promise<JobEntity>;
  markAsRunning(id: string): Promise<JobEntity>;
  markAsCompleted(id: string, data: CompletionData): Promise<JobEntity>;
  markAsFailed(id: string, error: unknown): Promise<JobEntity>;
  shouldRetry(error: unknown, attempts: number): Promise<boolean>;
  createRetryJob(originalJob: JobEntity): Promise<JobEntity>;
  getJobAttempts(jobId: string): Promise<JobEntity[]>;
  sanitizeErrorMessage(error: unknown): string;
}

export interface CompletionData {
  llmThinking: string | null;
  priceInDollars: number;
  durationInSeconds: number;
  logs: string;
}

export class JobService implements JobServiceInterface {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly ERROR_MESSAGE_MAX_LENGTH = 1000;

  constructor(
    private jobRepository: JobRepository,
    private logger: Logger
  ) {}

  /**
   * Find the next job that can be processed safely
   */
  async findNextPendingJob(): Promise<JobWithRelations | null> {
    return await this.jobRepository.findNextPendingJob();
  }

  /**
   * Atomically claim the next pending job for processing
   */
  async claimNextPendingJob(): Promise<JobWithRelations | null> {
    return await this.jobRepository.claimNextPendingJob();
  }

  /**
   * Create a new job
   */
  async createJob(data: CreateJobData): Promise<JobEntity> {
    return await this.jobRepository.create(data);
  }

  /**
   * Mark job as running (for manual status updates)
   */
  async markAsRunning(id: string): Promise<JobEntity> {
    return await this.jobRepository.updateStatus(id, {
      status: JobStatus.RUNNING,
      startedAt: new Date(),
    });
  }

  /**
   * Mark job as completed successfully
   */
  async markAsCompleted(id: string, data: CompletionData): Promise<JobEntity> {
    return await this.jobRepository.updateStatus(id, {
      status: JobStatus.COMPLETED,
      completedAt: new Date(),
      llmThinking: data.llmThinking || undefined, // Convert null to undefined
      priceInDollars: data.priceInDollars,
      durationInSeconds: data.durationInSeconds,
      logs: data.logs,
    });
  }

  /**
   * Mark job as failed and potentially create retry
   */
  async markAsFailed(id: string, error: unknown): Promise<JobEntity> {
    const job = await this.jobRepository.findById(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    // Sanitize and truncate error message
    const errorMessage = this.sanitizeErrorMessage(error);

    // Log the failure
    this.logger.error(`Marking job ${id} as failed with error: ${errorMessage}`);

    try {
      // Update job as failed
      const updatedJob = await this.jobRepository.updateStatus(id, {
        status: JobStatus.FAILED,
        error: errorMessage,
        completedAt: new Date(),
      });

      this.logger.info(`Successfully marked job ${id} as FAILED`);

      // Check if we should create a retry
      if (await this.shouldRetry(error, job.attempts)) {
        const retryJob = await this.createRetryJob(job);
        this.logger.info(`Created retry job ${retryJob.id} for failed job ${id}`);
      } else {
        const reason = !this.isRetryableError(errorMessage) 
          ? "non-retryable error" 
          : `max attempts (${JobService.MAX_RETRY_ATTEMPTS}) reached`;
        this.logger.info(`Not retrying job ${id}: ${reason}`);
      }

      return updatedJob;
    } catch (dbError) {
      this.logger.error(`Failed to update job ${id} status to FAILED:`, dbError);
      throw dbError;
    }
  }

  /**
   * Determine if job should be retried
   */
  async shouldRetry(error: unknown, attempts: number): Promise<boolean> {
    const errorMessage = this.sanitizeErrorMessage(error);
    
    // Check if error is retryable and we haven't exceeded max attempts
    return this.isRetryableError(errorMessage) && attempts < JobService.MAX_RETRY_ATTEMPTS;
  }

  /**
   * Create a retry job for a failed job
   */
  async createRetryJob(originalJob: JobEntity): Promise<JobEntity> {
    return await this.jobRepository.createRetry({
      evaluationId: originalJob.evaluationId,
      originalJobId: originalJob.originalJobId || originalJob.id,
      attempts: originalJob.attempts + 1,
      agentEvalBatchId: originalJob.agentEvalBatchId || undefined, // Convert null to undefined
    });
  }

  /**
   * Get all attempts for a job (original + retries)
   */
  async getJobAttempts(jobId: string): Promise<JobEntity[]> {
    return await this.jobRepository.getJobAttempts(jobId);
  }

  /**
   * Sanitize error message for database storage
   */
  sanitizeErrorMessage(error: unknown): string {
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Remove problematic Unicode characters that might cause database issues
    errorMessage = errorMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Truncate if too long
    if (errorMessage.length > JobService.ERROR_MESSAGE_MAX_LENGTH) {
      errorMessage = errorMessage.substring(0, JobService.ERROR_MESSAGE_MAX_LENGTH - 3) + '...';
    }
    
    return errorMessage;
  }

  /**
   * Determine if an error should trigger a retry
   */
  private isRetryableError(errorMessage: string): boolean {
    // Don't retry validation errors or permanent failures
    const nonRetryablePatterns = [
      'validation',
      'invalid',
      'not found',
      'unauthorized',
      'forbidden',
      'bad request',
      'schema error',
      'type error',
      'syntax error'
    ];
    
    const lowerError = errorMessage.toLowerCase();
    if (nonRetryablePatterns.some(pattern => lowerError.includes(pattern))) {
      return false;
    }

    // Retry network/API/timeout errors
    const retryablePatterns = [
      'timeout',
      'timed out',
      'econnrefused',
      'econnreset',
      'socket hang up',
      'rate limit',
      'too many requests',
      '429',
      '502',
      '503',
      '504',
      'internal server error',
      '500',
      'network',
      'api error',
      'service unavailable',
      'gateway timeout',
      'connection reset'
    ];
    
    return retryablePatterns.some(pattern => lowerError.includes(pattern));
  }
}