import { NextRequest, NextResponse } from "next/server";

import { AgentModel } from "@/models/Agent";

export async function GET(request: NextRequest, context: any) {
  const { params } = context;
  try {
    const agentId = params.agentId;
    const evaluations = await AgentModel.getAgentEvaluations(agentId);
    
    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("Error fetching agent evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}