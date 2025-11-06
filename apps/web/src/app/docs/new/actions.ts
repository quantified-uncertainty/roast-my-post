"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/infrastructure/logging/logger";
import { redirect } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { ValidationError } from '@roast/domain';
import { prisma } from "@roast/db";
import { validateQuota } from "@/infrastructure/rate-limiting/rate-limit-service";
import { chargeQuotaForServerAction } from "@/infrastructure/rate-limiting/server-action-helpers";
import { getServices } from "@/application/services/ServiceFactory";

import { type DocumentInput } from "./schema";

export async function createDocument(data: DocumentInput, agentIds: string[] = []) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a document");
    }

    // 1. Soft check: Verify quota availability
    if (agentIds.length > 0) {
      await validateQuota({ userId: session.user.id, prisma, requestedCount: agentIds.length });
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

    // 3. Charge quota after success
    if (agentIds.length > 0) {
      await chargeQuotaForServerAction({
        userId: session.user.id,
        chargeCount: agentIds.length,
        context: { documentId: document.id, agentIds }
      });
    }

    // DocumentService handles evaluation creation when agentIds are provided

    revalidatePath("/docs");
    redirect(`/docs/${document.id}/reader`);
  } catch (error) {
    logger.error('Error creating document:', error);
    throw error;
  }
}
