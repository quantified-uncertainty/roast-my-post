import { Prisma } from "@roast/db";

/**
 * Define the shape of our document listing query using satisfies operator
 * This provides compile-time type safety with ZERO runtime overhead
 * Unlike Prisma.validator, satisfies is purely a TypeScript compile-time feature
 */
export const documentVersionForListingArgs = {
  include: {
    document: {
      include: {
        evaluations: {
          include: {
            agent: {
              include: {
                versions: {
                  orderBy: { version: "desc" as const },
                  take: 1,
                },
              },
            },
            versions: {
              orderBy: { version: "desc" as const },
              take: 1,
              include: {
                comments: {
                  include: {
                    highlight: true,
                  },
                },
                job: true,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DocumentVersionDefaultArgs;

/**
 * Type generated from the query args - this is what we get from the database
 * Using typeof to extract the type from our satisfies-validated object
 */
export type DocumentVersionForListing = Prisma.DocumentVersionGetPayload<typeof documentVersionForListingArgs>;


/**
 * Common where conditions for filtering documents
 * These can be composed together for complex queries
 */
export const documentFilters = {
  published: {
    document: {
      publishedDate: { lte: new Date() },
    },
  } satisfies Prisma.DocumentVersionWhereInput,
  
  byUser: (userId: string) => ({
    document: { submittedById: userId },
  } satisfies Prisma.DocumentVersionWhereInput),
  
  searchQuery: (query: string) => ({
    searchableText: {
      contains: query.toLowerCase(),
      mode: "insensitive" as const,
    },
  } satisfies Prisma.DocumentVersionWhereInput),
} as const;

/**
 * Simplified serialized type for client components
 * Only includes the fields we actually use in the UI
 */
export interface SerializedDocumentVersionForListing {
  id: string;
  title: string;
  authors: string[];
  content: string;
  urls: string[];
  platforms: string[];
  intendedAgents: string[];
  importUrl: string | null;
  createdAt: string;
  updatedAt: string;
  document: {
    id: string;
    publishedDate: string;
    createdAt: string;
    updatedAt: string;
    submittedById: string;
    evaluations: Array<{
      id: string;
      agentId: string;
      createdAt: string;
      agent: {
        id: string;
        versions: Array<{
          id: string;
          name: string;
          description: string;
          providesGrades: boolean;
        }>;
      };
      versions: Array<{
        id: string;
        grade: number | null;
        comments: Array<{
          id: string;
          description: string;
          importance: number | null;
          grade: number | null;
          highlight: {
            id: string;
            startOffset: number;
            endOffset: number;
            prefix: string | null;
            quotedText: string;
            isValid: boolean;
            error: string | null;
          };
        }>;
        job: {
          priceInDollars: number | null;
          llmThinking: string | null;
        } | null;
        summary: string | null;
        analysis: string | null;
        selfCritique: string | null;
      }>;
    }>;
  };
}

/**
 * Helper function to serialize a document version for client components
 * Maps only the fields needed by the UI
 */
export function serializeDocumentVersion(doc: DocumentVersionForListing): SerializedDocumentVersionForListing {
  return {
    id: doc.id,
    title: doc.title,
    authors: doc.authors,
    content: doc.content,
    urls: doc.urls,
    platforms: doc.platforms,
    intendedAgents: doc.intendedAgents,
    importUrl: doc.importUrl,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    document: {
      id: doc.document.id,
      publishedDate: doc.document.publishedDate.toISOString(),
      createdAt: doc.document.createdAt.toISOString(),
      updatedAt: doc.document.updatedAt.toISOString(),
      submittedById: doc.document.submittedById,
      evaluations: doc.document.evaluations.map((evaluation) => ({
        id: evaluation.id,
        agentId: evaluation.agentId,
        createdAt: evaluation.createdAt.toISOString(),
        agent: {
          id: evaluation.agent.id,
          versions: evaluation.agent.versions.map((version) => ({
            id: version.id,
            name: version.name,
            description: version.description,
            providesGrades: version.providesGrades,
          })),
        },
        versions: evaluation.versions.map((version) => ({
          id: version.id,
          grade: version.grade,
          comments: version.comments.map((comment) => ({
            id: comment.id,
            description: comment.description,
            importance: comment.importance,
            grade: comment.grade,
            highlight: {
              id: comment.highlight.id,
              startOffset: comment.highlight.startOffset,
              endOffset: comment.highlight.endOffset,
              prefix: comment.highlight.prefix,
              quotedText: comment.highlight.quotedText,
              isValid: comment.highlight.isValid,
              error: comment.highlight.error,
            },
          })),
          job: version.job
            ? {
                priceInDollars: version.job.priceInDollars !== null && version.job.priceInDollars !== undefined
                  ? Number(version.job.priceInDollars)
                  : null,
                llmThinking: version.job.llmThinking,
              }
            : null,
          summary: version.summary,
          analysis: version.analysis,
          selfCritique: version.selfCritique,
        })),
      })),
    },
  };
}