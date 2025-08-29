import { generateId } from "@roast/db";

import { prisma } from "@roast/db";
// Import removed - DocumentValidationSchema not used
import type { Document } from "@/shared/types/databaseTypes";
import { generateMarkdownPrepend } from "@roast/domain";
import { getPublicUserFields } from "@/infrastructure/auth/user-permissions";
import { getCommentProperty } from "@/shared/types/commentTypes";
import { getServices } from "@/application/services/ServiceFactory";
import { 
  documentVersionForListingArgs,
  documentFilters, 
  serializeDocumentVersion,
  type SerializedDocumentVersionForListing 
} from "./Document.types";

// Helper function to safely convert Decimal to number
function convertPriceToNumber(price: unknown): number {
  if (price === null || price === undefined) return 0;
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof price === 'object' && price && 'toNumber' in price && typeof (price as any).toNumber === 'function') {
    return (price as any).toNumber();
  }
  const converted = Number(price);
  return isNaN(converted) ? 0 : converted;
}

// Helper function to combine markdownPrepend with content (matches Prisma fullContent computed field)
function getFullContent(version: { markdownPrepend: string | null; content: string }): string {
  return version.markdownPrepend 
    ? version.markdownPrepend + version.content 
    : version.content;
}

type DocumentWithRelations = {
  id: string;
  publishedDate: Date;
  createdAt: Date;
  updatedAt: Date;
  submittedById: string;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  versions: Array<{
    id: string;
    version: number;
    title: string;
    content: string;
    markdownPrepend: string | null;
    platforms: string[];
    intendedAgents: string[];
    authors: string[];
    urls: string[];
    importUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    documentId: string;
  }>;
  evaluations: Array<{
    id: string;
    createdAt: Date;
    documentId: string;
    agentId: string;
    agent: {
      id: string;
      versions: Array<{
        id: string;
        version: number;
        name: string;
        description: string;
        primaryInstructions: string;
        selfCritiqueInstructions: string | null;
      }>;
    };
    versions: Array<{
      id: string;
      version: number | null;
      createdAt: Date;
      summary: string | null;
      analysis: string | null;
      grade: number | null;
      selfCritique: string | null;
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
        id: string;
        priceInDollars: number | null;
        llmThinking: string | null;
        durationInSeconds: number | null;
        logs: string | null;
        tasks: Array<{
          id: string;
          name: string;
          modelName: string;
          priceInDollars: number;
          timeInSeconds: number | null;
          log: string | null;
          createdAt: Date;
        }>;
      } | null;
      documentVersion: {
        version: number;
      };
    }>;
    jobs: Array<{
      id: string;
      status: string;
      createdAt: Date;
    }>;
  }>;
};

/**
 * Data transformation helpers for converting DB results to frontend format
 */
class DocumentTransformer {
  /**
   * Transform comment from DB format to frontend format
   */
  static transformComment(comment: any): any {
    return {
      id: comment.id,
      description: comment.description,
      importance: comment.importance,
      grade: comment.grade,
      highlight: {
        id: comment.highlight.id,
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        quotedText: comment.highlight.quotedText,
        isValid: comment.highlight.isValid,
        prefix: comment.highlight.prefix,
        error: comment.highlight.error,
      },
      header: getCommentProperty(comment, 'header', null),
      level: getCommentProperty(comment, 'level', null),
      source: getCommentProperty(comment, 'source', null),
      metadata: getCommentProperty(comment, 'metadata', null),
    };
  }

  /**
   * Transform job from DB format to frontend format
   */
  static transformJob(job: any): any {
    return {
      id: job.id,
      status: job.status,
      priceInDollars: convertPriceToNumber(job.priceInDollars) || 0,
      llmThinking: job.llmThinking || "",
      durationInSeconds: job.durationInSeconds || undefined,
      logs: job.logs || undefined,
      ...(job.tasks && {
        tasks: job.tasks.map((task: any) => ({
          id: task.id,
          name: task.name,
          modelName: task.modelName,
          priceInDollars: convertPriceToNumber(task.priceInDollars),
          timeInSeconds: task.timeInSeconds,
          log: task.log,
          llmInteractions: 'llmInteractions' in task ? task.llmInteractions : undefined,
          createdAt: task.createdAt,
        })),
      }),
    };
  }

