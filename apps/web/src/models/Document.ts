import { generateId } from "@roast/db";

import { prisma } from "@roast/db";
// Import removed - DocumentValidationSchema not used
import type { Document } from "@/shared/types/databaseTypes";
import { generateMarkdownPrepend } from "@roast/domain";
import { getPublicUserFields } from "@/infrastructure/auth/user-permissions";
import { getCommentProperty } from "@/shared/types/commentTypes";
import { getServices } from "@/application/services/ServiceFactory";

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
    versionCommentMode: 'full' | 'count' | 'none';
    versionLimit?: number;
    includeJobs?: boolean;
    jobLimit?: number;
  }) {
    return {
      where: options.includeStale ? {} : {
        versions: {
          some: { isStale: false },
        },
      },
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

    // Transform database document to frontend Document shape
    const document: Document = {
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
      submittedBy: dbDoc.submittedBy
        ? {
            id: dbDoc.submittedBy.id,
            name: dbDoc.submittedBy.name,
            email: null,
            image: dbDoc.submittedBy.image,
          }
        : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        // Map all evaluation versions with basic metadata only
        const evaluationVersions = evaluation.versions.map((version: any) => {
          const isStale = version.documentVersion.version !== currentDocumentVersion;
          
          return {
            id: version.id,
            version: version.version || 1,
            createdAt: new Date(version.createdAt),
            job: version.job
              ? {
                  id: version.job.id,
                  status: version.job.status,
                  priceInDollars: convertPriceToNumber(version.job.priceInDollars) || 0,
                  llmThinking: version.job.llmThinking || "",
                  durationInSeconds: version.job.durationInSeconds || undefined,
                }
              : undefined,
            // Create placeholder comments array with count only
            comments: Array(version._count?.comments || 0).fill({
              id: '',
              description: '',
              importance: null,
              grade: null,
              highlight: {
                id: '',
                startOffset: 0,
                endOffset: 0,
                quotedText: '',
                isValid: true,
                prefix: null,
                error: null,
              },
            }),
            summary: version.summary || "",
            analysis: version.analysis || undefined,
            grade: version.grade ?? null,
            selfCritique: version.selfCritique || undefined,
            documentVersion: {
              version: version.documentVersion.version,
            },
            isStale,
          };
        });

        // Use the first version for main evaluation data
        const latestVersion = evaluation.versions[0];
        const evaluationIsStale = latestVersion && latestVersion.documentVersion.version !== currentDocumentVersion;

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            primaryInstructions:
              evaluation.agent.versions[0].primaryInstructions,
            selfCritiqueInstructions:
              evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
          },
          createdAt: new Date(
            latestVersion?.createdAt || evaluation.createdAt
          ),
          priceInDollars: convertPriceToNumber(latestVersion?.job?.priceInDollars) || 0,
          // Use count from latest version only
          comments: Array(latestVersion?._count?.comments || 0).fill({
            id: '',
            description: '',
            importance: null,
            grade: null,
            highlight: {
              id: '',
              startOffset: 0,
              endOffset: 0,
              quotedText: '',
              isValid: true,
              prefix: null,
              error: null,
            },
          }),
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
          isStale: evaluationIsStale,
        };
      }),
    };

    return document as Document;
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

    // Evaluations are already filtered at the database level based on isStale field

    // Transform database document to frontend Document shape
    const document: Document = {
      id: dbDoc.id,
      slug: dbDoc.id,
      title: latestVersion.title,
      // Include prepend in content for display (matches what was used during analysis)
      content: getFullContent(latestVersion),
      author: latestVersion.authors.join(", "),
      publishedDate: dbDoc.publishedDate.toISOString(),
      url: latestVersion.urls[0] || "", // Provide empty string as fallback
      importUrl: latestVersion.importUrl || undefined,
      platforms: latestVersion.platforms,
      intendedAgents: latestVersion.intendedAgents,
      submittedById: dbDoc.submittedById,
      submittedBy: dbDoc.submittedBy
        ? {
            id: dbDoc.submittedBy.id,
            name: dbDoc.submittedBy.name,
            email: null,  // Explicitly set to null for privacy
            image: dbDoc.submittedBy.image,
          }
        : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        // Map all evaluation versions
        const evaluationVersions = evaluation.versions.map((version: any) => {
          // Calculate if this version is stale
          const isStale = version.documentVersion.version !== currentDocumentVersion;
          
          return {
            id: version.id,
            version: version.version || 1,
            createdAt: new Date(version.createdAt),
            job: version.job
              ? {
                  priceInDollars: convertPriceToNumber(version.job.priceInDollars) || 0,
                  llmThinking: version.job.llmThinking || "",
                  durationInSeconds: version.job.durationInSeconds || undefined,
                  logs: version.job.logs || undefined,
                  tasks: version.job.tasks.map((task: any) => ({
                    id: task.id,
                    name: task.name,
                    modelName: task.modelName,
                    priceInDollars: convertPriceToNumber(task.priceInDollars),
                    timeInSeconds: task.timeInSeconds,
                    log: task.log,
                    llmInteractions: 'llmInteractions' in task ? task.llmInteractions : undefined,
                    createdAt: task.createdAt,
                  })),
                }
              : undefined,
            comments: version.comments.map((comment: any) => ({
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
            })),
            summary: version.summary || "",
            analysis: version.analysis || undefined,
            grade: version.grade ?? null,
            selfCritique: version.selfCritique || undefined,
            documentVersion: {
              version: version.documentVersion.version,
            },
            isStale,
          };
        });

        // Map jobs for this evaluation
        const jobs = (evaluation.jobs || []).map((job: any) => ({
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
        }));

        // Calculate if the evaluation (latest version) is stale
        // STALE should only be shown if:
        // 1. There's an existing eval version
        // 2. The eval version is for an older document version
        const latestVersion = evaluation.versions[0];
        const evaluationIsStale = latestVersion && latestVersion.documentVersion.version !== currentDocumentVersion;

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            primaryInstructions:
              evaluation.agent.versions[0].primaryInstructions,
            selfCritiqueInstructions:
              evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
          },
          createdAt: new Date(
            evaluation.versions[0]?.createdAt || evaluation.createdAt
          ),
          priceInDollars: convertPriceToNumber(evaluation.versions[0]?.job?.priceInDollars) || 0,
          comments:
            evaluation.versions[0]?.comments.map((comment: any) => ({
              id: comment.id,
              description: comment.description,
              importance: comment.importance || null,
              grade: comment.grade || null,
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
            })) || [],
          thinking: evaluation.versions[0]?.job?.llmThinking || "",
          summary: evaluation.versions[0]?.summary || "",
          analysis: evaluation.versions[0]?.analysis || "",
          grade: evaluation.versions[0]?.grade ?? null,
          selfCritique: evaluation.versions[0]?.selfCritique || undefined,
          versions: evaluationVersions,
          jobs,
          isStale: evaluationIsStale,
        };
      }),
    };

    // Return the document (validation removed as it was incompatible with database schema)
    return document as Document;
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

    const latestVersion = dbDoc.versions[0];
    const currentDocumentVersion = latestVersion.version;

    // Transform database document to frontend Document shape
    const document: Document = {
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
      submittedBy: dbDoc.submittedBy
        ? {
            id: dbDoc.submittedBy.id,
            name: dbDoc.submittedBy.name,
            email: null,
            image: dbDoc.submittedBy.image,
          }
        : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        const latestEvalVersion = evaluation.versions[0];
        
        // For reader view, we only have the latest version
        const evaluationVersions = latestEvalVersion ? [{
          id: latestEvalVersion.id,
          version: latestEvalVersion.version || 1,
          createdAt: new Date(latestEvalVersion.createdAt),
          job: latestEvalVersion.job
            ? {
                id: latestEvalVersion.job.id,
                status: latestEvalVersion.job.status,
                priceInDollars: convertPriceToNumber(latestEvalVersion.job.priceInDollars) || 0,
                llmThinking: latestEvalVersion.job.llmThinking || "",
                durationInSeconds: latestEvalVersion.job.durationInSeconds || undefined,
                logs: latestEvalVersion.job.logs || undefined,
                tasks: latestEvalVersion.job.tasks.map((task: any) => ({
                  id: task.id,
                  name: task.name,
                  modelName: task.modelName,
                  priceInDollars: convertPriceToNumber(task.priceInDollars),
                  timeInSeconds: task.timeInSeconds,
                  log: task.log,
                  llmInteractions: 'llmInteractions' in task ? task.llmInteractions : undefined,
                  createdAt: task.createdAt,
                })),
              }
            : undefined,
          comments: latestEvalVersion.comments.map((comment: any) => ({
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
          })),
          summary: latestEvalVersion.summary || "",
          analysis: latestEvalVersion.analysis || undefined,
          grade: latestEvalVersion.grade ?? null,
          selfCritique: latestEvalVersion.selfCritique || undefined,
          documentVersion: {
            version: latestEvalVersion.documentVersion.version,
          },
          isStale: latestEvalVersion.documentVersion.version !== currentDocumentVersion,
        }] : [];

        // Map jobs for this evaluation
        const jobs = (evaluation.jobs || []).map((job: any) => ({
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
        }));

        const evaluationIsStale = latestEvalVersion && latestEvalVersion.documentVersion.version !== currentDocumentVersion;

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            primaryInstructions:
              evaluation.agent.versions[0].primaryInstructions,
            selfCritiqueInstructions:
              evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
          },
          createdAt: new Date(
            latestEvalVersion?.createdAt || evaluation.createdAt
          ),
          priceInDollars: convertPriceToNumber(latestEvalVersion?.job?.priceInDollars) || 0,
          comments: latestEvalVersion?.comments.map((comment: any) => ({
            id: comment.id,
            description: comment.description,
            importance: comment.importance || null,
            grade: comment.grade || null,
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
          })) || [],
          thinking: latestEvalVersion?.job?.llmThinking || "",
          summary: latestEvalVersion?.summary || "",
          analysis: latestEvalVersion?.analysis || "",
          grade: latestEvalVersion?.grade ?? null,
          selfCritique: latestEvalVersion?.selfCritique || undefined,
          versions: evaluationVersions,
          jobs,
          isStale: evaluationIsStale,
        };
      }),
    };

    return document as Document;
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
    if (!dbDoc.versions.length) {
      throw new Error(`Document ${dbDoc.id} has no versions`);
    }

    const latestVersion = dbDoc.versions[0];
    const currentDocumentVersion = latestVersion.version;

    // Transform database document to frontend Document shape
    const document: Document = {
      id: dbDoc.id,
      slug: dbDoc.id,
      title: latestVersion.title,
      // Include prepend in content for display (matches what was used during analysis)
      content: getFullContent(latestVersion),
      author: latestVersion.authors.join(", "),
      publishedDate: dbDoc.publishedDate.toISOString(),
      url: latestVersion.urls[0] || "", // Provide empty string as fallback
      importUrl: latestVersion.importUrl || undefined,
      platforms: latestVersion.platforms,
      intendedAgents: latestVersion.intendedAgents,
      submittedById: dbDoc.submittedById,
      submittedBy: dbDoc.submittedBy
        ? {
            id: dbDoc.submittedBy.id,
            name: dbDoc.submittedBy.name,
            email: null,  // Explicitly set to null for privacy
            image: dbDoc.submittedBy.image,
          }
        : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        // Map all evaluation versions
        const evaluationVersions = evaluation.versions.map((version: any) => {
          // Calculate if this version is stale
          const isStale = version.documentVersion.version !== currentDocumentVersion;
          
          return {
            id: version.id,
            version: version.version || 1,
            createdAt: new Date(version.createdAt),
            job: version.job
              ? {
                  priceInDollars: convertPriceToNumber(version.job.priceInDollars) || 0,
                  llmThinking: version.job.llmThinking || "",
                  durationInSeconds: version.job.durationInSeconds || undefined,
                  logs: version.job.logs || undefined,
                  tasks: version.job.tasks?.map((task: any) => ({
                    id: task.id,
                    name: task.name,
                    modelName: task.modelName,
                    priceInDollars: convertPriceToNumber(task.priceInDollars),
                    timeInSeconds: task.timeInSeconds,
                    log: task.log,
                    llmInteractions: task.llmInteractions ? JSON.parse(JSON.stringify(task.llmInteractions)) : undefined,
                    createdAt: task.createdAt,
                  })) || [],
                }
              : undefined,
            comments: version.comments.map((comment: any) => ({
              description: comment.description,
              importance: comment.importance || undefined,
              grade: comment.grade || undefined,
              highlight: {
                startOffset: comment.highlight.startOffset,
                endOffset: comment.highlight.endOffset,
                quotedText: comment.highlight.quotedText,
                isValid: comment.highlight.isValid,
              },
              isValid: comment.highlight.isValid,
              error: comment.highlight.isValid
                ? undefined
                : "Invalid highlight",
            })),
            summary: version.summary || "",
            analysis: version.analysis || undefined,
            grade: version.grade ?? null,
            selfCritique: version.selfCritique || undefined,
            documentVersion: {
              version: version.documentVersion.version,
            },
            isStale,
          };
        });

        // Map jobs for this evaluation
        const jobs = (evaluation.jobs || []).map((job: any) => ({
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
        }));

        // Calculate if the evaluation (latest version) is stale
        // STALE should only be shown if:
        // 1. There's an existing eval version
        // 2. The eval version is for an older document version
        const latestVersion = evaluation.versions[0];
        const evaluationIsStale = latestVersion && latestVersion.documentVersion.version !== currentDocumentVersion;

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            primaryInstructions:
              evaluation.agent.versions[0].primaryInstructions || undefined,
            selfCritiqueInstructions:
              evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
            providesGrades: evaluation.agent.versions[0].providesGrades || false,
          },
          createdAt: new Date(
            evaluation.versions[0]?.createdAt || evaluation.createdAt
          ),
          priceInDollars: convertPriceToNumber(evaluation.versions[0]?.job?.priceInDollars) || 0,
          comments:
            evaluation.versions[0]?.comments.map((comment: any) => ({
              description: comment.description,
              importance: comment.importance || undefined,
              grade: comment.grade || undefined,
              highlight: {
                startOffset: comment.highlight.startOffset,
                endOffset: comment.highlight.endOffset,
                quotedText: comment.highlight.quotedText,
                isValid: comment.highlight.isValid,
              },
              isValid: comment.highlight.isValid,
              error: comment.highlight.isValid
                ? undefined
                : "Invalid highlight",
            })) || [],
          thinking: evaluation.versions[0]?.job?.llmThinking || "",
          summary: evaluation.versions[0]?.summary || "",
          analysis: evaluation.versions[0]?.analysis || "",
          grade: evaluation.versions[0]?.grade ?? null,
          selfCritique: evaluation.versions[0]?.selfCritique || undefined,
          versions: evaluationVersions,
          jobs,
          isStale: evaluationIsStale,
        };
      }),
    };

    // Return the document (validation removed as it was incompatible with database schema)
    return document as Document;
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
      submittedBy: dbDoc.submittedBy
        ? {
            id: dbDoc.submittedBy.id,
            name: dbDoc.submittedBy.name,
            email: null, // Explicitly set to null for privacy
            image: dbDoc.submittedBy.image,
          }
        : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      reviews: dbDoc.evaluations.map((evaluation: any) => {
        const latestEvalVersion = evaluation.versions[0];
        const isStale = latestEvalVersion && latestEvalVersion.documentVersion.version !== currentDocumentVersion;

        return {
          id: evaluation.id,
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            primaryInstructions: evaluation.agent.versions[0].primaryInstructions,
            selfCritiqueInstructions: evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
          },
          createdAt: new Date(latestEvalVersion?.createdAt || evaluation.createdAt),
          priceInDollars: 0, // Not needed for listings
          // Create empty comments array with proper length for count display
          comments: Array(latestEvalVersion?._count?.comments || 0).fill({
            id: '',
            description: '',
            importance: null,
            grade: null,
            highlight: {
              id: '',
              startOffset: 0,
              endOffset: 0,
              quotedText: '',
              isValid: true,
              prefix: null,
              error: null,
            },
          }),
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

    // Create a new job for this evaluation
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
      // Create a new evaluation record
      evaluation = await prisma.evaluation.create({
        data: {
          documentId,
          agentId,
          createdAt: new Date(),
        },
      });
    }

    // Create a new job for this evaluation
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

      // Generate markdownPrepend for the new version
      const markdownPrepend = generateMarkdownPrepend({
        title: data.title,
        author: authors[0],
        platforms,
        publishedDate: document.publishedDate?.toISOString()
      });

      // Update the document by creating a new version
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
