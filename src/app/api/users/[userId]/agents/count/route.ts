import { NextResponse } from "next/server";
import { UserModel } from "@/models/User";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const count = await UserModel.getUserAgentsCount(userId);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching agents count:", error);
    return NextResponse.json({ error: "Failed to fetch agents count" }, { status: 500 });
  }
}