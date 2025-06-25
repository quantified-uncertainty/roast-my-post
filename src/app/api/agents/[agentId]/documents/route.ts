import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth-helpers";
import { AgentModel } from "@/models/Agent";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { agentId } = resolvedParams;

    // Verify agent exists and user has access
    const agent = await AgentModel.getAgentWithOwner(agentId, userId);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "40");

    // Fetch documents evaluated by this agent
    const documents = await AgentModel.getAgentDocuments(agentId, limit);

    return Response.json({ documents });
  } catch (error) {
    logger.error('Error fetching agent documents:', error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}