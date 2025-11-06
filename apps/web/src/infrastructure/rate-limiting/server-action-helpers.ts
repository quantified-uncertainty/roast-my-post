import { incrementRateLimit, prisma } from '@roast/db';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Charge quota after successful operation in server actions.
 * Never throws - logs billing issues instead.
 *
 * Use this after your operation succeeds. If the charge fails,
 * it will be logged as a billing issue but won't fail the user's request.
 */
export async function chargeQuotaForServerAction({
  userId,
  chargeCount,
  context
}: {
  userId: string;
  chargeCount: number;
  context: { documentId?: string; agentId?: string; agentIds?: string[] };
}): Promise<void> {
  try {
    await incrementRateLimit(userId, prisma, chargeCount);
  } catch (error) {
    logger.error('⚠️ BILLING ISSUE: Rate limit increment failed after successful operation', {
      userId,
      requestedCount: chargeCount,
      context,
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't throw - operation already succeeded, this is our reconciliation problem
  }
}
