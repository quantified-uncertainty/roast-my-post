import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const updatePreferencesSchema = z.object({
  researchUpdates: z.boolean(),
  quriUpdates: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    const userId = await authenticateRequestSessionFirst(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        researchUpdates: validatedData.researchUpdates,
        quriUpdates: validatedData.quriUpdates,
      },
      create: {
        userId,
        researchUpdates: validatedData.researchUpdates,
        quriUpdates: validatedData.quriUpdates,
        agreedToTerms: true, // They must have agreed to create an account
        agreedToTermsAt: new Date(),
      },
    });

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}