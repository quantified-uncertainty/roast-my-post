import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { AgentModel } from "@/models/Agent";

export async function GET(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const review = await AgentModel.getAgentReview(params.agentId);
    return NextResponse.json({ review });
  } catch (error) {
    logger.error('Error fetching agent review:', error);
    return NextResponse.json(
      { error: "Failed to fetch agent review" },
      { status: 500 }
    );
  }
}