  /**
   * Create placeholder comment array (for count-only mode)
   */
  static createPlaceholderComments(count: number): any[] {
    return Array(count).fill({
      id: 'placeholder',
      description: 'placeholder',  // Non-empty so filterValidComments works
      importance: null,
      grade: null,
      highlight: {
        id: 'placeholder',
        startOffset: 0,
        endOffset: 0,
        quotedText: 'placeholder',
        isValid: true,
        prefix: null,
        error: null,
      },
      _isPlaceholder: true,  // Flag to identify placeholder comments
    });
  }

  /**
   * Transform agent from DB format to frontend format
   */
  static transformAgent(agent: any): any {
    return {
      id: agent.id,
      name: agent.versions[0].name,
      version: agent.versions[0].version.toString(),
      description: agent.versions[0].description,
      primaryInstructions: agent.versions[0].primaryInstructions,
      selfCritiqueInstructions: agent.versions[0].selfCritiqueInstructions || undefined,
    };
  }

  /**
   * Transform evaluation version from DB format to frontend format
   */
  static transformEvaluationVersion(version: any, currentDocumentVersion: number): any {
    const isStale = version.documentVersion?.version !== currentDocumentVersion;
    
    return {
      id: version.id,
      version: version.version || 1,
      createdAt: new Date(version.createdAt),
      job: version.job ? this.transformJob(version.job) : undefined,
      comments: version.comments 
        ? version.comments.map((comment: any) => this.transformComment(comment))
        : version._count 
        ? this.createPlaceholderComments(version._count.comments || 0)
        : [],
      summary: version.summary || "",
      analysis: version.analysis || undefined,
      grade: version.grade ?? null,
      selfCritique: version.selfCritique || undefined,
      documentVersion: {
        version: version.documentVersion?.version,
      },
      isStale,
    };
  }

  /**
   * Transform evaluation from DB format to frontend format
   */
  static transformEvaluation(evaluation: any, currentDocumentVersion: number): any {
    const latestVersion = evaluation.versions?.[0];
    const evaluationVersions = evaluation.versions?.map((version: any) => 
      this.transformEvaluationVersion(version, currentDocumentVersion)
    ) || [];

    return {
      id: evaluation.id,
      agentId: evaluation.agent.id,
      agent: this.transformAgent(evaluation.agent),
      createdAt: new Date(latestVersion?.createdAt || evaluation.createdAt),
      priceInDollars: convertPriceToNumber(latestVersion?.job?.priceInDollars) || 0,
      comments: latestVersion?.comments 
        ? latestVersion.comments.map((comment: any) => this.transformComment(comment))
        : latestVersion?._count 
        ? this.createPlaceholderComments(latestVersion._count.comments || 0)
        : [],
      thinking: latestVersion?.job?.llmThinking || "",
      summary: latestVersion?.summary || "",
      analysis: latestVersion?.analysis || "",
      grade: latestVersion?.grade ?? null,
      selfCritique: latestVersion?.selfCritique || undefined,
      versions: evaluationVersions,
      jobs: (evaluation.jobs || []).map((job: any) => ({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        priceInDollars: convertPriceToNumber(job.priceInDollars),
      })),
      isStale: latestVersion && latestVersion.documentVersion?.version !== currentDocumentVersion,
    };
  }

  /**
   * Transform document metadata (non-evaluation parts) from DB format
   */
  static transformDocumentBase(dbDoc: any): Partial<Document> {
    if (!dbDoc.versions || dbDoc.versions.length === 0) {
      throw new Error(`Document ${dbDoc.id} has no versions`);
    }

    const latestVersion = dbDoc.versions[0];

    return {
      id: dbDoc.id,
      slug: dbDoc.id,
      title: latestVersion.title,
      content: getFullContent(latestVersion),
      author: latestVersion.authors.join(", "),
      publishedDate: dbDoc.publishedDate.toISOString(),
      url: latestVersion.urls[0] || "",
      importUrl: latestVersion.importUrl || undefined,
      platforms: latestVersion.platforms,
      intendedAgents: latestVersion.intendedAgents,
      submittedById: dbDoc.submittedById,
      submittedBy: dbDoc.submittedBy ? {
        id: dbDoc.submittedBy.id,
        name: dbDoc.submittedBy.name,
        email: null, // Explicitly null for privacy
        image: dbDoc.submittedBy.image,
      } : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
    };
  }

