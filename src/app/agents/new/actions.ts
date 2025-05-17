"use server";

import { createSafeActionClient } from "next-safe-action";

import { auth } from "@/lib/auth";
import { AgentModel, agentSchema } from "@/models/Agent";
import type { Agent, AgentResponse } from "@/types/agentSchema";

// Setup next-safe-action
const actionClient = createSafeActionClient();

const createSuccessResponse = (agent: Agent): AgentResponse => ({
  success: true,
  agent,
  id: agent.id,
});

const createErrorResponse = (error: unknown): AgentResponse => {
  console.error("Error handling agent:", error);
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

      const agent = data.parsedInput.agentId
        ? await AgentModel.updateAgent(
            data.parsedInput.agentId,
            data.parsedInput,
            session.user.id
          )
        : await AgentModel.createAgent(data.parsedInput, session.user.id);

      return createSuccessResponse(agent);
    } catch (error) {
      return createErrorResponse(error);
    }
  });
