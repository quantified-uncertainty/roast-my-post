"use server";

import { createSafeActionClient } from "next-safe-action";

import { auth } from "@/lib/auth";
import { AgentModel, agentSchema } from "@/models/Agent";

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Server action for updating an agent
export const updateAgent = actionClient
  .schema(agentSchema)
  .action(async (data) => {
    try {
      const agentId = data.parsedInput.agentId;

      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("User must be logged in to update an agent");
      }

      const updatedAgent = await AgentModel.updateAgent(
        agentId,
        data.parsedInput,
        session.user.id
      );

      return {
        success: true,
        agent: updatedAgent,
      };
    } catch (error) {
      console.error("Error updating agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update agent",
      };
    }
  });
