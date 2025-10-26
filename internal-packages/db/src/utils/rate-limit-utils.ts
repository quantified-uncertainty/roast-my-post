import { Plan } from "../types";
import { nextReset } from "./date-utils";
import { PrismaClient } from "../../generated";

/**
 * Error thrown when a resource is not found.
 */
class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when rate limit is exceeded.
 */
class RateLimitError extends Error {
  constructor(
    message: string,
    public details?: { retryAfter?: Date }
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Represents the subset of user data relevant for rate limiting.
 */
interface UserRateLimitData {
  plan: Plan;
  evalsThisHour: number;
  evalsThisMonth: number;
  hourResetAt: Date | null;
  monthResetAt: Date | null;
}

/**
 * Rate limit configuration for each plan tier.
 */
interface PlanLimits {
  hourly: number;
  monthly: number;
}

/**
 * Rate limiting configuration by plan.
 */
const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { hourly: 1, monthly: 1 },
  PRO: { hourly: 100, monthly: 1000 },
} as const;

/**
 * Checks rate limits and increments counters if allowed.
 * Resets counters automatically when their period expires.
 *
 * @param userId - The user ID to check rate limits for
 * @param prisma - Prisma client instance
 * @param now - Current time (injectable for testing)
 * @throws {NotFoundError} If user doesn't exist
 * @throws {RateLimitError} If rate limit is exceeded
 */
export async function checkAndIncrementRateLimit(
  userId: string,
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<void> {
  return prisma.$transaction(async (tx: any) => {
    const user = await fetchUserRateLimitData(tx, userId);
    const updates = calculateResetUpdates(user, now);
    const evalCounts = getCurrentEvalCounts(user, updates);
    const limits = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.FREE;

    if (isLimitExceeded(evalCounts, limits)) {
      await updateResetsIfNeeded(tx, userId, updates);
      throw new RateLimitError(`Rate limit exceeded for ${user.plan} plan`, {
        retryAfter: getNextRetryTime(user, now),
      });
    }

    await incrementAndUpdate(tx, userId, updates, evalCounts);
  });
}

/**
 * Fetches user rate limit data from the database.
 */
async function fetchUserRateLimitData(
  tx: any,
  userId: string
): Promise<UserRateLimitData> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      evalsThisHour: true,
      evalsThisMonth: true,
      hourResetAt: true,
      monthResetAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return user;
}

/**
 * Calculates which counters need to be reset based on current time.
 */
function calculateResetUpdates(
  user: UserRateLimitData,
  now: Date
): Partial<UserRateLimitData> {
  const updates: Partial<UserRateLimitData> = {};

  if (!user.hourResetAt || now >= user.hourResetAt) {
    updates.hourResetAt = nextReset(now, "hour");
    updates.evalsThisHour = 0;
  }

  if (!user.monthResetAt || now >= user.monthResetAt) {
    updates.monthResetAt = nextReset(now, "month");
    updates.evalsThisMonth = 0;
  }

  return updates;
}

/**
 * Gets the current evaluation counts, accounting for any resets.
 */
function getCurrentEvalCounts(
  user: UserRateLimitData,
  updates: Partial<UserRateLimitData>
): { hourly: number; monthly: number } {
  return {
    hourly: updates.evalsThisHour ?? user.evalsThisHour,
    monthly: updates.evalsThisMonth ?? user.evalsThisMonth,
  };
}

/**
 * Checks if either hourly or monthly limit is exceeded.
 */
function isLimitExceeded(
  counts: { hourly: number; monthly: number },
  limits: PlanLimits
): boolean {
  return counts.hourly >= limits.hourly || counts.monthly >= limits.monthly;
}

/**
 * Updates reset timestamps in the database if needed.
 */
async function updateResetsIfNeeded(
  tx: any,
  userId: string,
  updates: Partial<UserRateLimitData>
): Promise<void> {
  if (Object.keys(updates).length > 0) {
    await tx.user.update({ where: { id: userId }, data: updates });
  }
}

/**
 * Increments evaluation counters and updates the database.
 */
async function incrementAndUpdate(
  tx: any,
  userId: string,
  updates: Partial<UserRateLimitData>,
  counts: { hourly: number; monthly: number }
): Promise<void> {
  updates.evalsThisHour = counts.hourly + 1;
  updates.evalsThisMonth = counts.monthly + 1;

  await tx.user.update({ where: { id: userId }, data: updates });
}

/**
 * Determines when the user can retry after hitting rate limit.
 */
function getNextRetryTime(user: UserRateLimitData, now: Date): Date {
  return user.hourResetAt && user.hourResetAt > now
    ? user.hourResetAt
    : nextReset(now, "hour");
}
