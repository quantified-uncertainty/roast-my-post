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
      submittedBy: {
        id: string;
        name: string | null;
        email: string;
      };
      versions: Array<{
        id: string;
        name: string;
        description: string;
        version: number;
        primaryInstructions: string | null;
        selfCritiqueInstructions: string | null;
        providesGrades: boolean;
        extendedCapabilityId: string | null;
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
}

export declare class JobRepository implements JobRepositoryInterface {
  constructor(prismaClient?: any);
  findById(id: string): Promise<JobEntity | null>;
  findByIdWithRelations(id: string): Promise<JobWithRelations | null>;
  findNextPendingJob(): Promise<JobWithRelations | null>;
  claimNextPendingJob(): Promise<JobWithRelations | null>;
  create(data: CreateJobData): Promise<JobEntity>;
  createRetry(data: CreateRetryJobData): Promise<JobEntity>;
  updateStatus(id: string, data: UpdateJobStatusData): Promise<JobEntity>;
  getJobAttempts(jobId: string): Promise<JobEntity[]>;
}