import { prisma } from '@roast/db';
import { config } from '@roast/domain';
import { logger } from '@/infrastructure/logging/logger';

/**
 * Get authenticated user ID with optional dev bypass
 *
 * This helper implements the dev bypass pattern used across claim evaluation endpoints.
 * When BYPASS_TOOL_AUTH=true in development, it finds the first user in the database
 * instead of requiring actual authentication.
 *
 * @param authenticatedUserId - The user ID from authenticateRequest, or null if not authenticated
 * @param operation - Description of the operation (for logging)
 * @returns User ID or null if not authenticated
 */
export async function getUserIdWithDevBypass(
  authenticatedUserId: string | undefined,
  operation: string
): Promise<string | null> {
  // Development bypass when BYPASS_TOOL_AUTH is set
  if (!authenticatedUserId && process.env.BYPASS_TOOL_AUTH === 'true' && config.env.isDevelopment) {
    logger.info(`[DEV] Bypassing authentication for ${operation}`);
    const devUser = await prisma.user.findFirst({ select: { id: true } });
    return devUser?.id || 'dev-bypass-user';
  }

  return authenticatedUserId ?? null;
}
