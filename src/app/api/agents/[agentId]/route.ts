import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-helpers";
import { AgentModel } from "@/models/Agent";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const agentId = params.agentId;
    const userId = await authenticateRequest(request);
    const agent = await AgentModel.getAgentWithOwner(
      agentId,
      userId
    );

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    logger.error("Error fetching agent", error, { 
      endpoint: "/api/agents/[agentId]",
      agentId: params.agentId,
      userId: await authenticateRequest(request)
    });
    return NextResponse.json(
      { error: "Failed to fetch agent data" },
      { status: 500 }
    );
  }
}
