import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequestSessionFirst } from "@/infrastructure/auth/auth-helpers";
import { AgentInputSchema as agentSchema } from "@roast/ai";
import { getServices } from "@/application/services/ServiceFactory";
import { successResponse, commonErrors } from "@/infrastructure/http/api-response-helpers";
import { ZodError } from "zod";
import { ValidationError } from "@roast/domain";

export async function GET() {
  try {
    const { agentService } = getServices();
    const result = await agentService.getAllAgents();

    if (result.isError()) {
      logger.error('Error fetching agents:', result.error());
      return commonErrors.serverError("Failed to fetch agents");
    }

    const agents = result.unwrap();
    return NextResponse.json({ agents });
  } catch (error) {
    logger.error('Unexpected error in GET /api/agents:', error);
    return commonErrors.serverError("Failed to fetch agents");
  }
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
    const { agentService } = getServices();
    const result = await agentService.updateAgent(
      validatedData.agentId,
      validatedData,
      userId
    );

    if (result.isError()) {
      const error = result.error();
      if (error instanceof ValidationError) {
        if (error.message.includes("not found")) {
          return commonErrors.notFound("Agent");
        }
        if (error.message.includes("permission")) {
          return commonErrors.forbidden();
        }
        return commonErrors.badRequest(error.message);
      }
      
      logger.error('Error updating agent:', error);
      return commonErrors.serverError("Failed to update agent");
    }

    const agent = result.unwrap();
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
    
    return commonErrors.serverError("Failed to update agent");
  }
}