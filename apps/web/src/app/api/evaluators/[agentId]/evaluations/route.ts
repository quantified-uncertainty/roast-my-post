import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { getServices } from "@/application/services/ServiceFactory";

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const agentId = params.agentId;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    // Get requesting user (optional - supports both authenticated and anonymous)
    const requestingUserId = await authenticateRequest(request);
    
    const { agentService } = getServices();
    const options = { 
      ...(batchId && { batchId }),
      requestingUserId // Pass user ID for privacy filtering (undefined = public only)
    };
    const result = await agentService.getAgentEvaluations(agentId, options);

    if (result.isError()) {
      logger.error('Error fetching agent evaluations:', result.error());
      return NextResponse.json(
        { error: "Failed to fetch evaluations" },
        { status: 500 }
      );
    }

    const evaluations = result.unwrap();
    return NextResponse.json({ evaluations });
  } catch (error) {
    logger.error('Error fetching agent evaluations:', error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}