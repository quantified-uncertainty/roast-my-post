"use server";

import { createSafeActionClient } from "next-safe-action";

import { auth } from "@/infrastructure/auth/auth";
import { agentSchema } from "@/models/Agent";
import { getServices } from "@/application/services/ServiceFactory";
import type { AgentResponse } from "@roast/ai";
import { ValidationError } from "@roast/domain";

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Server action for updating an agent
export const updateAgent = actionClient
  .schema(agentSchema)
  .action(async (data): Promise<AgentResponse> => {
    try {
      const agentId = data.parsedInput.agentId;

      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("User must be logged in to update an agent");
      }

      const { agentService } = getServices();
      const result = await agentService.updateAgent(
        agentId,
        data.parsedInput,
        session.user.id
      );

      if (result.isError()) {
        const error = result.error();
        const errorMessage = error instanceof ValidationError 
          ? error.message 
          : "Failed to update agent";
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      const updatedAgent = result.unwrap();
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
