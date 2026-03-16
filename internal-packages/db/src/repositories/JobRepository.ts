/**
 * Job Repository
 *
 * Pure data access layer for jobs.
 * Handles all database operations related to job processing.
 * Returns domain entities with minimal dependencies.
 */

import { prisma as defaultPrisma } from '../client';
import { JobStatus } from '../types';
import { generateId } from '../utils/generateId';
import { subHours } from 'date-fns';

// Domain types defined in this package to avoid circular dependencies
export interface JobEntity {
  id: string;
  pgBossJobId: string | null;
  status: JobStatus;
  evaluationId: string;
  originalJobId: string | null;
  agentEvalBatchId: string | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  llmThinking: string | null;
  priceInDollars: number | null;
  durationInSeconds: number | null;
  logs: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
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

export interface UpdateJobStatusData {
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string | null;
  llmThinking?: string | null;
  priceInDollars?: number;
  durationInSeconds?: number;
  logs?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  attempts?: number;
}

export interface BatchCompletionResult {
  id: string;
  completedAt: Date;
}

export interface DocumentCompletionResult {
  id: string;
  notifiedAt: Date;
}

export interface StaleJobCriteria {
  status: JobStatus;
  thresholdMs: number;
}

export interface StaleJobResult {
  id: string;
  status: JobStatus;
  pgBossJobId: string | null;
  updatedAt: Date;
}

export interface JobRepositoryInterface {
  findById(id: string): Promise<JobEntity | null>;
  findByIdWithRelations(id: string): Promise<JobWithRelations | null>;
  create(data: CreateJobData): Promise<JobEntity>;
  updateStatus(id: string, data: UpdateJobStatusData): Promise<JobEntity>;
  findJobsForCostUpdate(limit: number, maxAgeHours?: number): Promise<JobEntity[]>;
  updateCost(id: string, cost: number): Promise<JobEntity>;
  findStaleJobs(criteria: StaleJobCriteria[]): Promise<StaleJobResult[]>;
  tryMarkBatchCompleted(batchId: string): Promise<BatchCompletionResult | null>;
  getDocumentIdForJob(jobId: string): Promise<string | null>;
  tryMarkDocumentCompleted(documentId: string): Promise<DocumentCompletionResult | null>;
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
   * Set the pg-boss job ID for a job
   */
  async setPgBossJobId(id: string, pgBossJobId: string): Promise<JobEntity> {
    const job = await this.prisma.job.update({
      where: { id },
      data: { pgBossJobId },
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
        ...(data.cancellationReason !== undefined && { cancellationReason: data.cancellationReason }),
        ...(data.cancelledAt !== undefined && { cancelledAt: data.cancelledAt }),
        ...(data.attempts !== undefined && { attempts: data.attempts }),
      },
    });

    return this.toDomainEntity(job);
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
   * Find stale jobs
   */
  async findStaleJobs(criteria: StaleJobCriteria[]): Promise<StaleJobResult[]> {
    const orConditions = criteria.map(({ status, thresholdMs }) => ({
      status,
      updatedAt: { lt: new Date(Date.now() - thresholdMs) },
    }));

    const jobs = await this.prisma.job.findMany({
      where: {
        OR: orConditions,
      },
      select: { id: true, status: true, pgBossJobId: true, updatedAt: true },
    });

    return jobs.map(job => ({
      ...job,
      status: job.status as JobStatus,
    }));
  }

  /**
   * Convert database record to domain entity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Prisma result
  private toDomainEntity(job: any): JobEntity {
    return {
      id: job.id,
      pgBossJobId: job.pgBossJobId || null,
      status: job.status as JobStatus, // Cast from Prisma enum to our enum
      evaluationId: job.evaluationId,
      originalJobId: job.originalJobId,
      agentEvalBatchId: job.agentEvalBatchId,
      attempts: job.attempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      llmThinking: job.llmThinking,
      priceInDollars: job.priceInDollars ? Number(job.priceInDollars) : null, // Convert Decimal to number
      durationInSeconds: job.durationInSeconds ? Number(job.durationInSeconds) : null, // Convert Decimal to number
      logs: job.logs,
      cancellationReason: job.cancellationReason || null,
      cancelledAt: job.cancelledAt || null,
    };
  }

  /**
   * Convert database record with relations to job with relations
   */
  /**
   * Atomically mark a batch as completed if all jobs are in terminal states.
   * Returns the batch ID if this call "won" the completion, null otherwise.
   * The `completedAt IS NULL` condition prevents duplicate completions.
   */
  async tryMarkBatchCompleted(batchId: string): Promise<BatchCompletionResult | null> {
    const result = await this.prisma.$queryRaw<BatchCompletionResult[]>`
      UPDATE "AgentEvalBatch"
      SET "completedAt" = NOW()
      WHERE id = ${batchId}
        AND "completedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "Job"
          WHERE "agentEvalBatchId" = ${batchId}
            AND status IN ('PENDING', 'RUNNING')
        )
      RETURNING id, "completedAt"
    `;

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get the documentId associated with a job (via its evaluation).
   */
  async getDocumentIdForJob(jobId: string): Promise<string | null> {
    const result = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { evaluation: { select: { documentId: true } } },
    });
    return result?.evaluation.documentId ?? null;
  }

  /**
   * Atomically mark a document as notification-sent if all jobs are terminal.
   * Returns the document ID if this call "won" the completion, null otherwise.
   *
   * Supports re-evaluations: if new jobs were created after the last notification,
   * the notification cycle resets automatically (no external reset needed).
   */
  async tryMarkDocumentCompleted(documentId: string): Promise<DocumentCompletionResult | null> {
    const result = await this.prisma.$queryRaw<DocumentCompletionResult[]>`
      UPDATE "Document"
      SET "notifiedAt" = NOW()
      WHERE id = ${documentId}
        AND "notifyOnComplete" = true
        AND NOT EXISTS (
          SELECT 1 FROM "Job" j
          JOIN "Evaluation" e ON e.id = j."evaluationId"
          WHERE e."documentId" = ${documentId}
            AND j.status IN ('PENDING', 'RUNNING')
        )
        AND (
          "notifiedAt" IS NULL
          OR EXISTS (
            SELECT 1 FROM "Job" j
            JOIN "Evaluation" e ON e.id = j."evaluationId"
            WHERE e."documentId" = ${documentId}
              AND j."createdAt" > "Document"."notifiedAt"
          )
        )
      RETURNING id, "notifiedAt"
    `;

    return result.length > 0 ? result[0] : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Prisma result with complex include shape
  private toJobWithRelations(job: any): JobWithRelations {
    return {
      ...this.toDomainEntity(job),
      evaluation: {
        id: job.evaluation.id,
        document: {
          id: job.evaluation.document.id,
          publishedDate: job.evaluation.document.publishedDate,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Prisma document version
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Prisma agent version
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
