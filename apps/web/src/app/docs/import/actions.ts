"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { importDocumentService } from "@/application/services/documentImport";
import { logger } from "@/infrastructure/logging/logger";
import { prisma, checkAvailableQuota, formatQuotaErrorMessage, incrementRateLimit, RateLimitError } from "@roast/db";

export async function importDocument(url: string, agentIds: string[] = [], isPrivate: boolean = true) {
  try {
    // Get the current user session
    const session = await auth();
    
    if (!session?.user?.id) {
      throw new Error("User must be logged in to import a document");
    }

    // 1. Soft check: Do they have ENOUGH quota for this request?
    if (agentIds.length > 0) {
      const quotaCheck = await checkAvailableQuota(session.user.id, prisma, agentIds.length);

      if (!quotaCheck.hasEnoughQuota) {
        throw new Error(formatQuotaErrorMessage(quotaCheck, agentIds.length));
      }
    }

    // 2. Do expensive work (fetch, validate)
    const result = await importDocumentService(url, session.user.id, agentIds, isPrivate);

    if (!result.success) {
      throw new Error(result.error || "Failed to import document");
    }

    // 3. Hard charge ONLY after success - don't throw if this fails
    if (agentIds.length > 0) {
      try {
        await incrementRateLimit(session.user.id, prisma, agentIds.length);
      } catch (error) {
        // Document was successfully created, this is our billing/reconciliation problem
        logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful document creation', {
          userId: session.user.id,
          documentId: result.documentId,
          requestedCount: agentIds.length,
          error: error instanceof Error ? error.message : String(error)
        });
        // DO NOT throw - user already got their document and evaluations are queued
        // This needs manual reconciliation or we accept the overage
      }
    }

    revalidatePath("/docs");
    redirect(`/docs/${result.documentId}/reader`);
  } catch (error) {
    logger.error('❌ Error importing document:', error);
    throw error;
  }
}
