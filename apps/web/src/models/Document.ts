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

export class DocumentModel {
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
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
        },
        submittedBy: {
          select: getPublicUserFields(),
        },
        evaluations: {
          where: includeStale ? {} : {
            // Only include evaluations that have at least one non-stale version
            versions: {
              some: {
                isStale: false,
              },
            },
          },
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

  static async getUserDocumentsWithEvaluations(userId: string, limit: number = 50): Promise<Document[]> {
    const dbDocs = await prisma.document.findMany({
      where: { submittedById: userId },
      orderBy: { publishedDate: "desc" },
      take: limit,
      include: {
        versions: true,
        submittedBy: {
          select: getPublicUserFields(),
        },
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
    });

    return dbDocs.map((dbDoc) => DocumentModel.formatDocumentFromDB(dbDoc));
  }

  static async getRecentDocumentsWithEvaluations(limit: number = 50): Promise<Document[]> {
    const dbDocs = await prisma.document.findMany({
      take: limit,
      orderBy: { publishedDate: "desc" },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        evaluations: {
          include: {
            agent: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
            versions: {
              select: {
                id: true,
                version: true,
                createdAt: true,
                grade: true,
                summary: true,
                analysis: true,
                selfCritique: true,
                // Minimal comment data for count only
                comments: {
                  select: {
                    id: true,
                    description: true,
                    importance: true,
                    grade: true,
                    highlight: {
                      select: {
                        id: true,
                        startOffset: true,
                        endOffset: true,
                        quotedText: true,
                        isValid: true,
                      },
                    },
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
              take: 1, // Limit to one version for performance in listings
            },
            jobs: {
              select: {
                id: true,
                status: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    // Simplified document formatting for listings
    return dbDocs.map((dbDoc) => {
      const latestVersion = dbDoc.versions[0];
      const currentDocumentVersion = latestVersion.version;

      return {
        id: dbDoc.id,
        slug: dbDoc.id,
        title: latestVersion.title,
        // Include prepend in content for display (matches what was used during analysis)
        content: getFullContent(latestVersion),
        author: latestVersion.authors.join(", "),
        publishedDate: dbDoc.publishedDate.toISOString(),
        url: latestVersion.urls[0] || "",
        importUrl: latestVersion.importUrl || undefined,
        platforms: latestVersion.platforms,
        intendedAgents: latestVersion.intendedAgents,
        submittedById: dbDoc.submittedById,
        submittedBy: undefined, // Not needed for listings
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
            comments: latestEvalVersion?.comments?.map((comment: any) => ({
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
                prefix: null,
                error: null,
              },
            })) || [],
            thinking: "",
            summary: latestEvalVersion?.summary || "",
            analysis: latestEvalVersion?.analysis || "",
            grade: latestEvalVersion?.grade ?? null,
            selfCritique: latestEvalVersion?.selfCritique || undefined,
            versions: [], // Not needed for listings
            jobs: evaluation.jobs || [],
            isStale,
          };
        }),
      } as Document;
    });
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
