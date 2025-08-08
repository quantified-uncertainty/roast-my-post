import { NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";

import { getServices } from "@/application/services/ServiceFactory";

export async function GET(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  try {
    const { agentService } = getServices();
    const result = await agentService.getAgentReview(params.agentId);

    if (result.isError()) {
      logger.error('Error fetching agent review:', result.error());
      return NextResponse.json(
        { error: "Failed to fetch agent review" },
        { status: 500 }
      );
    }

    const review = result.unwrap();
    return NextResponse.json({ review });
  } catch (error) {
    logger.error('Error fetching agent review:', error);
    return NextResponse.json(
      { error: "Failed to fetch agent review" },
      { status: 500 }
    );
  }
}
