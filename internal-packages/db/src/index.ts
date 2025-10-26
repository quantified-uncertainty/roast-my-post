// Server-safe exports - Prisma client for server and CLI contexts
export { prisma } from './client';
export { ensureDbConnected, withDb } from './ensure-connected';

// Re-export Prisma types from client (which properly exports from generated)
export { Prisma, type PrismaClient } from './client';

// Repositories
export * from './repositories/DocumentRepository';
export * from './repositories/EvaluationRepository';
export * from './repositories/JobRepository';

// Browser-safe exports (types and enums only)
// These are re-exported from a separate file to avoid pulling in Prisma client
export * from './types';

// Utility functions
export { generateId } from './utils/generateId';
export * from './utils/rate-limit-utils';
