import { nanoid } from "nanoid";

import { Document, DocumentSchema } from "@/types/documentSchema";
import { PrismaClient } from "@prisma/client";

export class DocumentModel {
  private static prisma = new PrismaClient();

  static async getDocumentWithEvaluations(
    docId: string
  ): Promise<Document | null> {
    const dbDoc = await this.prisma.document.findUnique({
      where: { id: docId },
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
      reviews: dbDoc.evaluations.map((evaluation) => ({
        agentId: evaluation.agent.id,
        agent: {
          id: evaluation.agent.id,
          name: evaluation.agent.versions[0].name,
          version: evaluation.agent.versions[0].version.toString(),
          description: evaluation.agent.versions[0].description,
          iconName: "robot", // TODO: Fix this
          purpose: evaluation.agent.versions[0].agentType.toLowerCase(),
          genericInstructions: evaluation.agent.versions[0].genericInstructions,
          summaryInstructions: evaluation.agent.versions[0].summaryInstructions,
          commentInstructions: evaluation.agent.versions[0].commentInstructions,
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
            error: comment.highlight.isValid ? undefined : "Invalid highlight",
          })) || [],
        thinking: evaluation.versions[0]?.job?.llmThinking || "",
        summary: evaluation.versions[0]?.summary || "",
        grade: evaluation.versions[0]?.grade || 0,
      })),
    };

    // Validate the transformed document against the schema
    return DocumentSchema.parse(document);
  }

  static async getAllDocumentsWithEvaluations(): Promise<Document[]> {
    const dbDocs = await this.prisma.document.findMany({
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
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
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
        reviews: dbDoc.evaluations.map((evaluation) => ({
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
        })),
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
    const document = await this.prisma.document.create({
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
    return this.prisma.document.delete({
      where: { id: docId },
    });
  }

  static async checkOwnership(docId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true },
    });

    return document?.submittedById === userId;
  }
}
