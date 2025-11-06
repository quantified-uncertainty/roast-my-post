import { NextResponse } from "next/server";

import { prisma, checkAvailableQuota, formatQuotaErrorMessage, incrementRateLimit } from "@roast/db";
import { logger } from "@/infrastructure/logging/logger";

/**
 * Soft check for quota availability. Returns error response if insufficient quota.
 * Use this BEFORE performing expensive operations.
 */
export async function checkQuotaAvailable({
  userId,
  requestedCount
}: {
  userId: string;
  requestedCount: number;
}): Promise<NextResponse | null> {
  const quotaCheck = await checkAvailableQuota(userId, prisma, requestedCount);

  if (!quotaCheck.hasEnoughQuota) {
    return NextResponse.json(
      { error: formatQuotaErrorMessage(quotaCheck, requestedCount) },
      { status: 429 }
    );
  }

  return null;
}

/**
 * Increment quota counters after successful operation.
 * Use this AFTER your operation succeeds. Does not throw on failure.
 */
export async function chargeQuota({
  userId,
  chargeCount,
  context
}: {
  userId: string;
  chargeCount: number;
  context?: Record<string, any>;
}): Promise<void> {
  try {
    await incrementRateLimit(userId, prisma, chargeCount);
  } catch (error) {
    // Don't throw - operation already succeeded, this is a billing/reconciliation issue
    logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful operation', {
      userId,
      requestedCount: chargeCount,
      context,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
