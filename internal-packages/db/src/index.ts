// Server-only exports - Prisma client should never be imported in browser
export { prisma } from './client';
export { ensureDbConnected, withDb } from './ensure-connected';

// Browser-safe exports (types and enums only)
// These are re-exported from a separate file to avoid pulling in Prisma client
export * from './types';