import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { authenticateRequest } from "@/lib/auth-helpers";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const currentUserId = await authenticateRequest(req);

    const user = await UserModel.getUser(userId, currentUserId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
