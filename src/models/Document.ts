import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import {
  Document,
  DocumentSchema,
} from "@/types/documentSchema";

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
        agentType: string;
        description: string;
        genericInstructions: string;
        summaryInstructions: string;
        commentInstructions: string;
        gradeInstructions: string | null;
        selfCritiqueInstructions: string | null;
      }>;
    };
    versions: Array<{
      id: string;
      createdAt: Date;
      summary: string | null;
      analysis: string | null;
      grade: number | null;
      selfCritique: string | null;
      comments: Array<{
        id: string;
        title: string;
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
        costInCents: number | null;
        llmThinking: string | null;
        durationInSeconds: number | null;
        logs: string | null;
        tasks: Array<{
          id: string;
          name: string;
          modelName: string;
          priceInCents: number;
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
  static async getDocumentWithEvaluations(
    docId: string
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
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
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
                    highlight: true,
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

    // Transform database document to frontend Document shape
    const document: Document = {
      id: dbDoc.id,
      slug: dbDoc.id,
      title: latestVersion.title,
      content: latestVersion.content,
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
            email: dbDoc.submittedBy.email,
            image: dbDoc.submittedBy.image,
          }
        : undefined,
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      reviews: dbDoc.evaluations.map((evaluation) => {
        // Map all evaluation versions
        const evaluationVersions = evaluation.versions.map((version) => ({
          createdAt: new Date(version.createdAt),
          job: version.job
            ? {
                costInCents: version.job.costInCents || 0,
                llmThinking: version.job.llmThinking || "",
                durationInSeconds: version.job.durationInSeconds || undefined,
                logs: version.job.logs || undefined,
                tasks: version.job.tasks.map((task) => ({
                  id: task.id,
                  name: task.name,
                  modelName: task.modelName,
                  priceInCents: task.priceInCents,
                  timeInSeconds: task.timeInSeconds,
                  log: task.log,
                  llmInteractions: (task as any).llmInteractions,
                  createdAt: task.createdAt,
                })),
              }
            : undefined,
          comments: version.comments.map((comment) => ({
            title: comment.title,
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
            error: comment.highlight.isValid ? undefined : "Invalid highlight",
          })),
          summary: version.summary || "",
          analysis: version.analysis || undefined,
          grade: version.grade ?? undefined,
          selfCritique: version.selfCritique || undefined,
          documentVersion: {
            version: version.documentVersion.version,
          },
        }));

        // Map jobs for this evaluation
        const jobs = (evaluation.jobs || []).map((job) => ({
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
        }));

        return {
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            purpose: evaluation.agent.versions[0].agentType.toLowerCase(),
            genericInstructions:
              evaluation.agent.versions[0].genericInstructions,
            summaryInstructions:
              evaluation.agent.versions[0].summaryInstructions,
            commentInstructions:
              evaluation.agent.versions[0].commentInstructions,
            gradeInstructions:
              evaluation.agent.versions[0].gradeInstructions || undefined,
            selfCritiqueInstructions:
              evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
          },
          createdAt: new Date(
            evaluation.versions[0]?.createdAt || evaluation.createdAt
          ),
          costInCents: evaluation.versions[0]?.job?.costInCents || 0,
          comments:
            evaluation.versions[0]?.comments.map((comment) => ({
              title: comment.title,
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
          grade: evaluation.versions[0]?.grade ?? undefined,
          selfCritique: evaluation.versions[0]?.selfCritique || undefined,
          versions: evaluationVersions,
          jobs,
        };
      }),
    };

    // Validate the transformed document against the schema
    return DocumentSchema.parse(document);
  }

  static async getAllDocumentsWithEvaluations(): Promise<Document[]> {
    const dbDocs = await prisma.document.findMany({
      include: {
        versions: true,
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
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
                    highlight: true,
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

    return dbDocs.map((dbDoc) => {
      if (!dbDoc.versions.length) {
        throw new Error(`Document ${dbDoc.id} has no versions`);
      }

      const latestVersion = dbDoc.versions[0];

      // Transform database document to frontend Document shape
      const document: Document = {
        id: dbDoc.id,
        slug: dbDoc.id,
        title: latestVersion.title,
        content: latestVersion.content,
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
              email: dbDoc.submittedBy.email,
              image: dbDoc.submittedBy.image,
            }
          : undefined,
        createdAt: dbDoc.createdAt,
        updatedAt: dbDoc.updatedAt,
        reviews: dbDoc.evaluations.map((evaluation) => {
          // Map all evaluation versions
          const evaluationVersions = evaluation.versions.map((version) => ({
            createdAt: new Date(version.createdAt),
            job: version.job
              ? {
                  costInCents: version.job.costInCents || 0,
                  llmThinking: version.job.llmThinking || "",
                  durationInSeconds: version.job.durationInSeconds || undefined,
                  logs: version.job.logs || undefined,
                  tasks: version.job.tasks || [],
                }
              : undefined,
            comments: version.comments.map((comment) => ({
              title: comment.title,
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
            grade: version.grade ?? undefined,
            selfCritique: version.selfCritique || undefined,
            documentVersion: {
              version: version.documentVersion.version,
            },
          }));

          // Map jobs for this evaluation
          const jobs = (evaluation.jobs || []).map((job) => ({
            id: job.id,
            status: job.status,
            createdAt: job.createdAt,
          }));

          return {
            agentId: evaluation.agent.id,
            agent: {
              id: evaluation.agent.id,
              name: evaluation.agent.versions[0].name,
              version: evaluation.agent.versions[0].version.toString(),
              description: evaluation.agent.versions[0].description,
              purpose: evaluation.agent.versions[0].agentType.toLowerCase(),
              genericInstructions:
                evaluation.agent.versions[0].genericInstructions || undefined,
              summaryInstructions:
                evaluation.agent.versions[0].summaryInstructions || undefined,
              commentInstructions:
                evaluation.agent.versions[0].commentInstructions || undefined,
              gradeInstructions:
                evaluation.agent.versions[0].gradeInstructions || undefined,
              selfCritiqueInstructions:
                evaluation.agent.versions[0].selfCritiqueInstructions || undefined,
            },
            createdAt: new Date(
              evaluation.versions[0]?.createdAt || evaluation.createdAt
            ),
            costInCents: evaluation.versions[0]?.job?.costInCents || 0,
            comments:
              evaluation.versions[0]?.comments.map((comment) => ({
                title: comment.title,
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
            grade: evaluation.versions[0]?.grade ?? undefined,
            selfCritique: evaluation.versions[0]?.selfCritique || undefined,
            versions: evaluationVersions,
            jobs,
          };
        }),
      };

      // Validate the transformed document against the schema
      return DocumentSchema.parse(document);
    });
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
    // Generate a nanoid for the document id
    const id = nanoid(16);

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
            authors: data.authors.split(",").map((a) => a.trim()),
            urls: data.urls ? data.urls.split(",").map((u) => u.trim()) : [],
            platforms: data.platforms
              ? data.platforms.split(",").map((p) => p.trim())
              : [],
            intendedAgents: data.intendedAgents
              ? data.intendedAgents.split(",").map((a) => a.trim())
              : [],
            content: data.content,
            importUrl: data.importUrl || null,
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
    await prisma.job.create({
      data: {
        status: "PENDING",
        evaluation: {
          connect: {
            id: evaluation.id,
          },
        },
      },
    });

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
    await prisma.job.create({
      data: {
        status: "PENDING",
        evaluation: {
          connect: {
            id: evaluation.id,
          },
        },
      },
    });

    return { success: true };
  }

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
    // First get current document and its latest version
    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
        },
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

    // Update the document by creating a new version
    const updatedDocument = await prisma.document.update({
      where: { id: docId },
      data: {
        versions: {
          create: {
            version: newVersion,
            title: data.title,
            authors: data.authors.split(",").map((a) => a.trim()),
            urls: data.urls ? data.urls.split(",").map((u) => u.trim()) : [],
            platforms: data.platforms
              ? data.platforms.split(",").map((p) => p.trim())
              : [],
            intendedAgents: data.intendedAgents
              ? data.intendedAgents.split(",").map((a) => a.trim())
              : [],
            content: data.content,
            importUrl: data.importUrl || null,
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
      },
    });

    return updatedDocument;
  }
}
