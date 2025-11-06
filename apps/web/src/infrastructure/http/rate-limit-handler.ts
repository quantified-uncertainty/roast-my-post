import { NextResponse } from "next/server";

import { prisma, checkAvailableQuota, formatQuotaErrorMessage, incrementRateLimit } from "@roast/db";
import { logger } from "@/infrastructure/logging/logger";

/**
 * Soft check for quota availability. Returns error response if insufficient quota.
 * Use this BEFORE performing expensive operations.
 */
export async function checkQuotaAvailable(userId: string, count: number): Promise<NextResponse | null> {
  const quotaCheck = await checkAvailableQuota(userId, prisma, count);

  if (!quotaCheck.hasEnoughQuota) {
    return NextResponse.json(
      { error: formatQuotaErrorMessage(quotaCheck, count) },
      { status: 429 }
    );
  }

  return null;
}

/**
 * Increment quota counters after successful operation.
 * Use this AFTER your operation succeeds. Does not throw on failure.
 */
export async function chargeQuota(userId: string, count: number, context?: Record<string, any>): Promise<void> {
  try {
    await incrementRateLimit(userId, prisma, count);
  } catch (error) {
    // Don't throw - operation already succeeded, this is a billing/reconciliation issue
    logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful operation', {
      userId,
      requestedCount: count,
      context,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
