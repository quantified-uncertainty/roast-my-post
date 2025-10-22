/**
 * Job Repository
 *
 * Pure data access layer for jobs.
 * Handles all database operations related to job processing.
 * Returns domain entities with minimal dependencies.
 */

import { prisma as defaultPrisma } from '../client';
import { JobStatus } from '../types';
import type { Job } from '../types';
import type { PrismaClient } from '../client';
import { generateId } from '../utils/generateId';
import { subHours } from 'date-fns';

// Domain types defined in this package to avoid circular dependencies
export interface JobEntity {
  id: string;
  status: JobStatus;
  evaluationId: string;
  originalJobId: string | null;
  agentEvalBatchId: string | null;
  attempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  llmThinking: string | null;
  priceInDollars: number | null;
  durationInSeconds: number | null;
  logs: string | null;
}

export interface JobWithRelations extends JobEntity {
  evaluation: {
    id: string;
    document: {
      id: string;
      publishedDate: Date;
      versions: Array<{
        id: string;
        title: string;
        content: string;
        fullContent: string;
        authors: string[];
        urls: string[];
        platforms: string[];
        intendedAgents: string[];
        version: number;
      }>;
    };
    agent: {
      id: string;
      submittedBy?: {
        id: string;
        email?: string | null;
      } | null;
      versions: Array<{
        id: string;
        name: string;
        description: string;
        primaryInstructions: string | null;
        selfCritiqueInstructions: string | null;
        providesGrades: boolean;
        extendedCapabilityId: string | null;
        pluginIds: string[];
        version: number;
      }>;
    };
  };
}

export interface CreateJobData {
  evaluationId: string;
  status?: JobStatus;
  agentEvalBatchId?: string;
}

export interface CreateRetryJobData {
  evaluationId: string;
  originalJobId: string;
  attempts: number;
  agentEvalBatchId?: string;
}

export interface UpdateJobStatusData {
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  llmThinking?: string;
  priceInDollars?: number;
  durationInSeconds?: number;
  logs?: string;
}

export interface JobRepositoryInterface {
  findById(id: string): Promise<JobEntity | null>;
  findByIdWithRelations(id: string): Promise<JobWithRelations | null>;
  findNextPendingJob(): Promise<JobWithRelations | null>;
  claimNextPendingJob(): Promise<JobWithRelations | null>;
  create(data: CreateJobData): Promise<JobEntity>;
  createRetry(data: CreateRetryJobData): Promise<JobEntity>;
  updateStatus(id: string, data: UpdateJobStatusData): Promise<JobEntity>;
  getJobAttempts(jobId: string): Promise<JobEntity[]>;
  incrementAttempts(id: string): Promise<JobEntity>;
  getJobsByStatus(status: JobStatus, limit?: number): Promise<JobEntity[]>;
  getJobsOlderThan(date: Date, statuses: JobStatus[]): Promise<JobEntity[]>;
  findJobsForCostUpdate(limit: number, maxAgeHours?: number): Promise<JobEntity[]>;
  updateCost(id: string, cost: number): Promise<JobEntity>;
}

export class JobRepository implements JobRepositoryInterface {
  private prisma: typeof defaultPrisma;

  constructor(prismaClient?: typeof defaultPrisma) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Find a job by ID
   */
  async findById(id: string): Promise<JobEntity | null> {
    const job = await this.prisma.job.findUnique({
      where: { id }
    });

    return job ? this.toDomainEntity(job) : null;
  }

