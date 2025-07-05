import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { authenticateRequestSessionFirst } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
}).strict();

export async function PATCH(request: NextRequest) {
  try {
    const userId = await authenticateRequestSessionFirst(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update user name
    const result = await prisma.user.update({
      where: { id: userId },
      data: { name: validatedData.name },
      select: {
        id: true,
        name: true,
        email: true,
      },
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