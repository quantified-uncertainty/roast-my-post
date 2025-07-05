import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  preferences: z.object({
    agreedToTerms: z.boolean(),
    researchUpdates: z.boolean(),
    quriUpdates: z.boolean(),
  }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const userId = await authenticateRequestSessionFirst(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update user profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user name
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { name: validatedData.name },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Update preferences if provided
      if (validatedData.preferences) {
        await tx.userPreferences.upsert({
          where: { userId },
          update: {
            agreedToTerms: validatedData.preferences.agreedToTerms,
            agreedToTermsAt: validatedData.preferences.agreedToTerms ? new Date() : undefined,
            researchUpdates: validatedData.preferences.researchUpdates,
            quriUpdates: validatedData.preferences.quriUpdates,
          },
          create: {
            userId,
            agreedToTerms: validatedData.preferences.agreedToTerms,
            agreedToTermsAt: validatedData.preferences.agreedToTerms ? new Date() : null,
            researchUpdates: validatedData.preferences.researchUpdates,
            quriUpdates: validatedData.preferences.quriUpdates,
          },
        });
      }

      return updatedUser;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}