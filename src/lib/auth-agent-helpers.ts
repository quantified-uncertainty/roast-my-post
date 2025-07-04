import { NextRequest } from "next/server";
import { authenticateRequest, authenticateRequestSessionFirst } from "./auth-helpers";
import { prisma } from "./prisma";
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from "./api-response-helpers";

/**
 * Authenticates a request and verifies the user has access to a specific agent
 * 
 * @param request - The NextRequest object
 * @param agentId - The agent ID to check access for
 * @param useSession - If true, use session-based auth. If false, use API key auth.
 * @param requireOwnership - If true, user must be the agent owner. If false, just needs valid auth.
 * @returns Object with userId and agent if successful, or error response if not
 */
export async function authenticateAndVerifyAgentAccess(
  request: NextRequest,
  agentId: string,
  useSession = false,
  requireOwnership = false
) {
  // Authenticate request
  const userId = useSession 
    ? await authenticateRequestSessionFirst(request)
    : await authenticateRequest(request);
  
  if (!userId) {
    return { error: unauthorizedResponse() };
  }

  // Get agent
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      submittedBy: true,
    },
  });

  if (!agent) {
    return { error: notFoundResponse("Agent") };
  }

  // Check ownership if required
  if (requireOwnership && agent.submittedById !== userId) {
    return { error: forbiddenResponse("You do not have permission to modify this agent") };
  }

  return { userId, agent };
}