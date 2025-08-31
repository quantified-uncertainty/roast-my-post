import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { prisma } from "@roast/db";
import { logger } from "@/infrastructure/logging/logger";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slugOrId: string }> }
) {
  try {
    const { slugOrId: docId } = await context.params;
    const userId = await authenticateRequest(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the user owns the document
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true }
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.submittedById !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to update this document" },
        { status: 403 }
      );
    }

    // Update privacy setting
    const body = await req.json();
    const { isPrivate } = body;

    if (typeof isPrivate !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid privacy value" },
        { status: 400 }
      );
    }

    const updated = await prisma.document.update({
      where: { id: docId },
      data: { isPrivate },
      select: { id: true, isPrivate: true }
    });

    logger.info('Document privacy updated', {
      docId,
      isPrivate,
      userId
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating document privacy:', error);
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}