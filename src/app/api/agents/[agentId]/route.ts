import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AgentModel } from "@/models/Agent";

export async function GET(request: NextRequest, context: any) {
  const params = await context.params;
  try {
    const agentId = params.agentId;
    const session = await auth();
    const agent = await AgentModel.getAgentWithOwner(
      agentId,
      session?.user?.id
    );

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent data" },
      { status: 500 }
    );
  }
}
