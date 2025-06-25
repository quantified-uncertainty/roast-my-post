import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { authenticateRequest } from "@/lib/auth-helpers";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const users = await UserModel.getAllUsers();

    // Get current user for marking isCurrentUser
    const currentUserId = await authenticateRequest(req);

    const usersWithAuth = users.map((user) => ({
      ...user,
      isCurrentUser: user.id === currentUserId,
    }));

    return NextResponse.json(usersWithAuth);
  } catch (error) {
    logger.error('Error fetching users:', error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
