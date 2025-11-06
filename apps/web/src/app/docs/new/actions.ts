"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/infrastructure/logging/logger";
import { redirect } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { ValidationError } from '@roast/domain';
import { prisma, checkAvailableQuota, formatQuotaErrorMessage, incrementRateLimit, RateLimitError } from "@roast/db";
import { getServices } from "@/application/services/ServiceFactory";

import { type DocumentInput } from "./schema";

export async function createDocument(data: DocumentInput, agentIds: string[] = []) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a document");
    }

    // 1. Soft check: Do they have ENOUGH quota for this request?
    if (agentIds.length > 0) {
      const quotaCheck = await checkAvailableQuota(session.user.id, prisma, agentIds.length);

      if (!quotaCheck.hasEnoughQuota) {
        throw new Error(formatQuotaErrorMessage(quotaCheck, agentIds.length));
      }
    }

    // 2. Create the document using the new DocumentService
    const { documentService } = getServices();
    const result = await documentService.createDocument(
      session.user.id,
      {
        title: data.title,
        content: data.content,
        authors: data.authors || "Unknown",
        url: data.urls,
        platforms: data.platforms ? [data.platforms] : [],
        importUrl: data.importUrl,
        isPrivate: data.isPrivate ?? true,
        submitterNotes: data.submitterNotes
      },
      agentIds
    );

    if (result.isError()) {
      const error = result.error();
      if (error instanceof ValidationError) {
        // Join validation errors into a single message
        throw new Error(error.details?.join('. ') || error.message);
      }
      throw new Error(error?.message || "Failed to create document");
    }

    const document = result.unwrap();

    // 3. Hard charge ONLY after success - don't throw if this fails
    if (agentIds.length > 0) {
      try {
        await incrementRateLimit(session.user.id, prisma, agentIds.length);
      } catch (error) {
        // Document was successfully created, this is our billing/reconciliation problem
        logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful document creation', {
          userId: session.user.id,
          documentId: document.id,
          requestedCount: agentIds.length,
          error: error instanceof Error ? error.message : String(error)
        });
        // DO NOT throw - user already got their document and evaluations are queued
        // This needs manual reconciliation or we accept the overage
      }
    }

    // DocumentService handles evaluation creation when agentIds are provided

    revalidatePath("/docs");
    redirect(`/docs/${document.id}/reader`);
  } catch (error) {
    logger.error('Error creating document:', error);
    throw error;
  }
}
