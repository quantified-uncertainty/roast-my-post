import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/models/User";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    
    if (!userId || userId.trim() === '') {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    
    // Get requesting user (optional - supports both authenticated and anonymous)
    const requestingUserId = await authenticateRequest(request);
    
    // Only count documents the requesting user can see
    const count = await UserModel.getUserDocumentsCount(userId, requestingUserId);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching documents count:", error);
    return NextResponse.json({ error: "Failed to fetch documents count" }, { status: 500 });
  }
}