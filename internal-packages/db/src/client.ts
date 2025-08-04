import { PrismaClient } from '../generated';
import { generateMarkdownPrepend } from './utils/documentMetadata';

// Extended client type
function createExtendedClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

  return client.$extends({
    result: {
      documentVersion: {
        // Computed field that combines markdownPrepend + content
        fullContent: {
          needs: { 
            content: true, 
            markdownPrepend: true,
            title: true,
            authors: true,
            platforms: true,
            createdAt: true
          },
          compute(documentVersion) {
            // If markdownPrepend exists, use it
            if (documentVersion.markdownPrepend) {
              return documentVersion.markdownPrepend + documentVersion.content;
            }
            
            // Otherwise generate it for backward compatibility
            const prepend = generateMarkdownPrepend({
              title: documentVersion.title,
              author: documentVersion.authors?.[0],
              platforms: documentVersion.platforms,
              publishedDate: documentVersion.createdAt?.toISOString()
            });
            
            return prepend + documentVersion.content;
          },
        },
      },
    },
  });
}

// Simple singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Type exports
export { Prisma } from '../generated';
export type { PrismaClient } from '../generated';