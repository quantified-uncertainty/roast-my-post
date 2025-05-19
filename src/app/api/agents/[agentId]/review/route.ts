import { NextResponse } from "next/server";

import { AgentModel } from "@/models/Agent";

export async function GET(request: Request, context: any) {
  const { params } = context;
  try {
    const review = await AgentModel.getAgentReview(params.agentId);
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching agent review:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent review" },
      { status: 500 }
    );
  }
}
