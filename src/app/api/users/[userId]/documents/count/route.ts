import { NextRequest, NextResponse } from "next/server";

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

    const count = await UserModel.getUserDocumentsCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching document count:", error);
    return NextResponse.json(
      { error: "Failed to fetch document count" },
      { status: 500 }
    );
  }
}
