import { NextResponse } from "next/server";
import { UserModel } from "@/models/User";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    
    if (!userId || userId.trim() === '') {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    
    const count = await UserModel.getUserDocumentsCount(userId);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching documents count:", error);
    return NextResponse.json({ error: "Failed to fetch documents count" }, { status: 500 });
  }
}