  /**
   * Find a job by ID with all relations needed for processing
   */
  async findByIdWithRelations(id: string): Promise<JobWithRelations | null> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        evaluation: {
          include: {
            document: {
              include: {
                versions: {
                  orderBy: { version: 'desc' as const },
                  take: 1
                }
              }
            },
            agent: {
              include: {
                submittedBy: true,
                versions: {
                  orderBy: { version: 'desc' as const },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    return job ? this.toJobWithRelations(job) : null;
  }

  /**
   * Find the next pending job that's safe to process
   * (doesn't conflict with retries)
   */
  async findNextPendingJob(): Promise<JobWithRelations | null> {
    // Get pending jobs ordered by creation time, with reasonable limit
    const pendingJobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100, // Process up to 100 pending jobs at a time
      select: {
        id: true,
        originalJobId: true,
        createdAt: true,
      },
    });

    // For each pending job, check if it's safe to process
    for (const job of pendingJobs) {
      if (job.originalJobId) {
        // This is a retry - check if any earlier attempts are still pending/running
        const earlierAttempts = await this.prisma.job.findMany({
          where: {
            OR: [
              { id: job.originalJobId },
              {
                AND: [
                  { originalJobId: job.originalJobId },
                  { createdAt: { lt: job.createdAt } }
                ]
              }
            ],
            status: { in: [JobStatus.PENDING, JobStatus.RUNNING] }
          }
        });

        if (earlierAttempts.length > 0) {
          // Skip this retry - earlier attempts are still in progress
          continue;
        }
      }

      // This job is safe to process - fetch with relations
      return await this.findByIdWithRelations(job.id);
    }

    return null;
  }

  /**
   * Atomically claim and mark a pending job as running
   * Returns the claimed job or null if no job available
   */
  async claimNextPendingJob(): Promise<JobWithRelations | null> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Find the oldest pending job with row-level lock
      const pendingStatus = JobStatus.PENDING;
      const job = await tx.$queryRaw<Array<{id: string}>>`
        SELECT id FROM "Job"
        WHERE status = ${pendingStatus}::"JobStatus"
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (!job || job.length === 0) {
        return null;
      }

      const jobId = job[0].id;

      // Update the job to RUNNING status
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.RUNNING,
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Return the job ID for further processing
      return jobId;
    });

    if (!result) {
      return null;
    }

    // Fetch the full job with relations outside the transaction
    return await this.findByIdWithRelations(result);
  }

  /**
   * Create a new job
   */
  async create(data: CreateJobData): Promise<JobEntity> {
    const job = await this.prisma.job.create({
      data: {
        id: generateId(),
        status: data.status || JobStatus.PENDING,
        evaluationId: data.evaluationId,
        agentEvalBatchId: data.agentEvalBatchId,
        attempts: 0,
      },
    });

    return this.toDomainEntity(job);
  }

  /**
   * Create a retry job
   */
  async createRetry(data: CreateRetryJobData): Promise<JobEntity> {
    const job = await this.prisma.job.create({
      data: {
        id: generateId(),
        status: JobStatus.PENDING,
        evaluationId: data.evaluationId,
        originalJobId: data.originalJobId,
        attempts: data.attempts,
        agentEvalBatchId: data.agentEvalBatchId,
      },
    });

    return this.toDomainEntity(job);
  }

  /**
   * Update job status and related fields
   */
  async updateStatus(id: string, data: UpdateJobStatusData): Promise<JobEntity> {
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.startedAt && { startedAt: data.startedAt }),
        ...(data.completedAt && { completedAt: data.completedAt }),
        ...(data.error !== undefined && { error: data.error }),
        ...(data.llmThinking !== undefined && { llmThinking: data.llmThinking }),
        ...(data.priceInDollars !== undefined && { priceInDollars: data.priceInDollars }),
        ...(data.durationInSeconds !== undefined && { durationInSeconds: data.durationInSeconds }),
        ...(data.logs !== undefined && { logs: data.logs }),
      },
    });

    return this.toDomainEntity(job);
  }

  /**
   * Get all job attempts (original + retries) for a given job
   */
  async getJobAttempts(jobId: string): Promise<JobEntity[]> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { originalJobId: true }
    });

    if (!job) return [];

    // If this is a retry, use its originalJobId, otherwise use the jobId itself
    const originalId = job.originalJobId || jobId;

    // Get all attempts for this original job
    const attempts = await this.prisma.job.findMany({
      where: {
        OR: [
          { id: originalId },
          { originalJobId: originalId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    return attempts.map(job => this.toDomainEntity(job));
  }

  /**
   * Increment attempt counter
   */
  async incrementAttempts(id: string): Promise<JobEntity> {
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        attempts: { increment: 1 }
      }
    });

    return this.toDomainEntity(job);
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: JobStatus, limit = 100): Promise<JobEntity[]> {
    const jobs = await this.prisma.job.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map(job => this.toDomainEntity(job));
  }

  /**
   * Get stale jobs older than a specific date with given statuses
   */
  async getJobsOlderThan(date: Date, statuses: JobStatus[]): Promise<JobEntity[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        status: { in: statuses },
        createdAt: { lt: date }
      },
      orderBy: { createdAt: 'asc' }
    });

    return jobs.map(job => this.toDomainEntity(job));
  }

  /**
   * Find jobs that need their cost updated from Helicone
   */
  async findJobsForCostUpdate(limit = 10, maxAgeHours?: number): Promise<JobEntity[]> {
    const completedAtFilter = maxAgeHours
      ? { not: null, gte: subHours(new Date(), maxAgeHours) }
      : { not: null };

    const jobs = await this.prisma.job.findMany({
      where: {
        completedAt: completedAtFilter,
        priceInDollars: null,
        evaluation: {
          agent: {
            isLlmCostTracked: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'asc',
      },
    });
    return jobs.map(job => this.toDomainEntity(job));
  }

  /**
   * Update the cost of a job
   */
  async updateCost(id: string, cost: number): Promise<JobEntity> {
    const job = await this.prisma.job.update({
      where: { id },
      data: { priceInDollars: cost },
    });
    return this.toDomainEntity(job);
  }

  /**
   * Convert database record to domain entity
   */
  private toDomainEntity(job: any): JobEntity {
    return {
      id: job.id,
      status: job.status as JobStatus, // Cast from Prisma enum to our enum
      evaluationId: job.evaluationId,
      originalJobId: job.originalJobId,
      agentEvalBatchId: job.agentEvalBatchId,
      attempts: job.attempts,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      llmThinking: job.llmThinking,
      priceInDollars: job.priceInDollars ? Number(job.priceInDollars) : null, // Convert Decimal to number
      durationInSeconds: job.durationInSeconds ? Number(job.durationInSeconds) : null, // Convert Decimal to number
      logs: job.logs,
    };
  }

  /**
   * Convert database record with relations to job with relations
   */
  private toJobWithRelations(job: any): JobWithRelations {
    return {
      ...this.toDomainEntity(job),
      evaluation: {
        id: job.evaluation.id,
        document: {
          id: job.evaluation.document.id,
          publishedDate: job.evaluation.document.publishedDate,
          versions: job.evaluation.document.versions.map((v: any) => ({
            id: v.id,
            title: v.title,
            content: v.content,
            // Compute fullContent: prepend + content if prepend exists, otherwise just content
            fullContent: v.markdownPrepend ? v.markdownPrepend + v.content : v.content,
            authors: v.authors,
            urls: v.urls,
            platforms: v.platforms,
            intendedAgents: v.intendedAgents,
            version: v.version,
          })),
        },
        agent: {
          id: job.evaluation.agent.id,
          submittedBy: job.evaluation.agent.submittedBy ? {
            id: job.evaluation.agent.submittedBy.id,
            email: job.evaluation.agent.submittedBy.email,
          } : null,
          versions: job.evaluation.agent.versions.map((v: any) => ({
            id: v.id,
            name: v.name,
            description: v.description,
            primaryInstructions: v.primaryInstructions,
            selfCritiqueInstructions: v.selfCritiqueInstructions,
            providesGrades: v.providesGrades,
            extendedCapabilityId: v.extendedCapabilityId,
            pluginIds: v.pluginIds || [],
            version: v.version,
          })),
        },
      },
    };
  }
}
