import { NextRequest, NextResponse } from "next/server";

import { authenticateApiKeySimple } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";

// GET /api/auth/validate - Validate an API key
export async function GET(request: NextRequest) {
  try {
    // Authenticate using the API key from the Authorization header
    const authResult = await authenticateApiKeySimple(request);

    if (!authResult) {
      console.log("❌ [validate-key] Authentication failed - no auth result");
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    // Validate auth result structure
    if (!authResult.userId || typeof authResult.userId !== "string") {
      console.log("❌ [validate-key] Invalid auth result - userId:", authResult.userId);
      return NextResponse.json(
        { error: "Invalid authentication result" },
        { status: 500 }
      );
    }

    console.log(
      "✅ [validate-key] Authentication successful, looking up user:",
      authResult.userId
    );

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(
      "🔍 [validate-key] User lookup result:",
      user ? { id: user.id, email: user.email, name: user.name } : null
    );

    if (!user) {
      console.log("❌ [validate-key] User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ [validate-key] Validation successful, returning user info");

    // Return success with user info
    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("💥 [validate-key] Error validating API key:", error);
    console.error(
      "💥 [validate-key] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
