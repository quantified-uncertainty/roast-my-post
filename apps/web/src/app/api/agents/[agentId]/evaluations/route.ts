import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";

import { getServices } from "@/application/services/ServiceFactory";

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const agentId = params.agentId;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    const { agentService } = getServices();
    const options = batchId ? { batchId } : undefined;
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