"use server";

import { createSafeActionClient } from "next-safe-action";

import { auth } from "@/lib/auth";
import { AgentModel, agentSchema } from "@/models/Agent";

// Setup next-safe-action
const actionClient = createSafeActionClient();

// Server action for creating an agent
export const createAgent = actionClient
  .schema(agentSchema)
  .action(async (data) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error("User must be logged in to create an agent");
      }
      let agent;
      if (data.parsedInput.agentId) {
        agent = await AgentModel.updateAgent(
          data.parsedInput.agentId,
          data.parsedInput,
          session.user.id
        );
      } else {
        agent = await AgentModel.createAgent(data.parsedInput, session.user.id);
      }
      return {
        success: true,
        agent,
        id: agent.id,
      };
    } catch (error) {
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
        error:
          error instanceof Error ? error.message : "Failed to handle agent",
      };
    }
  });
