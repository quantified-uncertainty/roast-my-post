import { NextRequest } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { getServices } from "@/application/services/ServiceFactory";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { agentId } = resolvedParams;

    // Get requesting user (optional - supports both authenticated and anonymous)
    const requestingUserId = await authenticateRequest(request);

    const { agentService } = getServices();

    // Verify agent exists (allow public access)
    const agentResult = await agentService.getAgentWithOwner(agentId);
    if (agentResult.isError()) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }
    
    if (!agentResult.unwrap()) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "40");

    // Fetch documents evaluated by this agent (with privacy filtering)
    const documentsResult = await agentService.getAgentDocuments(agentId, limit, requestingUserId);

    if (documentsResult.isError()) {
      logger.error('Error fetching agent documents:', documentsResult.error());
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    const documents = documentsResult.unwrap();
    return Response.json({ documents });
  } catch (error) {
    logger.error('Error fetching agent documents:', error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}