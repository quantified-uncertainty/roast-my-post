import { assertSystemNotPaused, SystemPausedError } from "@roast/db";
import { prisma } from "@/infrastructure/database/prisma";
import { validateQuota } from "@/infrastructure/rate-limiting/rate-limit-service";

/**
 * Result type for server action guards
 */
export type ServerActionGuardResult = { success: false; error: string } | null;

/**
 * Validates that a server action can proceed with LLM operations.
 * Checks BOTH system pause status AND quota availability.
 *
 * Returns error object if operation cannot proceed, null if OK.
 *
 * Use this in server actions BEFORE performing expensive operations like:
 * - Creating evaluations
 * - Importing documents
 * - Re-running evaluations
 *
 * Checks are performed in priority order:
 * 1. System pause (highest priority - affects all users)
 * 2. Quota availability (user-specific)
 *
 * @example
 * const accessError = await validateServerActionAccess({ userId, requestedCount: 1 });
 * if (accessError) return accessError;
 */
export async function validateServerActionAccess({
  userId,
  requestedCount
}: {
  userId: string;
  requestedCount: number;
}): Promise<ServerActionGuardResult> {
  // 1. Check if system is paused
  try {
    await assertSystemNotPaused();
  } catch (error) {
    if (error instanceof SystemPausedError) {
      return {
        success: false,
        error: error.message
      };
    }
    throw error;
  }

  // 2. Check quota availability
  try {
    await validateQuota({ userId, prisma, requestedCount });
    return null;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Insufficient quota"
    };
  }
}
