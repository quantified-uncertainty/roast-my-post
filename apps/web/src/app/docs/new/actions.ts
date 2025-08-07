"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DocumentService } from "@/lib/services/DocumentService";
import { EvaluationService } from "@/lib/services/EvaluationService";
import { ValidationError } from "@/lib/core/errors";

import { type DocumentInput } from "./schema";

// Initialize services
const documentService = new DocumentService();
const evaluationService = new EvaluationService();

export async function createDocument(data: DocumentInput, agentIds: string[] = []) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a document");
    }

    // Create the document using the new DocumentService
    const result = await documentService.createDocument(
      session.user.id,
      {
        title: data.title,
        content: data.content,
        authors: data.authors || "Unknown",
        url: data.urls,
        platforms: data.platforms ? [data.platforms] : [],
        importUrl: data.importUrl
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

    // Queue evaluations if agents are selected
    if (agentIds.length > 0) {
      const evaluationResult = await evaluationService.createEvaluationsForDocument({
        documentId: document.id,
        agentIds,
        userId: session.user.id
      });

      if (evaluationResult.isError()) {
        logger.error('Failed to create evaluations:', evaluationResult.error());
        // Don't fail the document creation, just log the error
      } else {
        logger.info('Evaluations created successfully', {
          documentId: document.id,
          evaluationsCreated: evaluationResult.unwrap().length
        });
      }
    }

    revalidatePath("/docs");
    redirect(`/docs/${document.id}/reader`);
  } catch (error) {
    logger.error('Error creating document:', error);
    throw error;
  }
}
