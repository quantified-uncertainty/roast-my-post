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

export interface JobRepositoryInterface {
  findById(id: string): Promise<JobEntity | null>;
  findByIdWithRelations(id: string): Promise<JobWithRelations | null>;
  create(data: CreateJobData): Promise<JobEntity>;
  updateStatus(id: string, data: UpdateJobStatusData): Promise<JobEntity>;
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
      cancellationReason: job.cancellationReason || null,
      cancelledAt: job.cancelledAt || null,
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
