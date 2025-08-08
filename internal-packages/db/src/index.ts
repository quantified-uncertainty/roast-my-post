// Server-only exports - Prisma client should never be imported in browser
export { prisma } from './client.js';
export { ensureDbConnected, withDb } from './ensure-connected.js';
export { Prisma, PrismaClient } from '../generated/index.js'; // Server-side only - needed for query types

// Repositories
export * from './repositories/DocumentRepository.js';
export * from './repositories/EvaluationRepository.js';
export * from './repositories/JobRepository.js';

// Browser-safe exports (types and enums only)
// These are re-exported from a separate file to avoid pulling in Prisma client
export * from './types.js';