// Manual declaration file for @roast/db package
// This ensures the domain package can import the required types

export { prisma } from './client';
export { ensureDbConnected, withDb } from './ensure-connected';

// Repository interfaces and types
export interface DocumentEntity {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: Date | null;
  url: string | null;
  platforms: string[];
  submittedById: string;
  importUrl: string | null;
  ephemeralBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  markdownPrepend?: string;
}

export interface DocumentWithEvaluations {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string | null;
  url: string | null;
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
  submittedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  importUrl: string | null;
  ephemeralBatchId: string | null;
  reviews: any[];
  intendedAgents: string[];
}

export interface CreateDocumentData {
  id?: string;
  title: string;
  content: string;
  authors: string;
  publishedDate?: Date | null;
  url?: string | null;
  platforms?: string[];
  submittedById: string;
  importUrl?: string;
  ephemeralBatchId?: string;
}

export interface UpdateDocumentData {
  intendedAgentIds?: string[];
}

export interface DocumentRepositoryInterface {
  findById(id: string): Promise<DocumentEntity | null>;
  findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
  findByUser(userId: string, limit?: number): Promise<DocumentWithEvaluations[]>;
  findRecent(limit?: number): Promise<DocumentWithEvaluations[]>;
  findAll(): Promise<DocumentWithEvaluations[]>;
  create(data: CreateDocumentData): Promise<DocumentEntity>;
  updateContent(id: string, content: string, title: string): Promise<void>;
  updateMetadata(id: string, data: { intendedAgentIds?: string[] }): Promise<void>;
  delete(id: string): Promise<boolean>;
  checkOwnership(docId: string, userId: string): Promise<boolean>;
  search(query: string, limit?: number): Promise<any[]>;
  getStatistics(): Promise<any>;
}

export class DocumentRepository implements DocumentRepositoryInterface {
  constructor(prismaClient?: any);
  findById(id: string): Promise<DocumentEntity | null>;
  findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
  findByUser(userId: string, limit?: number): Promise<DocumentWithEvaluations[]>;
  findRecent(limit?: number): Promise<DocumentWithEvaluations[]>;
  findAll(): Promise<DocumentWithEvaluations[]>;
  create(data: CreateDocumentData): Promise<DocumentEntity>;
  updateContent(id: string, content: string, title: string): Promise<void>;
  updateMetadata(id: string, data: { intendedAgentIds?: string[] }): Promise<void>;
  delete(id: string): Promise<boolean>;
  checkOwnership(docId: string, userId: string): Promise<boolean>;
  search(query: string, limit?: number): Promise<any[]>;
  getStatistics(): Promise<any>;
}

// Evaluation types
export interface EvaluationRepositoryInterface {
  findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null>;
  findByIdWithAccess(evaluationId: string, userId: string): Promise<any | null>;
  create(documentId: string, agentId: string): Promise<{ id: string }>;
  createJob(evaluationId: string): Promise<{ id: string }>;
  createEvaluationWithJob(documentId: string, agentId: string): Promise<{
    evaluationId: string;
    agentId: string;
    jobId: string;
    created: boolean;
  }>;
  checkDocumentAccess(documentId: string, userId: string): Promise<boolean>;
  checkAgentExists(agentId: string): Promise<boolean>;
}

export class EvaluationRepository implements EvaluationRepositoryInterface {
  constructor(prismaClient?: any);
  findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null>;
  findByIdWithAccess(evaluationId: string, userId: string): Promise<any | null>;
  create(documentId: string, agentId: string): Promise<{ id: string }>;
  createJob(evaluationId: string): Promise<{ id: string }>;
  createEvaluationWithJob(documentId: string, agentId: string): Promise<{
    evaluationId: string;
    agentId: string;
    jobId: string;
    created: boolean;
  }>;
  checkDocumentAccess(documentId: string, userId: string): Promise<boolean>;
  checkAgentExists(agentId: string): Promise<boolean>;
}

// Job types and enums
export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum AgentPurpose {
  ASSESSOR = 'ASSESSOR',
  ADVISOR = 'ADVISOR',
  ENRICHER = 'ENRICHER',
  EXPLAINER = 'EXPLAINER'
}

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
  incrementAttempts(id: string): Promise<JobEntity>;
  getJobsByStatus(status: JobStatus, limit?: number): Promise<JobEntity[]>;
  getJobsOlderThan(date: Date, statuses: JobStatus[]): Promise<JobEntity[]>;
}

export class JobRepository implements JobRepositoryInterface {
  constructor(prismaClient?: any);
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

// Re-export Prisma types as type-only exports
export type { Prisma, PrismaClient } from '../generated';

// Re-export Prisma domain types 
export type {
  User,
  DocumentVersion,
  AgentVersion,
  Evaluation,
  EvaluationVersion,
  Job,
  AgentEvalBatch,
} from '../generated';

// Export EvaluationComment directly (don't alias as Comment to avoid conflicts)
export type { EvaluationComment } from '../generated';

// Re-export base Prisma types that don't conflict with AI package
export type { Document as PrismaDocument, Agent as PrismaAgent } from '../generated';