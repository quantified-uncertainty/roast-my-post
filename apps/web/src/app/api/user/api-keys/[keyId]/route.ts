import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";
import { prisma } from "@roast/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const userId = await authenticateRequestSessionFirst(request);
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await params;

  try {
    // First check if the API key belongs to the user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId: userId,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: {
        id: keyId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}