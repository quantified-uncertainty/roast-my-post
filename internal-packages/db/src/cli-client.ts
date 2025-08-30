import { PrismaClient } from "../generated";

// Extended client type for CLI/server usage (without server-only restriction)
function createExtendedClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  return client.$extends({
    result: {
      documentVersion: {
        // Computed field that combines markdownPrepend + content
        fullContent: {
          needs: {
            content: true,
            markdownPrepend: true,
          },
          compute(documentVersion) {
            // Use prepend + content if prepend exists, otherwise just content
            if (documentVersion.markdownPrepend) {
              return documentVersion.markdownPrepend + documentVersion.content;
            }

            return documentVersion.content;
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export Prisma both as type and value, PrismaClient as type only
export { Prisma, type PrismaClient } from "../generated";