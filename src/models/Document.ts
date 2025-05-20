import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import { Document, DocumentSchema } from "@/types/documentSchema";

export class DocumentModel {
  static async getDocumentWithEvaluations(
    docId: string
  ): Promise<Document | null> {
    const dbDoc = await prisma.document.findUnique({
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
          },
        },
        evaluations: {
          include: {
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
                job: true,
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
      platforms: latestVersion.platforms,
      intendedAgents: latestVersion.intendedAgents,
      submittedById: dbDoc.submittedById,
      submittedBy: dbDoc.submittedBy,
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
          grade: version.grade || 0,
          documentVersion: {
            version: version.documentVersion.version,
          },
        }));

        return {
          agentId: evaluation.agent.id,
          agent: {
            id: evaluation.agent.id,
            name: evaluation.agent.versions[0].name,
            version: evaluation.agent.versions[0].version.toString(),
            description: evaluation.agent.versions[0].description,
            iconName: "robot", // TODO: Fix this
            purpose: evaluation.agent.versions[0].agentType.toLowerCase(),
            genericInstructions:
              evaluation.agent.versions[0].genericInstructions,
            summaryInstructions:
              evaluation.agent.versions[0].summaryInstructions,
            commentInstructions:
              evaluation.agent.versions[0].commentInstructions,
            gradeInstructions:
              evaluation.agent.versions[0].gradeInstructions || undefined,
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
          grade: evaluation.versions[0]?.grade || 0,
          versions: evaluationVersions,
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
        evaluations: {
          include: {
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
                job: true,
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
        platforms: latestVersion.platforms,
        intendedAgents: latestVersion.intendedAgents,
        submittedById: dbDoc.submittedById,
        submittedBy: dbDoc.submittedBy,
        reviews: dbDoc.evaluations.map((evaluation) => {
          // Map all evaluation versions
          const evaluationVersions = evaluation.versions.map((version) => ({
            createdAt: new Date(version.createdAt),
            job: version.job
              ? {
                  costInCents: version.job.costInCents || 0,
                  llmThinking: version.job.llmThinking || "",
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
            grade: version.grade || 0,
            documentVersion: {
              version: version.documentVersion.version,
            },
          }));

          return {
            agentId: evaluation.agent.id,
            agent: {
              id: evaluation.agent.id,
              name: evaluation.agent.versions[0].name,
              version: evaluation.agent.versions[0].version.toString(),
              description: evaluation.agent.versions[0].description,
              iconName: "robot", // TODO: Fix this
              purpose: evaluation.agent.versions[0].agentType.toLowerCase(),
              genericInstructions:
                evaluation.agent.versions[0].genericInstructions,
              summaryInstructions:
                evaluation.agent.versions[0].summaryInstructions,
              commentInstructions:
                evaluation.agent.versions[0].commentInstructions,
              gradeInstructions:
                evaluation.agent.versions[0].gradeInstructions || undefined,
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
            grade: evaluation.versions[0]?.grade || 0,
            versions: evaluationVersions,
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
    // Delete the document which will cascade delete all related records
    // per the Prisma schema relationships with onDelete: Cascade
    return prisma.document.delete({
      where: { id: docId },
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

  static async update(
    docId: string,
    data: {
      title: string;
      authors: string;
      urls?: string;
      platforms?: string;
      intendedAgents?: string;
      content: string;
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
