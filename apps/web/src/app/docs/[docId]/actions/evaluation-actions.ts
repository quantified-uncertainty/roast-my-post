"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/infrastructure/logging/logger";

import { auth } from "@/infrastructure/auth/auth";
import { DocumentModel } from "@/models/Document";
import { prisma } from "@/infrastructure/database/prisma";
import { checkAvailableQuota, formatQuotaErrorMessage, incrementRateLimit, RateLimitError } from "@roast/db";

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

    // 1. Soft check: Do they have enough quota?
    const quotaCheck = await checkAvailableQuota(session.user.id, prisma, 1);

    if (!quotaCheck.hasEnoughQuota) {
      return {
        success: false,
        error: formatQuotaErrorMessage(quotaCheck, 1)
      };
    }

    // 2. Do the operation
    await DocumentModel.rerunEvaluation(
      agentId,
      documentId,
      session.user.id
    );

    // 3. Hard charge ONLY after success
    try {
      await incrementRateLimit(session.user.id, prisma, 1);
    } catch (error) {
      logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful evaluation rerun', {
        userId: session.user.id,
        documentId,
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't fail the request - operation already succeeded
    }

    // Revalidate pages that might be affected
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

    // 1. Soft check: Do they have enough quota?
    const quotaCheck = await checkAvailableQuota(session.user.id, prisma, 1);

    if (!quotaCheck.hasEnoughQuota) {
      return {
        success: false,
        error: formatQuotaErrorMessage(quotaCheck, 1)
      };
    }

    // 2. Do the operation
    await DocumentModel.createOrRerunEvaluation(
      agentId,
      documentId,
      session.user.id
    );

    // 3. Hard charge ONLY after success
    try {
      await incrementRateLimit(session.user.id, prisma, 1);
    } catch (error) {
      logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful evaluation creation', {
        userId: session.user.id,
        documentId,
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't fail the request - operation already succeeded
    }

    // Revalidate the document page
    revalidatePath(`/docs/${documentId}`);

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

/**
 * Deletes an evaluation and all its related data
 */
export async function deleteEvaluation(
  agentId: string,
  documentId: string
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to delete an evaluation",
      };
    }

    // Check if the user owns the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        submittedById: session.user.id,
      },
    });

    if (!document) {
      return {
        success: false,
        error: "You can only delete evaluations for your own documents",
      };
    }

    // Find the evaluation
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        documentId,
        agentId,
      },
    });

    if (!evaluation) {
      return {
        success: false,
        error: "Evaluation not found",
      };
    }

    // Delete the evaluation - cascade delete will handle all related data
    // (evaluation versions, comments, highlights, jobs, tasks) due to onDelete: Cascade
    await prisma.evaluation.delete({
      where: {
        id: evaluation.id,
      },
    });

    logger.info(`Deleted evaluation ${evaluation.id} for document ${documentId} and agent ${agentId}`);

    // Revalidate relevant pages
    revalidatePath(`/docs/${documentId}`);
    revalidatePath(`/docs/${documentId}/evals/${agentId}`);
    revalidatePath(`/evaluators/${agentId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting evaluation:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete evaluation",
    };
  }
}
