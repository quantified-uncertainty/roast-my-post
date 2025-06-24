import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";
import { AgentModel } from "@/models/Agent";
import { agentSchema } from "@/models/Agent";

export async function GET() {
  const prisma = new PrismaClient();
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = agentSchema.parse(body);
    
    if (!validatedData.agentId) {
      return NextResponse.json(
        { error: "agentId is required for updates" },
        { status: 400 }
      );
    }

    // Update the agent (creates a new version)
    const agent = await AgentModel.updateAgent(
      validatedData.agentId,
      validatedData,
      userId
    );

    return NextResponse.json({
      success: true,
      agent,
      message: `Successfully created version ${agent.version} of agent ${agent.id}`,
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    
    if (error instanceof Error) {
      if (error.message === "Agent not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "You do not have permission to update this agent") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}