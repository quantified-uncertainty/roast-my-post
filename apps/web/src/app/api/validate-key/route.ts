import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/infrastructure/auth/auth-api";
import { prisma } from "@roast/db";

/**
 * API endpoint to validate an API key.
 * Used by the MCP server to verify setup is correct.
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!authResult.success) {
    return NextResponse.json(
      {
        valid: false,
        error: authResult.error.message,
        errorType: authResult.error.type,
      },
      { status: authResult.error.statusCode }
    );
  }

  // Get user info to return
  const user = await prisma.user.findUnique({
    where: { id: authResult.userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({
    valid: true,
    user: user,
    keyId: authResult.keyId,
  });
}
