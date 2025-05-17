import { PrismaClient } from "@prisma/client";

export class Document {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: {
    id: string;
    publishedDate: Date;
    submittedById: string;
    title: string;
    authors: string[];
    urls: string[];
    platforms: string[];
    intendedAgents: string[];
    content: string;
  }) {
    return this.prisma.document.create({
      data: {
        id: data.id,
        publishedDate: data.publishedDate,
        submittedById: data.submittedById,
        versions: {
          create: {
            version: 1,
            title: data.title,
            authors: data.authors,
            urls: data.urls,
            platforms: data.platforms,
            intendedAgents: data.intendedAgents,
            content: data.content,
          },
        },
        // Create evaluations for each intended agent
        evaluations: {
          create: data.intendedAgents.map((agentId) => ({
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
  }
}
