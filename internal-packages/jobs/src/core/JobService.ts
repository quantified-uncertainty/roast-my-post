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

export class JobService {
  constructor(
    private jobRepository: JobRepository,
    private logger: Logger,
    private pgBossService: PgBossService
  ) {}

  async initialize() {
    await this.pgBossService.initialize();
  }

  /**
   * Create a job for processing
   * Creates both Job table record and pg-boss queue entry
   */
  async createJob(evaluationId: string, agentEvalBatchId?: string): Promise<JobEntity> {
    // Create Job table record first
    const job = await this.jobRepository.create({
      evaluationId,
      agentEvalBatchId: agentEvalBatchId || undefined,
    });

    const jobData = {
      jobId: job.id,
      evaluationId,
      agentEvalBatchId: agentEvalBatchId || null,
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
    return this.markAsCancelled(jobId);
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
    return this.jobRepository.updateStatus(jobId, {
      status: JobStatus.COMPLETED,
      completedAt: new Date(),
      llmThinking: data.llmThinking,
      durationInSeconds: data.durationInSeconds,
      logs: data.logs,
    });
  }

  /**
   * Mark a job as failed
   */
  async markAsFailed(jobId: string, error: unknown): Promise<JobEntity> {
    return this.jobRepository.updateStatus(jobId, {
      status: JobStatus.FAILED,
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date(),
    });
  }

}
