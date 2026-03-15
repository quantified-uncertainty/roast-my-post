/**
 * JobService
 *
 * Provides a minimal interface for job operations.
 *
 * Architecture:
 * - Web app: Initializes pg-boss to submit jobs
 * - Worker process: Initializes pg-boss to process jobs
 */

import { JobStatus, type JobEntity, type JobRepository } from '@roast/db';
import { PgBossService } from './PgBossService';
import { DOCUMENT_EVALUATION_JOB } from '../types/jobTypes';
import type { Logger } from '../types';

export interface BatchCompletionHandler {
  onBatchCompleted(batchId: string): Promise<void>;
}

export interface DocumentCompletionHandler {
  onDocumentCompleted(documentId: string): Promise<void>;
}

export class JobService {
  private batchCompletionHandler?: BatchCompletionHandler;
  private documentCompletionHandler?: DocumentCompletionHandler;

  constructor(
    private jobRepository: JobRepository,
    private logger: Logger,
    private pgBossService: PgBossService
  ) {}

  /**
   * Set an optional handler that is called when a batch completes.
   * Used by the worker to trigger email notifications.
   */
  setBatchCompletionHandler(handler: BatchCompletionHandler): void {
    this.batchCompletionHandler = handler;
  }

  /**
   * Set an optional handler that is called when all jobs for a document complete.
   * Used by the worker to trigger email notifications.
   */
  setDocumentCompletionHandler(handler: DocumentCompletionHandler): void {
    this.documentCompletionHandler = handler;
  }

  async initialize() {
    await this.pgBossService.initialize();
  }

  /**
   * Create a job for processing
   * Creates both Job table record and pg-boss queue entry
   *
   * @param evaluationId - The evaluation to process
   * @param agentEvalBatchId - Optional batch ID for grouping jobs
   * @param profileId - Optional profile ID for plugin configuration (e.g., FallacyCheckPlugin)
   */
  async createJob(evaluationId: string, agentEvalBatchId?: string, profileId?: string): Promise<JobEntity> {
    // Lazy-init prevents race conditions by ensuring the queue is connected
    // before we try to use it. Safe to call repeatedly due to promise locking.
    //
    // Context: In Next.js/Serverless environments, there is no single "main"
    // function to await global initialization. Use-case specific lazy loading
    // is the safest way to ensure the connection is ready when needed.
    await this.pgBossService.initialize();

    // Create Job table record first
    const job = await this.jobRepository.create({
      evaluationId,
      agentEvalBatchId: agentEvalBatchId || undefined,
    });

    const jobData = {
      jobId: job.id,
      evaluationId,
      agentEvalBatchId: agentEvalBatchId || null,
      profileId: profileId || null,
    };

    try {
      // Let pg-boss generate its own UUID
      const pgBossJobId = await this.pgBossService.send(DOCUMENT_EVALUATION_JOB, jobData);

      if (!pgBossJobId) {
        throw new Error('pg-boss returned null job ID');
      }

      await this.jobRepository.setPgBossJobId(job.id, pgBossJobId);
    } catch (error) {
      this.logger.error(`Failed to create pg-boss job for Job ${job.id}:`, error);
      await this.markAsFailed(
        job.id,
        `Failed to queue job: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    return job;
  }


  /**
   * Cancel a job
   * Cancels both the pg-boss queue job and updates the database status
   */
  async cancelJob(jobId: string): Promise<JobEntity> {
    await this.pgBossService.initialize();

    // Get the job to find its pgBossJobId
    const job = await this.jobRepository.findById(jobId);

    // Cancel pg-boss job if we have the pgBossJobId
    if (job?.pgBossJobId) {
      try {
        await this.pgBossService.cancel(DOCUMENT_EVALUATION_JOB, job.pgBossJobId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to cancel pg-boss job ${job.pgBossJobId}: ${errorMessage}`);
        // Continue to update database even if pg-boss cancellation fails
      }
    }

    // Update database to mark as cancelled
    const cancelledJob = await this.markAsCancelled(jobId);
    await this.checkBatchCompletion(cancelledJob);
    await this.checkDocumentCompletion(cancelledJob);
    return cancelledJob;
  }

  /**
   * Mark a job as cancelled in the database
   */
  private async markAsCancelled(jobId: string): Promise<JobEntity> {
    return this.jobRepository.updateStatus(jobId, {
      status: JobStatus.CANCELLED,
      completedAt: new Date(),
      cancellationReason: 'Cancelled by user',
      cancelledAt: new Date(),
    });
  }

  /**
   * Mark a job as running and track the attempt number
   * @param jobId - The job ID
   * @param attempts - The current attempt number (1-indexed)
   */
  async markAsRunning(jobId: string, attempts: number = 1): Promise<void> {
    await this.jobRepository.updateStatus(jobId, {
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      attempts,
    });
  }

  /**
   * Mark a job as completed
   */
  async markAsCompleted(
    jobId: string,
    data: {
      llmThinking: string | null;
      durationInSeconds: number;
      logs: string;
    }
  ) {
    const completedJob = await this.jobRepository.updateStatus(jobId, {
      status: JobStatus.COMPLETED,
      completedAt: new Date(),
      llmThinking: data.llmThinking,
      durationInSeconds: data.durationInSeconds,
      logs: data.logs,
    });
    await this.checkBatchCompletion(completedJob);
    await this.checkDocumentCompletion(completedJob);
    return completedJob;
  }

  /**
   * Mark a job as failed
   */
  async markAsFailed(jobId: string, error: unknown): Promise<JobEntity> {
    const failedJob = await this.jobRepository.updateStatus(jobId, {
      status: JobStatus.FAILED,
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date(),
    });
    await this.checkBatchCompletion(failedJob);
    await this.checkDocumentCompletion(failedJob);
    return failedJob;
  }

  /**
   * Check if a job's batch is now complete (all jobs in terminal states).
   * Uses an atomic UPDATE to ensure only one worker detects completion.
   */
  private async checkBatchCompletion(job: JobEntity): Promise<void> {
    if (!job.agentEvalBatchId) return;

    try {
      const result = await this.jobRepository.tryMarkBatchCompleted(job.agentEvalBatchId);
      if (result) {
        this.logger.info(`Batch ${result.id} completed at ${result.completedAt.toISOString()}`);
        if (this.batchCompletionHandler) {
          await this.batchCompletionHandler.onBatchCompleted(result.id);
        }
      }
    } catch (error) {
      // Batch completion tracking is non-critical — don't fail the job
      this.logger.error(`Failed to check batch completion for batch ${job.agentEvalBatchId}:`, error);
    }
  }

  /**
   * Check if all jobs for a document are now complete.
   * Uses an atomic UPDATE to ensure only one worker detects completion.
   */
  private async checkDocumentCompletion(job: JobEntity): Promise<void> {
    // Only detect completion when a handler is attached (worker process).
    // Without this guard, web-side cancellations would consume the completion
    // edge and set notifiedAt without being able to send an email.
    if (!this.documentCompletionHandler) return;

    try {
      const documentId = await this.jobRepository.getDocumentIdForJob(job.id);
      if (!documentId) return;

      const result = await this.jobRepository.tryMarkDocumentCompleted(documentId);
      if (result) {
        this.logger.info(`Document ${result.id} evaluations completed`);
        await this.documentCompletionHandler.onDocumentCompleted(result.id);
      }
    } catch (error) {
      // Document completion tracking is non-critical — don't fail the job
      this.logger.error(`Failed to check document completion for job ${job.id}:`, error);
    }
  }
}
