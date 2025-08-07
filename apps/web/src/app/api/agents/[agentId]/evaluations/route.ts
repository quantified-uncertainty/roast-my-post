import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";

import { AgentModel } from "@/models/Agent";

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const agentId = params.agentId;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    // If batchId is provided, fetch evaluations for that batch
    let evaluations;
    if (batchId) {
      evaluations = await AgentModel.getAgentEvaluations(agentId, { batchId });
    } else {
      evaluations = await AgentModel.getAgentEvaluations(agentId);
    }
    
    return NextResponse.json({ evaluations });
  } catch (error) {
    logger.error('Error fetching agent evaluations:', error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}