// Server-only exports - Prisma client should never be imported in browser
export { prisma } from './client';
export { ensureDbConnected, withDb } from './ensure-connected';
export { Prisma, PrismaClient } from '../generated'; // Server-side only - needed for query types

// Repositories
export * from './repositories/DocumentRepository';
export * from './repositories/EvaluationRepository';

// Browser-safe exports (types and enums only)
// These are re-exported from a separate file to avoid pulling in Prisma client
export * from './types';