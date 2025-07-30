import { prisma } from './client';

// Ensure Prisma is connected before executing queries
export async function ensureDbConnected() {
  try {
    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    if (error.message?.includes('Engine is not yet connected')) {
      // Force reconnection
      await prisma.$connect();
    } else {
      throw error;
    }
  }
}

// Wrapper to ensure connection before query execution
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await ensureDbConnected();
  return fn();
}