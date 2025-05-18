import { NextResponse } from "next/server";

import { AgentModel } from "@/models/Agent";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const review = await AgentModel.getAgentReview(params.id);
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching agent review:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent review" },
      { status: 500 }
    );
  }
}
