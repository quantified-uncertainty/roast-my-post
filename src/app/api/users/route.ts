import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const users = await UserModel.getAllUsers();

    // Get current user for marking isCurrentUser
    const session = await auth();
    const currentUserId = session?.user?.id;

    const usersWithAuth = users.map((user) => ({
      ...user,
      isCurrentUser: user.id === currentUserId,
    }));

    return NextResponse.json(usersWithAuth);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