  /**
   * Transform complete document from DB format to frontend format
   */
  static transformDocument(dbDoc: any): Document {
    const latestVersion = dbDoc.versions[0];
    const currentDocumentVersion = latestVersion.version;

    return {
      ...this.transformDocumentBase(dbDoc),
      reviews: dbDoc.evaluations?.map((evaluation: any) => 
        this.transformEvaluation(evaluation, currentDocumentVersion)
      ) || [],
    } as Document;
  }
}

/**
 * Query builders for different parts of the document query
 */
class DocumentQueryBuilder {
  /**
   * Base include for document versions (always need latest)
   */
  static documentVersions() {
    return {
      orderBy: { version: "desc" as const },
      take: 1,
    };
  }

  /**
   * Base include for agent versions (always need latest)
   */
  static agentVersions() {
    return {
      orderBy: { version: "desc" as const },
      take: 1,
    };
  }

  /**
   * Jobs query configuration
   */
  static jobs(options: { limit?: number } = {}) {
    return {
      orderBy: { createdAt: "desc" as const },
      ...(options.limit && { take: options.limit }),
    };
  }

  /**
   * Comment configuration based on needs
   */
  static comments(mode: 'full' | 'count' | 'none') {
    if (mode === 'none') return false;
    if (mode === 'count') {
      return {
        _count: {
          select: { comments: true },
        },
      };
    }
    return {
      comments: {
        include: {
          highlight: {
            select: {
              id: true,
              startOffset: true,
              endOffset: true,
              prefix: true,
              quotedText: true,
              isValid: true,
              error: true,
            },
          },
        },
      },
    };
  }

  /**
   * Evaluation version configuration based on needs
   */
  static evaluationVersions(options: {
    commentMode: 'full' | 'count' | 'none';
    limit?: number;
    includeJob?: boolean;
  }) {
    const base: any = {
      orderBy: { createdAt: "desc" as const },
      ...(options.limit && { take: options.limit }),
    };

    if (options.commentMode === 'full') {
      return {
        ...base,
        include: {
          ...this.comments('full'),
          ...(options.includeJob && {
            job: {
              include: { tasks: true },
            },
          }),
          documentVersion: {
            select: { version: true },
          },
        },
      };
    } else if (options.commentMode === 'count') {
      return {
        ...base,
        select: {
          id: true,
          version: true,
          createdAt: true,
          summary: true,
          analysis: true,
          grade: true,
          selfCritique: true,
          isStale: true,
          ...this.comments('count'),
          ...(options.includeJob && {
            job: {
              select: {
                id: true,
                status: true,
                priceInDollars: true,
                durationInSeconds: true,
                llmThinking: true,
              },
            },
          }),
          documentVersion: {
            select: { version: true },
          },
        },
      };
    } else {
      return {
        ...base,
        select: {
          id: true,
          version: true,
          createdAt: true,
          summary: true,
          analysis: true,
          grade: true,
          selfCritique: true,
          isStale: true,
          ...(options.includeJob && {
            job: {
              select: {
                id: true,
                status: true,
              },
            },
          }),
          documentVersion: {
            select: { version: true },
          },
        },
      };
    }
  }

