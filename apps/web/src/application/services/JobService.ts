/**
 * JobService Facade
 * 
 * Provides a minimal interface for job operations needed by the web app.
 * The actual job processing logic lives in @roast/jobs package.
 * This facade exists to maintain backwards compatibility with existing API routes.
 */

import { prisma, JobStatus, type JobEntity } from '@roast/db';

export class JobService {
  /**
   * Map Prisma Job to JobEntity
   */
  private mapToEntity(job: any): JobEntity {
    return {
      id: job.id,
      status: job.status as JobStatus,
      evaluationId: job.evaluationId,
      originalJobId: job.originalJobId,
      agentEvalBatchId: job.agentEvalBatchId,
      attempts: job.attempts,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      llmThinking: job.llmThinking,
      priceInDollars: job.priceInDollars,
      durationInSeconds: job.durationInSeconds,
      logs: job.logs,
    };
  }

  /**
   * Create a job for processing
   */
  async createJob(evaluationId: string, agentEvalBatchId?: string): Promise<JobEntity> {
    const job = await prisma.job.create({
      data: {
        evaluationId,
        status: JobStatus.PENDING,
        createdAt: new Date(),
        agentEvalBatchId,
      },
    });
    return this.mapToEntity(job);
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: string): Promise<JobEntity | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });
    return job ? this.mapToEntity(job) : null;
  }

  /**
   * Get jobs for an evaluation
   */
  async getJobsForEvaluation(evaluationId: string): Promise<JobEntity[]> {
    const jobs = await prisma.job.findMany({
      where: { evaluationId },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map(job => this.mapToEntity(job));
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<JobEntity> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
      },
    });
    return this.mapToEntity(job);
  }

  /**
   * Mark a job as failed with error details
   */
  async markAsFailed(jobId: string, error: Error): Promise<JobEntity> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        error: error.message,
      },
    });
    return this.mapToEntity(job);
  }
}