import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { getServices } from "@/application/services/ServiceFactory";
import { logger } from "@/infrastructure/logging/logger";

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const agentId = params.agentId;
    const userId = await authenticateRequest(request);
    
    const { agentService } = getServices();
    const result = await agentService.getAgentWithOwner(agentId, userId);

    if (result.isError()) {
      logger.error("Error fetching agent", result.error(), { 
        endpoint: "/api/agents/[agentId]",
        agentId,
        userId
      });
      return NextResponse.json(
        { error: "Failed to fetch agent data" },
        { status: 500 }
      );
    }

    const agent = result.unwrap();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    logger.error("Error fetching agent", error, { 
      endpoint: "/api/agents/[agentId]",
      agentId: params.agentId
    });
    return NextResponse.json(
      { error: "Failed to fetch agent data" },
      { status: 500 }
    );
  }
}
