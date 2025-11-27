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
      await this.pgBossService.send(DOCUMENT_EVALUATION_JOB, jobData, {
        id: job.id, // Use Job table ID as pg-boss job ID for easy cancellation
      });
    } catch (error) {
      this.logger.error(`Failed to create pg-boss job for Job ${job.id}:`, error);
      // Mark our Job record as failed since we couldn't queue it
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
    // Cancel pg-boss job first
    try {
      await this.pgBossService.cancel(DOCUMENT_EVALUATION_JOB, jobId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cancel pg-boss job ${jobId}: ${errorMessage}`);
      // Continue to update database even if pg-boss cancellation fails
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
   * Mark a job as running
   */
  async markAsRunning(jobId: string): Promise<void> {
    await this.jobRepository.updateStatus(jobId, {
      status: JobStatus.RUNNING,
      startedAt: new Date(),
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
