import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";
import { AgentModel } from "@/models/Agent";
import { agentSchema } from "@/models/Agent";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, commonErrors } from "@/lib/api-response-helpers";
import { ZodError } from "zod";

export async function GET() {
  const dbAgents = await prisma.agent.findMany({
    include: {
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
    },
  });

  const agents = dbAgents.map((dbAgent) => ({
    id: dbAgent.id,
    name: dbAgent.versions[0].name,
    purpose: dbAgent.versions[0].agentType.toLowerCase(),
    version: dbAgent.versions[0].version.toString(),
    description: dbAgent.versions[0].description,
  }));

  return NextResponse.json({ agents });
}

// PUT /api/agents - Update an existing agent (create new version)
export async function PUT(request: NextRequest) {
  try {
    // Authenticate request (session first for this route)
    const userId = await authenticateRequestSessionFirst(request);
    
    if (!userId) {
      return commonErrors.unauthorized();
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = agentSchema.parse(body);
    
    if (!validatedData.agentId) {
      return commonErrors.badRequest("agentId is required for updates");
    }

    // Update the agent (creates a new version)
    const agent = await AgentModel.updateAgent(
      validatedData.agentId,
      validatedData,
      userId
    );

    return successResponse({
      success: true,
      agent,
      message: `Successfully created version ${agent.version} of agent ${agent.id}`,
    });
  } catch (error) {
    logger.error('Error updating agent:', error);
    
    if (error instanceof ZodError) {
      return commonErrors.badRequest("Invalid request data");
    }
    
    if (error instanceof Error) {
      if (error.message === "Agent not found") {
        return commonErrors.notFound("Agent");
      }
      if (error.message === "You do not have permission to update this agent") {
        return commonErrors.forbidden();
      }
    }
    
    return commonErrors.serverError("Failed to update agent");
  }
}