import { NextRequest } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { getServices } from "@/application/services/ServiceFactory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { agentId } = resolvedParams;

    const { agentService } = getServices();

    // Verify agent exists (allow public access)
    const agentResult = await agentService.getAgentWithOwner(agentId);
    if (agentResult.isError() || !agentResult.unwrap()) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "40");

    // Fetch documents evaluated by this agent
    const documentsResult = await agentService.getAgentDocuments(agentId, limit);

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