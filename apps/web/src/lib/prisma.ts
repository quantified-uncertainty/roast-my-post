// Database connection for Next.js
// This file ensures proper Prisma client handling in development mode

import { PrismaClient } from "@roast/db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export types
export { Prisma } from "@roast/db";
export type { PrismaClient } from "@roast/db";
