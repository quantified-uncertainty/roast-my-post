import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logging/logger";

// Validation schema for the request body
const deprecateRequestSchema = z.object({
  isDeprecated: z.boolean()
});

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

    // Parse and validate the request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate the request body shape
    const parseResult = deprecateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request: isDeprecated must be a boolean" },
        { status: 400 }
      );
    }

    const { isDeprecated } = parseResult.data;
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