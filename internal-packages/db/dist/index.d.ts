// Minimal declaration file for @roast/db to fix module resolution

export { prisma } from './client';
export { ensureDbConnected, withDb } from './ensure-connected';

// Repositories
export * from './repositories/DocumentRepository';
export * from './repositories/EvaluationRepository';
export * from './repositories/JobRepository';

// Types
export * from './types';

// Direct exports from generated types
export type { EvaluationComment } from '../generated';

// Additional exports for job types
export type { CreateJobData, UpdateJobStatusData, CreateRetryJobData, JobRepositoryInterface } from './repositories/JobRepository';