  /**
   * Build evaluation include based on needs
   */
  static evaluations(options: {
    includeStale?: boolean;
    includePending?: boolean;
    versionCommentMode: 'full' | 'count' | 'none';
    versionLimit?: number;
    includeJobs?: boolean;
    jobLimit?: number;
  }) {
    // Build where clause based on includeStale and includePending settings
    // When includeStale is false, filter out evaluations that only have stale versions
    // includePending allows evaluations without versions (pending/running jobs)
    let whereClause: any = {};
    
    if (!options.includeStale && !options.includePending) {
      // Only include evaluations with at least one non-stale version
      whereClause = {
        versions: {
          some: { isStale: false },
        },
      };
    } else if (!options.includeStale && options.includePending) {
      // Include evaluations that either:
      // 1. Have no versions yet (pending), OR
      // 2. Have at least one non-stale version
      whereClause = {
        OR: [
          { versions: { none: {} } }, // No versions yet (pending)
          { versions: { some: { isStale: false } } }, // Has non-stale versions
        ],
      };
    }
    
    return {
      where: whereClause,
      include: {
        ...(options.includeJobs && {
          jobs: this.jobs({ limit: options.jobLimit }),
        }),
        agent: {
          include: {
            versions: this.agentVersions(),
          },
        },
        versions: this.evaluationVersions({
          commentMode: options.versionCommentMode,
          limit: options.versionLimit,
          includeJob: true,
        }),
      },
    };
  }

  /**
   * Build complete document query
   */
  static buildQuery(options: {
    includeStale?: boolean;
    includePending?: boolean;
    includeSubmittedBy?: boolean;
    evaluationOptions: {
      versionCommentMode: 'full' | 'count' | 'none';
      versionLimit?: number;
      includeJobs?: boolean;
      jobLimit?: number;
    };
  }) {
    return {
      include: {
        ...(options.includeSubmittedBy && {
          submittedBy: {
            select: getPublicUserFields(),
          },
        }),
        versions: this.documentVersions(),
        evaluations: this.evaluations({
          includeStale: options.includeStale,
          includePending: options.includePending,
          ...options.evaluationOptions,
        }),
      },
    };
  }
}

