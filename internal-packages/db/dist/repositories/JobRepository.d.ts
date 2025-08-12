/**
 * Job Repository
 *
 * Pure data access layer for jobs.
 * Handles all database operations related to job processing.
 * Returns domain entities with minimal dependencies.
 */
import { prisma as defaultPrisma } from '../client';
import { JobStatus } from '../types';
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
}
export declare class JobRepository implements JobRepositoryInterface {
    private prisma;
    constructor(prismaClient?: typeof defaultPrisma);
    /**
     * Find a job by ID
     */
    findById(id: string): Promise<JobEntity | null>;
    /**
     * Find a job by ID with all relations needed for processing
     */
    findByIdWithRelations(id: string): Promise<JobWithRelations | null>;
    /**
     * Find the next pending job that's safe to process
     * (doesn't conflict with retries)
     */
    findNextPendingJob(): Promise<JobWithRelations | null>;
    /**
     * Atomically claim and mark a pending job as running
     * Returns the claimed job or null if no job available
     */
    claimNextPendingJob(): Promise<JobWithRelations | null>;
    /**
     * Create a new job
     */
    create(data: CreateJobData): Promise<JobEntity>;
    /**
     * Create a retry job
     */
    createRetry(data: CreateRetryJobData): Promise<JobEntity>;
    /**
     * Update job status and related fields
     */
    updateStatus(id: string, data: UpdateJobStatusData): Promise<JobEntity>;
    /**
     * Get all job attempts (original + retries) for a given job
     */
    getJobAttempts(jobId: string): Promise<JobEntity[]>;
    /**
     * Increment attempt counter
     */
    incrementAttempts(id: string): Promise<JobEntity>;
    /**
     * Get jobs by status
     */
    getJobsByStatus(status: JobStatus, limit?: number): Promise<JobEntity[]>;
    /**
     * Get stale jobs older than a specific date with given statuses
     */
    getJobsOlderThan(date: Date, statuses: JobStatus[]): Promise<JobEntity[]>;
    /**
     * Convert database record to domain entity
     */
    private toDomainEntity;
    /**
     * Convert database record with relations to job with relations
     */
    private toJobWithRelations;
}
//# sourceMappingURL=JobRepository.d.ts.map