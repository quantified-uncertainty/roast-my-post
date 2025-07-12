import { nanoid } from "nanoid";

import { prisma } from "@/lib/prisma";
import type { Agent, AgentInput } from "@/types/agentSchema";
import {
  AgentInputSchema,
  AgentSchema,
  AgentVersionSchema,
} from "@/types/agentSchema";
import type { AgentReview } from "@/types/evaluationSchema";
import { AgentReviewSchema } from "@/types/evaluationSchema";
import type { AgentVersion } from "@/types/agentSchema";

export { AgentInputSchema as agentSchema };
export type { AgentInput };

export class AgentModel {
  static async createAgent(data: AgentInput, userId: string): Promise<Agent> {
    try {
      const id = nanoid(16);
      const agent = await prisma.agent.create({
        data: {
          id,
          submittedById: userId,
          versions: {
            create: {
              version: 1,
              name: data.name,
              description: data.description,
              primaryInstructions: data.primaryInstructions,
              selfCritiqueInstructions: data.selfCritiqueInstructions,
              providesGrades: data.providesGrades || false,
              extendedCapabilityId: data.extendedCapabilityId,
              readme: data.readme,
            },
          },
        },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return AgentSchema.parse({
        id: agent.id,
        name: agent.versions[0].name,
        version: agent.versions[0].version.toString(),
        description: agent.versions[0].description,
        primaryInstructions: agent.versions[0].primaryInstructions || undefined,
        selfCritiqueInstructions: agent.versions[0].selfCritiqueInstructions || undefined,
        providesGrades: agent.versions[0].providesGrades ?? false,
        extendedCapabilityId: agent.versions[0].extendedCapabilityId || undefined,
        readme: agent.versions[0].readme || undefined,
        owner: {
          id: agent.submittedById,
          name: agent.submittedBy.name || "Unknown",
          email: agent.submittedBy.email || "unknown@example.com",
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async updateAgent(
    agentId: string,
    data: AgentInput,
    userId: string
  ): Promise<Agent> {
    try {
      const existingAgent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      });

      if (!existingAgent) throw new Error("Agent not found");
      if (existingAgent.submittedById !== userId)
        throw new Error("You do not have permission to update this agent");

      const latestVersion = existingAgent.versions[0].version;

      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          updatedAt: new Date(),
          versions: {
            create: {
              version: latestVersion + 1,
              name: data.name,
              description: data.description,
              primaryInstructions: data.primaryInstructions,
              selfCritiqueInstructions: data.selfCritiqueInstructions,
              providesGrades: data.providesGrades || false,
              extendedCapabilityId: data.extendedCapabilityId,
              readme: data.readme,
            },
          },
        },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return AgentSchema.parse({
        id: agent.id,
        name: agent.versions[0].name,
        version: agent.versions[0].version.toString(),
        description: agent.versions[0].description,
        primaryInstructions: agent.versions[0].primaryInstructions || undefined,
        selfCritiqueInstructions: agent.versions[0].selfCritiqueInstructions || undefined,
        providesGrades: agent.versions[0].providesGrades ?? false,
        extendedCapabilityId: agent.versions[0].extendedCapabilityId || undefined,
        readme: agent.versions[0].readme || undefined,
        owner: {
          id: agent.submittedById,
          name: agent.submittedBy.name || "Unknown",
          email: agent.submittedBy.email || "unknown@example.com",
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getAgentWithOwner(
    agentId: string,
    currentUserId?: string
  ): Promise<Agent | null> {
    try {
      const dbAgent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ephemeralBatch: {
            select: {
              trackingId: true,
              isEphemeral: true,
            },
          },
        },
      });

      if (!dbAgent) return null;

      const isOwner = currentUserId === dbAgent.submittedById;

      return AgentSchema.parse({
        id: dbAgent.id,
        name: dbAgent.versions[0].name,
        version: dbAgent.versions[0].version.toString(),
        description: dbAgent.versions[0].description,
        primaryInstructions: dbAgent.versions[0].primaryInstructions || undefined,
        selfCritiqueInstructions: dbAgent.versions[0].selfCritiqueInstructions || undefined,
        providesGrades: dbAgent.versions[0].providesGrades ?? false,
        extendedCapabilityId: dbAgent.versions[0].extendedCapabilityId || undefined,
        readme: dbAgent.versions[0].readme || undefined,
        owner: {
          id: dbAgent.submittedById,
          name: dbAgent.submittedBy.name || "Unknown",
        },
        isOwner,
        ephemeralBatch: dbAgent.ephemeralBatch,
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getAgentVersions(agentId: string): Promise<AgentVersion[]> {
    try {
      const versions = await prisma.agentVersion.findMany({
        where: { agentId },
        orderBy: { version: "desc" },
      });

      return versions.map((version) =>
        AgentVersionSchema.parse({
          id: version.id,
          version: version.version,
          name: version.name,
          description: version.description,
          primaryInstructions: version.primaryInstructions || undefined,
          selfCritiqueInstructions: version.selfCritiqueInstructions || undefined,
          providesGrades: version.providesGrades ?? false,
          extendedCapabilityId: version.extendedCapabilityId || undefined,
          readme: version.readme || undefined,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
        })
      );
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getAgentReview(agentId: string): Promise<AgentReview | null> {
    try {
      const evaluationVersion = await prisma.evaluationVersion.findFirst({
        where: {
          agentId: agentId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          evaluation: {
            include: {
              document: {
                include: {
                  submittedBy: true,
                },
              },
            },
          },
        },
      });

      if (!evaluationVersion) {
        return null;
      }

      return AgentReviewSchema.parse({
        evaluatedAgentId: agentId,
        grade: evaluationVersion.grade ?? undefined,
        summary: evaluationVersion.summary,
        author:
          evaluationVersion.evaluation.document.submittedBy.name || "Unknown",
        createdAt: evaluationVersion.createdAt,
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getAgentDocuments(agentId: string, limit: number = 40) {
    try {
      const evaluations = await prisma.evaluation.findMany({
        where: {
          agentId: agentId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        include: {
          document: {
            include: {
              versions: {
                orderBy: { version: "desc" },
                take: 1,
              },
              submittedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              job: {
                select: {
                  status: true,
                  createdAt: true,
                  completedAt: true,
                  costInCents: true,
                },
              },
            },
          },
        },
      });

      return evaluations.map((evaluation) => {
        const latestDocumentVersion = evaluation.document.versions[0];
        const latestEvaluationVersion = evaluation.versions[0];

        return {
          id: evaluation.document.id,
          title: latestDocumentVersion?.title || "Untitled",
          author: evaluation.document.submittedBy.name || "Unknown",
          publishedDate: evaluation.document.publishedDate,
          evaluationId: evaluation.id,
          evaluationCreatedAt: evaluation.createdAt,
          summary: latestEvaluationVersion?.summary,
          analysis: latestEvaluationVersion?.analysis,
          grade: latestEvaluationVersion?.grade,
          jobStatus: latestEvaluationVersion?.job?.status,
          jobCreatedAt: latestEvaluationVersion?.job?.createdAt,
          jobCompletedAt: latestEvaluationVersion?.job?.completedAt,
          costInCents: latestEvaluationVersion?.job?.costInCents,
        };
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getAgentEvaluations(agentId: string, options?: { limit?: number; batchId?: string }) {
    const limit = options?.limit || 50;
    const batchId = options?.batchId;
    
    try {
      let whereConditions: any = {
        agentId: agentId,
      };

      // If batchId is provided, filter evaluations by batch
      if (batchId) {
        // First get all job IDs for this batch
        const jobsInBatch = await prisma.job.findMany({
          where: { agentEvalBatchId: batchId },
          select: { evaluationVersionId: true },
        });
        
        const evaluationVersionIds = jobsInBatch
          .map(job => job.evaluationVersionId)
          .filter((id): id is string => id !== null);
        
        whereConditions.id = { in: evaluationVersionIds };
      }

      const evaluations = await prisma.evaluationVersion.findMany({
        where: whereConditions,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        include: {
          evaluation: {
            include: {
              document: {
                include: {
                  versions: {
                    orderBy: { version: "desc" },
                    take: 1,
                  },
                  submittedBy: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          job: {
            select: {
              status: true,
              createdAt: true,
              completedAt: true,
              costInCents: true,
              llmThinking: true,
              tasks: {
                select: {
                  id: true,
                  name: true,
                  modelName: true,
                  priceInCents: true,
                  timeInSeconds: true,
                  log: true,
                  createdAt: true,
                  llmInteractions: true,
                },
              },
            },
          },
          agentVersion: {
            select: {
              version: true,
              name: true,
            },
          },
          comments: {
            select: {
              id: true,
              description: true,
              importance: true,
              grade: true,
            },
          },
        },
      });

      return evaluations.map((evalVersion) => {
        const latestDocumentVersion = evalVersion.evaluation.document.versions[0];
        
        return {
          id: evalVersion.id,
          evaluationId: evalVersion.evaluationId,
          documentId: evalVersion.evaluation.documentId,
          documentTitle: latestDocumentVersion?.title || "Untitled",
          documentAuthor: evalVersion.evaluation.document.submittedBy.name || "Unknown",
          agentVersion: evalVersion.agentVersion?.version || evalVersion.agentVersionId,
          agentVersionName: evalVersion.agentVersion?.name,
          evaluationVersion: evalVersion.version,
          summary: evalVersion.summary,
          analysis: evalVersion.analysis,
          grade: evalVersion.grade,
          selfCritique: evalVersion.selfCritique,
          createdAt: evalVersion.createdAt,
          jobStatus: evalVersion.job?.status,
          jobCreatedAt: evalVersion.job?.createdAt,
          jobCompletedAt: evalVersion.job?.completedAt,
          costInCents: evalVersion.job?.costInCents,
          comments: evalVersion.comments,
          job: evalVersion.job,
        };
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}
