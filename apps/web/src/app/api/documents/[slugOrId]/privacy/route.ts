import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { prisma, Prisma } from "@roast/db";
import { logger } from "@/infrastructure/logging/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  try {
    const { slugOrId: docId } = await params;
    const userId = await authenticateRequest(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse body first to validate input
    let body;
    try {
      body = await req.json();
    } catch (_error) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    
    const { isPrivate } = body;

    if (typeof isPrivate !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid privacy value" },
        { status: 400 }
      );
    }

    // Use updateMany to atomically check ownership and update in one query
    // This prevents information leakage about document existence vs ownership
    const result = await prisma.document.updateMany({
      where: {
        id: docId,
        submittedById: userId
      },
      data: { isPrivate }
    });

    // If no documents were updated, return 404 (regardless of whether document doesn't exist or user doesn't own it)
    if (result.count === 0) {
      // Don't log docId on 404 to prevent enumeration via logs
      logger.debug('Privacy update failed: no matching document for user');
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Fetch the updated document to return
    const updated = await prisma.document.findUnique({
      where: { id: docId },
      select: { id: true, isPrivate: true }
    });

    if (!updated) {
      // Race condition: document was deleted between update and fetch
      logger.debug('Privacy update race: document deleted after update');
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    logger.info('Document privacy updated', {
      docId,
      isPrivate,
      userId
    });

    return NextResponse.json(updated);
  } catch (error) {
    // Handle Prisma P2025 (record not found during update) as 404
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      logger.debug('Privacy update failed: P2025 record not found');
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    logger.error('Error updating document privacy:', error);
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}