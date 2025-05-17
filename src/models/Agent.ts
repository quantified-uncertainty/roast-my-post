import { nanoid } from "nanoid";
import { z } from "zod";

import type { AgentPurpose } from "@/types/evaluationAgents";
import { PrismaClient } from "@prisma/client";

// Schema for form validation
export const agentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  purpose: z.enum(["ASSESSOR", "ADVISOR", "ENRICHER", "EXPLAINER"]),
  description: z.string().min(30, "Description must be at least 30 characters"),
  iconName: z.string().min(1, "Icon name is required"),
  genericInstructions: z
    .string()
    .min(30, "Generic instructions must be at least 30 characters"),
  summaryInstructions: z
    .string()
    .min(30, "Summary instructions must be at least 30 characters"),
  commentInstructions: z
    .string()
    .min(30, "Comment instructions must be at least 30 characters"),
  gradeInstructions: z.string().optional(),
  agentId: z.string().optional(),
});

export type AgentInput = z.infer<typeof agentSchema>;

export class AgentModel {
  static async createAgent(data: any, userId: string) {
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
        },
      });
      return agent;
    } finally {
      await prisma.$disconnect();
    }
  }

  static async updateAgent(agentId: string, data: any, userId: string) {
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
        },
      });
      return agent;
    } finally {
      await prisma.$disconnect();
    }
  }

  static async getAgentWithOwner(agentId: string, currentUserId?: string) {
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

      return {
        id: dbAgent.id,
        name: dbAgent.versions[0].name,
        purpose: dbAgent.versions[0].agentType.toLowerCase() as AgentPurpose,
        version: dbAgent.versions[0].version.toString(),
        description: dbAgent.versions[0].description,
        iconName: "robot",
        genericInstructions: dbAgent.versions[0].genericInstructions,
        summaryInstructions: dbAgent.versions[0].summaryInstructions,
        commentInstructions: dbAgent.versions[0].commentInstructions,
        gradeInstructions: dbAgent.versions[0].gradeInstructions || undefined,
        owner: {
          id: dbAgent.submittedById,
          name: dbAgent.submittedBy.name || "Unknown",
          email: dbAgent.submittedBy.email || "unknown@example.com",
        },
        isOwner,
      };
    } finally {
      await prisma.$disconnect();
    }
  }
}
