import { Prisma } from "@roast/db";

/**
 * Standard select query for document listings
 * Only fetches the fields needed for listing views
 */
export const documentListingSelect = {
  id: true,
  title: true,
  authors: true,
  content: true, // Needed for word count
  urls: true,
  platforms: true,
  document: {
    select: {
      id: true,
      publishedDate: true,
      isPrivate: true,
      submittedById: true,
      evaluations: {
        select: {
          agentId: true,
          agent: {
            select: {
              versions: {
                orderBy: { version: "desc" as const },
                take: 1,
                select: {
                  name: true,
                },
              },
            },
          },
          versions: {
            orderBy: { version: "desc" as const },
            take: 1,
            select: {
              grade: true,
              _count: {
                select: {
                  comments: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DocumentVersionSelect;

/**
 * Type for the document listing query
 */
export type DocumentListing = Prisma.DocumentVersionGetPayload<{
  select: typeof documentListingSelect;
}>;

/**
 * Filters for document queries
 */
export const documentListingFilters = {
  byUser: (userId: string) => ({
    document: { submittedById: userId },
  } satisfies Prisma.DocumentVersionWhereInput),
  
  searchQuery: (query: string) => ({
    searchableText: {
      contains: query.toLowerCase(),
      mode: "insensitive" as const,
    },
  } satisfies Prisma.DocumentVersionWhereInput),
  
  privacy: (userId?: string) => {
    if (!userId) {
      // Anonymous users can only see public docs
      return {
        document: { isPrivate: false },
      } satisfies Prisma.DocumentVersionWhereInput;
    }
    
    // Authenticated users can see public docs and their own private docs
    return {
      document: {
        OR: [
          { isPrivate: false },
          { 
            submittedById: userId,
            isPrivate: true
          }
        ]
      }
    } satisfies Prisma.DocumentVersionWhereInput;
  },
} as const;

/**
 * Serialized type for client components
 */
export interface SerializedDocumentListing {
  id: string;
  title: string;
  authors: string[];
  content: string; // For word count calculation
  urls: string[];
  platforms: string[];
  document: {
    id: string;
    publishedDate: string;
    evaluations: Array<{
      agentId: string;
      agent: {
        name: string; // From latest version
      };
      latestVersion: {
        grade: number | null;
        commentCount: number;
      } | null;
    }>;
  };
}

/**
 * Serialize the document listing for client components
 */
export function serializeDocumentListing(doc: DocumentListing): SerializedDocumentListing {
  return {
    id: doc.id,
    title: doc.title,
    authors: doc.authors,
    content: doc.content,
    urls: doc.urls,
    platforms: doc.platforms,
    document: {
      id: doc.document.id,
      publishedDate: doc.document.publishedDate.toISOString(),
      evaluations: doc.document.evaluations.map((evaluation) => ({
        agentId: evaluation.agentId,
        agent: {
          name: evaluation.agent.versions[0]?.name || "Unknown",
        },
        latestVersion: evaluation.versions[0]
          ? {
              grade: evaluation.versions[0].grade,
              commentCount: evaluation.versions[0]._count.comments,
            }
          : null,
      })),
    },
  };
}