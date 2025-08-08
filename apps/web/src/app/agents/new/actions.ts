"use server";

import { createSafeActionClient } from "next-safe-action";
import { logger } from "@/infrastructure/logging/logger";

import { auth } from "@/infrastructure/auth/auth";
import { agentSchema } from "@/models/Agent";
import { getServices } from "@/application/services/ServiceFactory";
import type { Agent, AgentResponse } from "@roast/ai";
import { ValidationError } from "@roast/domain";

// Setup next-safe-action
const actionClient = createSafeActionClient();

const createSuccessResponse = (agent: Agent): AgentResponse => ({
  success: true,
  agent,
  id: agent.id,
});

const createErrorResponse = (error: unknown): AgentResponse => {
  logger.error('Error handling agent:', error);
  if (error instanceof Error) {
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "Failed to handle agent",
  };
};

// Server action for creating an agent
export const createAgent = actionClient
  .schema(agentSchema)
  .action(async (data): Promise<AgentResponse> => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error("User must be logged in to create an agent");
      }

      const { agentService } = getServices();

      const result = data.parsedInput.agentId
        ? await agentService.updateAgent(
            data.parsedInput.agentId,
            data.parsedInput,
            session.user.id
          )
        : await agentService.createAgent(data.parsedInput, session.user.id);

      if (result.isError()) {
        const error = result.error();
        if (error instanceof ValidationError) {
          throw new Error(error.message);
        }
        throw new Error("Failed to handle agent");
      }

      const agent = result.unwrap();
      return createSuccessResponse(agent);
    } catch (error) {
      return createErrorResponse(error);
    }
  });