export class DocumentModel {
  /**
   * Gets a document with evaluation version metadata only (for version history views).
   * This fetches all versions but without comments/highlights for performance.
   * Use this when you need to show version history but don't need the actual comments.
   * 
   * @param docId - The document ID to fetch
   * @param includeStale - Whether to include stale evaluations (default: false)
   * @returns The document with evaluation version metadata
   */
  static async getDocumentWithEvaluationVersions(
    docId: string,
    includeStale: boolean = false
  ): Promise<Document | null> {
    const dbDoc = (await prisma.document.findUnique({
      where: { id: docId },
      ...DocumentQueryBuilder.buildQuery({
        includeStale,
        includePending: true, // Include pending evaluations
        includeSubmittedBy: true,
        evaluationOptions: {
          versionCommentMode: 'count',
          includeJobs: true,
        },
      }),
    })) as unknown as DocumentWithRelations | null;

    if (!dbDoc || !dbDoc.versions.length) {
      return null;
    }

    const latestVersion = dbDoc.versions[0];
    const currentDocumentVersion = latestVersion.version;

    return {
      ...DocumentTransformer.transformDocumentBase(dbDoc),
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        // Map all evaluation versions with basic metadata only
        const evaluationVersions = evaluation.versions.map((version: any) => 
          DocumentTransformer.transformEvaluationVersion(version, currentDocumentVersion)
        );

        // Use the first version for main evaluation data
        const latestVersion = evaluation.versions[0];

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: DocumentTransformer.transformAgent(evaluation.agent),
          createdAt: new Date(latestVersion?.createdAt || evaluation.createdAt),
          priceInDollars: convertPriceToNumber(latestVersion?.job?.priceInDollars) || 0,
          // Use count from latest version only
          comments: latestVersion?._count 
            ? DocumentTransformer.createPlaceholderComments(latestVersion._count.comments || 0)
            : [],
          thinking: latestVersion?.job?.llmThinking || "",
          summary: latestVersion?.summary || "",
          analysis: latestVersion?.analysis || "",
          grade: latestVersion?.grade ?? null,
          selfCritique: latestVersion?.selfCritique || undefined,
          versions: evaluationVersions,
          jobs: (evaluation.jobs || []).map((job: any) => ({
            id: job.id,
            status: job.status,
            createdAt: job.createdAt,
            priceInDollars: convertPriceToNumber(job.priceInDollars),
          })),
          isStale: latestVersion && latestVersion.documentVersion.version !== currentDocumentVersion,
        };
      }),
    } as Document;
  }

  /**
   * Retrieves a document with its evaluations, optionally filtering out stale evaluations.
   * 
   * @param docId - The unique identifier of the document
   * @param includeStale - Whether to include evaluations that don't match the current document version.
   *                       Defaults to false, which filters out stale evaluations.
   * @returns The document with evaluations, or null if not found
   * 
   * @remarks
   * When includeStale is false (default), only evaluations where the latest evaluation version
   * matches the current document version are included. This prevents stale evaluations with
   * broken highlights from appearing in the main reader view.
   * 
   * When includeStale is true, all evaluations are returned regardless of version matching.
   * This is useful for history views where users need to see all past evaluations.
   */
  static async getDocumentWithEvaluations(
    docId: string,
    includeStale: boolean = false
  ): Promise<Document | null> {
    const dbDoc = (await prisma.document.findUnique({
      where: { id: docId },
      ...DocumentQueryBuilder.buildQuery({
        includeStale,
        includePending: true, // Always include pending evaluations
        includeSubmittedBy: true,
        evaluationOptions: {
          versionCommentMode: 'full',
          includeJobs: true,
        },
      }),
    })) as unknown as DocumentWithRelations | null;

    if (!dbDoc || !dbDoc.versions.length) {
      return null;
    }

    const latestVersion = dbDoc.versions[0];
    const currentDocumentVersion = latestVersion.version;

    return DocumentTransformer.transformDocument(dbDoc);
  }

  /**
   * Gets a document optimized for the reader view - only fetches latest evaluation version data.
   * This significantly reduces query size by not loading historical evaluation comments/highlights.
   * 
   * @param docId - The document ID to fetch
   * @returns The document with latest evaluation data or null if not found
   */
  static async getDocumentForReader(
    docId: string
  ): Promise<Document | null> {
    const dbDoc = (await prisma.document.findUnique({
      where: { id: docId },
      ...DocumentQueryBuilder.buildQuery({
        includeStale: false,
        includePending: true, // Include evaluations that are pending/running
        includeSubmittedBy: true,
        evaluationOptions: {
          versionCommentMode: 'full',
          versionLimit: 1, // Only fetch latest version for reader
          includeJobs: true,
        },
      }),
    })) as unknown as DocumentWithRelations | null;

    if (!dbDoc || !dbDoc.versions.length) {
      return null;
    }

    return DocumentTransformer.transformDocument(dbDoc);
  }

  /**
   * Retrieves a document with all evaluations, including stale ones.
   * 
   * @param docId - The unique identifier of the document
   * @returns The document with all evaluations, or null if not found
   * 
   * @remarks
   * This is a convenience method equivalent to calling getDocumentWithEvaluations(docId, true).
   * It's intended for use in history views, evaluation management pages, and anywhere that
   * needs to display all evaluations regardless of their version compatibility.
   */
  static async getDocumentWithAllEvaluations(
    docId: string
  ): Promise<Document | null> {
    return DocumentModel.getDocumentWithEvaluations(docId, true);
  }

  /**
   * Formats a database document into the frontend Document type
   * @param dbDoc - The raw document from the database with all relations
   * @returns The formatted Document object for frontend use
   * @internal
   */
  static formatDocumentFromDB(dbDoc: any): Document {
    return DocumentTransformer.transformDocument(dbDoc);
  }

  /**
   * Shared query configuration for document listings (optimized for performance)
   * Only fetches comment counts instead of full comments/highlights
   */
  private static getDocumentListingInclude() {
    return DocumentQueryBuilder.buildQuery({
      includeStale: false,
      includeSubmittedBy: false,
      evaluationOptions: {
        versionCommentMode: 'count',
        versionLimit: 1,
        includeJobs: true,
        jobLimit: 1,
      },
    }).include;
  }

  /**
   * Formats a document from the database for listing views
   * Uses comment counts instead of full comment data
   */
  private static formatDocumentForListing(dbDoc: any): Document {
    if (!dbDoc.versions || dbDoc.versions.length === 0) {
      throw new Error(`Document ${dbDoc.id} has no versions`);
    }
    
    const latestVersion = dbDoc.versions[0];
    const currentDocumentVersion = latestVersion.version;

    return {
      ...DocumentTransformer.transformDocumentBase(dbDoc),
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        const latestEvalVersion = evaluation.versions[0];
        const isStale = latestEvalVersion && latestEvalVersion.documentVersion.version !== currentDocumentVersion;

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: DocumentTransformer.transformAgent(evaluation.agent),
          createdAt: new Date(latestEvalVersion?.createdAt || evaluation.createdAt),
          priceInDollars: 0, // Not needed for listings
          // Create empty comments array with proper length for count display
          comments: latestEvalVersion?._count?.comments 
            ? DocumentTransformer.createPlaceholderComments(latestEvalVersion._count.comments)
            : [],
          thinking: "",
          summary: latestEvalVersion?.summary || "",
          analysis: latestEvalVersion?.analysis || "",
          grade: latestEvalVersion?.grade ?? null,
          selfCritique: latestEvalVersion?.selfCritique || undefined,
          versions: [], // Not needed for listings
          jobs: (evaluation.jobs || []).map((job: any) => ({
            id: job.id,
            status: job.status,
            createdAt: job.createdAt,
            // Convert Decimal to number to avoid serialization errors
            priceInDollars: convertPriceToNumber(job.priceInDollars),
          })),
          isStale,
        };
      }),
    } as Document;
  }

  static async getUserDocumentsWithEvaluations(userId: string, limit: number = 50): Promise<Document[]> {
    const dbDocs = await prisma.document.findMany({
      where: { submittedById: userId },
      orderBy: { publishedDate: "desc" },
      take: limit,
      include: {
        ...DocumentModel.getDocumentListingInclude(),
        submittedBy: {
          select: getPublicUserFields(),
        },
      },
    });

    return dbDocs.map((dbDoc) => DocumentModel.formatDocumentForListing(dbDoc));
  }

  static async getRecentDocumentsWithEvaluations(limit: number = 50): Promise<Document[]> {
    const dbDocs = await prisma.document.findMany({
      take: limit,
      orderBy: { publishedDate: "desc" },
      include: DocumentModel.getDocumentListingInclude(),
    });

    return dbDocs.map((dbDoc) => DocumentModel.formatDocumentForListing(dbDoc));
  }

  static async getAllDocumentsWithEvaluations(): Promise<Document[]> {
    const dbDocs = await prisma.document.findMany({
      include: {
        versions: true,
        // Don't include submittedBy - not needed for document listings
        evaluations: {
          include: {
            jobs: {
              orderBy: {
                createdAt: "desc",
              },
            },
            agent: {
              include: {
                versions: {
                  orderBy: {
                    version: "desc",
                  },
                  take: 1,
                },
              },
            },
            versions: {
              include: {
                comments: {
                  include: {
                    highlight: {
                      select: {
                        id: true,
                        startOffset: true,
                        endOffset: true,
                        prefix: true,
                        quotedText: true,
                        isValid: true,
                        error: true,
                      },
                    },
                  },
                },
                job: {
                  include: {
                    tasks: true,
                  },
                },
                documentVersion: {
                  select: {
                    version: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: { publishedDate: "desc" },
    });

    return dbDocs.map((dbDoc) => DocumentModel.formatDocumentFromDB(dbDoc));
  }

  /**
   * Get document versions for listing pages (optimized for DocumentsResults component)
   * This method returns serialized data ready for client components
   * Uses satisfies operator for zero-runtime-cost type safety
   */
  static async getDocumentVersionsForListing(options?: {
    userId?: string;
    searchQuery?: string;
    limit?: number;
    latestVersionOnly?: boolean;
  }): Promise<SerializedDocumentVersionForListing[]> {
    const { userId, searchQuery, limit = 50, latestVersionOnly = false } = options || {};

    // Compose where conditions using type-safe filters
    const whereConditions = [];
    
    if (userId) {
      whereConditions.push(documentFilters.byUser(userId));
    }
    
    if (searchQuery?.trim() && searchQuery.trim().length >= 2) {
      whereConditions.push(documentFilters.searchQuery(searchQuery.trim()));
    }

    // Combine conditions with AND logic
    const whereClause = whereConditions.length > 0
      ? { AND: whereConditions }
      : {};

    // Execute query using the centralized args definition
    const rawDocuments = await prisma.documentVersion.findMany({
      where: whereClause,
      distinct: latestVersionOnly ? ['documentId'] : undefined,
      ...documentVersionForListingArgs,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Use the centralized serialization function
    return rawDocuments.map(serializeDocumentVersion);
  }

  static async create(data: {
    title: string;
    authors: string;
    urls?: string;
    platforms?: string;
    intendedAgents?: string;
    content: string;
    importUrl?: string;
    submittedById: string;
  }) {
    // Validate content length
    if (!data.content || data.content.length < 30) {
      throw new Error("Content must be at least 30 characters");
    }

    const wordCount = data.content.trim().split(/\s+/).length;
    if (wordCount > 50000) {
      throw new Error("Content must not exceed 50,000 words");
    }

    // Generate ID for the document
    const id = generateId(16);

    // Parse the data for version creation
    const authors = data.authors.split(",").map((a) => a.trim());
    const platforms = data.platforms
      ? data.platforms.split(",").map((p) => p.trim())
      : [];

    // Generate markdownPrepend for the document
    const markdownPrepend = generateMarkdownPrepend({
      title: data.title,
      author: authors.join(", "),
      platforms,
      publishedDate: new Date().toISOString().split("T")[0],
    });

    // Create the document
    const document = await prisma.document.create({
      data: {
        id,
        publishedDate: new Date(),
        submittedById: data.submittedById,
        versions: {
          create: {
            version: 1,
            title: data.title,
            authors,
            urls: data.urls ? data.urls.split(",").map((u) => u.trim()) : [],
            platforms,
            intendedAgents: data.intendedAgents
              ? data.intendedAgents.split(",").map((a) => a.trim())
              : [],
            content: data.content,
            markdownPrepend,
            importUrl: data.importUrl || null,
            // searchableText is automatically generated by PostgreSQL
          },
        },
        // Create evaluations for each intended agent
        evaluations: {
          create: (data.intendedAgents
            ? data.intendedAgents.split(",").map((a) => a.trim())
            : []
          ).map((agentId) => ({
            agentId,
            // Create a pending job for each evaluation
            jobs: {
              create: {
                status: "PENDING",
              },
            },
          })),
        },
      },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
        },
        evaluations: {
          include: {
            jobs: true,
          },
        },
      },
    });

    return document;
  }

  static async delete(docId: string) {
    // Use a transaction to ensure all deletions succeed together
    return prisma.$transaction(async (tx) => {
      // First, delete all jobs related to evaluations of this document
      await tx.job.deleteMany({
        where: {
          evaluation: {
            documentId: docId,
          },
        },
      });

      // Then delete the document, which will cascade delete evaluations and other related records
      return tx.document.delete({
        where: { id: docId },
      });
    });
  }

  static async checkOwnership(docId: string, userId: string): Promise<boolean> {
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true },
    });

    return document?.submittedById === userId;
  }

  static async rerunEvaluation(
    evaluationId: string,
    documentId: string,
    userId: string
  ) {
    // Check if the current user is the document owner
    const isOwner = await this.checkOwnership(documentId, userId);
    if (!isOwner) {
      throw new Error(
        "You don't have permission to rerun evaluations for this document"
      );
    }

    // Find the evaluation record
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        documentId,
        agentId: evaluationId,
      },
    });

    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    // Create job for evaluation re-run
    const { jobService } = getServices();
    await jobService.createJob(evaluation.id);

    return { success: true };
  }

  static async createOrRerunEvaluation(
    agentId: string,
    documentId: string,
    userId: string
  ) {
    // Check if the current user is the document owner
    const isOwner = await this.checkOwnership(documentId, userId);
    if (!isOwner) {
      throw new Error(
        "You don't have permission to create evaluations for this document"
      );
    }

    // Find or create the evaluation record
    let evaluation = await prisma.evaluation.findFirst({
      where: {
        documentId,
        agentId,
      },
    });

    if (!evaluation) {
      // Create evaluation record with initial job
      evaluation = await prisma.evaluation.create({
        data: {
          documentId,
          agentId,
          createdAt: new Date(),
        },
      });
    }

    // Create job for evaluation re-run
    const { jobService } = getServices();
    await jobService.createJob(evaluation.id);

    return { success: true };
  }

  /**
   * Updates a document by creating a new version and automatically queues re-evaluations.
   * 
   * @param docId - The unique identifier of the document to update
   * @param data - The updated document data
   * @param data.title - The new document title
   * @param data.authors - Comma-separated list of authors
   * @param data.urls - Optional comma-separated list of URLs
   * @param data.platforms - Optional comma-separated list of platforms
   * @param data.intendedAgents - Optional comma-separated list of intended agent IDs
   * @param data.content - The new document content
   * @param data.importUrl - Optional URL where the document was imported from
   * @param userId - The ID of the user making the update (for authorization)
   * @returns The updated document with the new version
   * 
   * @throws {Error} When document is not found or user lacks permission
   * 
   * @remarks
   * This method creates a new document version with an incremented version number.
   * All existing evaluations are automatically queued for re-evaluation by creating
   * new PENDING jobs. This ensures that evaluations stay current with the document content.
   * 
   * The re-evaluation is automatic to minimize the staleness window, though users
   * should be warned about the API costs through the UI before calling this method.
   */
  static async update(
    docId: string,
    data: {
      title: string;
      authors: string;
      urls?: string;
      platforms?: string;
      intendedAgents?: string;
      content: string;
      importUrl?: string;
    },
    userId: string
  ) {
    // Use a transaction to ensure atomicity and prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // First get current document and its latest version
      const document = await tx.document.findUnique({
        where: { id: docId },
        include: {
          versions: {
            orderBy: {
              version: "desc",
            },
            take: 1,
          },
          evaluations: true,
        },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Verify ownership
      if (document.submittedById !== userId) {
        throw new Error("You don't have permission to update this document");
      }

      // Get current version number
      const currentVersion = document.versions[0]?.version || 0;
      const newVersion = currentVersion + 1;

      // Parse arrays from strings
      const authors = data.authors.split(",").map((a) => a.trim());
      const platforms = data.platforms
        ? data.platforms.split(",").map((p) => p.trim())
        : [];
      const urls = data.urls ? data.urls.split(",").map((u) => u.trim()) : [];

      // Generate markdownPrepend for document version
      const markdownPrepend = generateMarkdownPrepend({
        title: data.title,
        author: authors[0],
        platforms,
        publishedDate: document.publishedDate?.toISOString()
      });

      // Update document with versioned content
      const updatedDocument = await tx.document.update({
        where: { id: docId },
        data: {
          versions: {
            create: {
              version: newVersion,
              title: data.title,
              authors,
              urls,
              platforms,
              intendedAgents: data.intendedAgents
                ? data.intendedAgents.split(",").map((a) => a.trim())
                : [],
              content: data.content,
              importUrl: data.importUrl || null,
              markdownPrepend,
            },
          },
        },
        include: {
          versions: {
            orderBy: {
              version: "desc",
            },
            take: 1,
          },
          evaluations: true,
        },
      });

      // Mark all existing evaluation versions as stale
      await tx.evaluationVersion.updateMany({
        where: {
          evaluation: {
            documentId: docId,
          },
          isStale: false, // Only update ones that aren't already stale
        },
        data: {
          isStale: true,
        },
      });

      // Automatically queue re-evaluations for all existing evaluations
      if (document.evaluations.length > 0) {
        // Use createMany for better performance
        await tx.job.createMany({
          data: document.evaluations.map((evaluation) => ({
            status: "PENDING",
            evaluationId: evaluation.id,
          })),
        });
      }

      return updatedDocument;
    }, {
      isolationLevel: 'Serializable', // Strongest isolation to prevent race conditions
    });
  }
}
