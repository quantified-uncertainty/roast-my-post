"use server";

import { nanoid } from "nanoid";
import { createSafeActionClient } from "next-safe-action";

import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

import { type AgentInput, agentSchema } from "./schema";

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Server action for creating an agent
export const createAgent = actionClient
  .schema(agentSchema)
  .action(async ({ parsedInput: data }: { parsedInput: AgentInput }) => {
    try {
      const prisma = new PrismaClient();
      const session = await auth();

      console.log("Auth session:", session);

      if (!session?.user?.id) {
        throw new Error("User must be logged in to create an agent");
      }

      // Generate a nanoid for the agent id
      const id = nanoid(16);

      console.log("Creating agent with data:", {
        id,
        submittedById: session.user.id,
        ...data,
      });

      // Create the agent
      const agent = await prisma.agent.create({
        data: {
          id,
          submittedById: session.user.id,
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
            orderBy: {
              version: "desc",
            },
            take: 1,
          },
        },
      });

      await prisma.$disconnect();

      return {
        success: true,
        agent,
        id,
      };
    } catch (error) {
      console.error("Error creating agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      return {
        success: false,
        error: "Failed to create agent",
      };
    }
  });
