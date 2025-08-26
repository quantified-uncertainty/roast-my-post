import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logging/logger";

export async function POST(
  request: NextRequest, 
  context: { params: Promise<{ agentId: string }> }
) {
  const params = await context.params;
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { isDeprecated } = await request.json();
    const agentId = params.agentId;

    // Check if user owns this agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { submittedById: true }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.submittedById !== session.user.id) {
      return NextResponse.json(
        { error: "You can only deprecate agents you own" },
        { status: 403 }
      );
    }

    // Update the agent's deprecation status
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: { isDeprecated },
    });

    return NextResponse.json({ success: true, isDeprecated: updatedAgent.isDeprecated });
  } catch (error) {
    logger.error("Error updating agent deprecation status", error, {
      endpoint: "/api/agents/[agentId]/deprecate",
      agentId: params.agentId
    });
    return NextResponse.json(
      { error: "Failed to update deprecation status" },
      { status: 500 }
    );
  }
}