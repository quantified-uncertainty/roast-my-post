// CLI-safe exports - safe to use in CLI scripts and server contexts
export { prisma as cliPrisma } from './cli-client';

// CLI-safe repositories (only JobRepository for now, others use server-only client)
export { 
  JobRepository,
  type JobEntity,
  type JobWithRelations,
  type CreateJobData,
  type UpdateJobStatusData,
  type JobRepositoryInterface
} from './repositories/JobRepository';

// Types and utilities (always safe)
export * from './types';
export { generateId } from './utils/generateId';

// Re-export Prisma types (type-only imports are safe)
export { Prisma, type PrismaClient } from './cli-client';