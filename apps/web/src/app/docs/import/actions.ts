"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { importDocumentService } from "@/application/services/documentImport";
import { logger } from "@/infrastructure/logging/logger";
import { prisma, validateQuota } from "@roast/db";
import { chargeQuotaForServerAction } from "@/infrastructure/rate-limiting/server-action-helpers";

export async function importDocument(url: string, agentIds: string[] = [], isPrivate: boolean = true) {
  try {
    // Get the current user session
    const session = await auth();
    
    if (!session?.user?.id) {
      throw new Error("User must be logged in to import a document");
    }

    // 1. Soft check: Verify quota availability
    if (agentIds.length > 0) {
      await validateQuota({ userId: session.user.id, prisma, requestedCount: agentIds.length });
    }

    // 2. Do expensive work (fetch, validate)
    const result = await importDocumentService(url, session.user.id, agentIds, isPrivate);

    if (!result.success) {
      throw new Error(result.error || "Failed to import document");
    }

    // 3. Charge quota after success
    if (agentIds.length > 0) {
      await chargeQuotaForServerAction({
        userId: session.user.id,
        chargeCount: agentIds.length,
        context: { documentId: result.documentId, agentIds }
      });
    }

    revalidatePath("/docs");
    redirect(`/docs/${result.documentId}/reader`);
  } catch (error) {
    logger.error('❌ Error importing document:', error);
    throw error;
  }
}
