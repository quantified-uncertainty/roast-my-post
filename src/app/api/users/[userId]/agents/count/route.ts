import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { UserModel } from "@/models/User";

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const params = await context.params;
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const count = await UserModel.getUserAgentsCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    logger.error('Error fetching agent count:', error);
    return NextResponse.json(
      { error: "Failed to fetch agent count" },
      { status: 500 }
    );
  }
}
