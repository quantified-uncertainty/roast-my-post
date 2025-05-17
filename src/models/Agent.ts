import { nanoid } from "nanoid";

import type { Agent, AgentInput } from "@/types/agentSchema";
import { AgentInputSchema, AgentSchema } from "@/types/agentSchema";
import { PrismaClient } from "@prisma/client";

export { AgentInputSchema as agentSchema };
export type { AgentInput };

export class AgentModel {
  static async createAgent(data: AgentInput, userId: string): Promise<Agent> {
    const prisma = new PrismaClient();
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
              agentType: data.purpose,
              description: data.description,
              genericInstructions: data.genericInstructions,
              summaryInstructions: data.summaryInstructions,
              commentInstructions: data.commentInstructions,
              gradeInstructions: data.gradeInstructions,
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
        purpose: agent.versions[0].agentType,
        version: agent.versions[0].version.toString(),
        description: agent.versions[0].description,
        iconName: "robot",
        genericInstructions: agent.versions[0].genericInstructions,
        summaryInstructions: agent.versions[0].summaryInstructions,
        commentInstructions: agent.versions[0].commentInstructions,
        gradeInstructions: agent.versions[0].gradeInstructions,
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
    const prisma = new PrismaClient();
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
              agentType: data.purpose,
              description: data.description,
              genericInstructions: data.genericInstructions,
              summaryInstructions: data.summaryInstructions,
              commentInstructions: data.commentInstructions,
              gradeInstructions: data.gradeInstructions,
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
        purpose: agent.versions[0].agentType,
        version: agent.versions[0].version.toString(),
        description: agent.versions[0].description,
        iconName: "robot",
        genericInstructions: agent.versions[0].genericInstructions,
        summaryInstructions: agent.versions[0].summaryInstructions,
        commentInstructions: agent.versions[0].commentInstructions,
        gradeInstructions: agent.versions[0].gradeInstructions,
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
    const prisma = new PrismaClient();
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
        },
      });

      if (!dbAgent) return null;

      const isOwner = currentUserId === dbAgent.submittedById;

      return AgentSchema.parse({
        id: dbAgent.id,
        name: dbAgent.versions[0].name,
        purpose: dbAgent.versions[0].agentType,
        version: dbAgent.versions[0].version.toString(),
        description: dbAgent.versions[0].description,
        iconName: "robot",
        genericInstructions: dbAgent.versions[0].genericInstructions,
        summaryInstructions: dbAgent.versions[0].summaryInstructions,
        commentInstructions: dbAgent.versions[0].commentInstructions,
        gradeInstructions: dbAgent.versions[0].gradeInstructions,
        owner: {
          id: dbAgent.submittedById,
          name: dbAgent.submittedBy.name || "Unknown",
          email: dbAgent.submittedBy.email || "unknown@example.com",
        },
        isOwner,
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}
