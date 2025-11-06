import { NextResponse } from "next/server";

import { assertSystemNotPaused, SystemPausedError } from "@roast/db";
import { logger } from "@/infrastructure/logging/logger";
import { checkQuotaAvailable } from "../rate-limit-handler";

/**
 * Validates that an LLM operation can proceed.
 * Checks BOTH system pause status AND quota availability.
 *
 * Returns error response if operation cannot proceed, null if OK.
 *
 * Use this in API routes BEFORE performing expensive operations like:
 * - Creating evaluations
 * - Importing documents
 * - Making LLM API calls
 *
 * Checks are performed in priority order:
 * 1. System pause (highest priority - affects all users)
 * 2. Quota availability (user-specific)
 */
export async function validateLlmAccess({
  userId,
  requestedCount
}: {
  userId: string;
  requestedCount: number;
}): Promise<NextResponse | null> {
  // 1. Check if system is paused (highest priority)
  try {
    await assertSystemNotPaused();
  } catch (error) {
    if (error instanceof SystemPausedError) {
      logger.info('LLM operation blocked: system paused', {
        event: 'llm_operation_blocked_pause',
        userId,
        requestedCount,
        reason: error.reason,
        pausedAt: error.pausedAt.toISOString()
      });
      return NextResponse.json(
        { error: error.message, reason: error.reason },
        { status: 503 }
      );
    }
    throw error;
  }

  // 2. Check quota availability
  const quotaError = await checkQuotaAvailable({ userId, requestedCount });
  if (quotaError) return quotaError;

  return null;
}
