"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

/**
 * Creates a new job for an evaluation, allowing it to be re-run
 * with the latest agent version
 */
export async function rerunEvaluation(
  agentId: string,
  documentId: string
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to rerun an evaluation",
      };
    }

    await DocumentModel.rerunEvaluation(
      agentId,
      documentId,
      session.user.id
    );

    // Revalidate multiple pages that might be affected
    revalidatePath(`/docs/${documentId}/evaluations`);
    revalidatePath(`/docs/${documentId}/evals/${agentId}`);
    revalidatePath(`/docs/${documentId}/evals/${agentId}/logs`);

    return { success: true };
  } catch (error) {
    logger.error('Error creating job for evaluation:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create job for evaluation",
    };
  }
}

/**
 * Creates a new evaluation and job for an agent, or reruns existing evaluation
 */
export async function createOrRerunEvaluation(
  agentId: string,
  documentId: string
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to create an evaluation",
      };
    }

    await DocumentModel.createOrRerunEvaluation(
      agentId,
      documentId,
      session.user.id
    );

    // Revalidate the evaluations page
    revalidatePath(`/docs/${documentId}/evaluations`);

    return { success: true };
  } catch (error) {
    logger.error('Error creating or rerunning evaluation:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create or rerun evaluation",
    };
  }
}
