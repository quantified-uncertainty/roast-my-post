"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { auth } from "@/infrastructure/auth/auth";
import { AgentInputSchema as agentSchema } from "@roast/ai";
import { getServices } from "@/application/services/ServiceFactory";
import type { AgentResponse } from "@roast/ai";
import { ValidationError } from "@roast/domain";
import { prisma } from "@/infrastructure/database/prisma";

// Extend the agent schema to include deprecation status
const agentUpdateSchema = agentSchema.extend({
  isDeprecated: z.boolean().optional(),
});

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Server action for updating an agent (now includes deprecation status)
export const updateAgent = actionClient
  .schema(agentUpdateSchema)
  .action(async (data): Promise<AgentResponse> => {
    try {
      const { isDeprecated, ...agentData } = data.parsedInput;
      const agentId = agentData.agentId;

      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("User must be logged in to update an agent");
      }

      // Start a transaction to ensure atomic updates
      const updatedAgent = await prisma.$transaction(async (tx) => {
        // First, check if user owns this agent (for deprecation update)
        const agent = await tx.agent.findUnique({
          where: { id: agentId },
          select: { submittedById: true }
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        // Update deprecation status if provided and user owns the agent
        if (isDeprecated !== undefined) {
          if (agent.submittedById !== session.user.id) {
            throw new Error("You can only change deprecation status for agents you own");
          }
          
          await tx.agent.update({
            where: { id: agentId },
            data: { isDeprecated }
          });
        }

        // Now update the agent version using the service
        const { agentService } = getServices();
        const result = await agentService.updateAgent(
          agentId,
          agentData,
          session.user.id
        );

        if (result.isError()) {
          const error = result.error();
          throw new Error(
            error instanceof ValidationError 
              ? error.message 
              : "Failed to update agent"
          );
        }

        return result.unwrap();
      });

      return {
        success: true,
        agent: updatedAgent,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update agent",
      };
    }
  });
