import { Plan } from "../types";
import { prisma as defaultPrisma } from "../cli-client";
import { NotFoundError, RateLimitError } from "./errors";

// Re-export the error classes for backward compatibility
export { NotFoundError, RateLimitError };

function nextReset(now: Date, interval: 'hour' | 'month'): Date {
  const next = new Date(now);
  switch (interval) {
    case 'hour':
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case 'month': {
      next.setDate(1);
      const newMonth = next.getMonth() + 1;
      if (newMonth > 11) {
        next.setFullYear(next.getFullYear() + 1);
        next.setMonth(0);
      } else {
        next.setMonth(newMonth);
      }
      next.setHours(0, 0, 0, 0);
      break;
    }
  }
  return next;
}

const PLAN_LIMITS = {
  REGULAR: { hourly: 20, monthly: 300 },
  PRO: { hourly: 100, monthly: 1000 },
};

/**
 * Type guard to check if a string is a valid Plan.
 */
function isPlan(plan: string): plan is Plan {
  return plan in PLAN_LIMITS;
}

/**
 * Calculate the earliest retry time based on which limits were exceeded.
 */
function calculateRetryAfter(
  hourExceeded: boolean,
  monthExceeded: boolean,
  user: { hourResetAt: Date | null; monthResetAt: Date | null },
  now: Date
): Date {
  const resetTimes: Date[] = [];

  if (hourExceeded) {
    const hourResetTime = user.hourResetAt && user.hourResetAt > now
      ? user.hourResetAt
      : nextReset(now, "hour");
    resetTimes.push(hourResetTime);
  }

  if (monthExceeded) {
    const monthResetTime = user.monthResetAt && user.monthResetAt > now
      ? user.monthResetAt
      : nextReset(now, "month");
    resetTimes.push(monthResetTime);
  }

  // Return the LATEST reset time (user must wait for ALL limits to clear)
  return new Date(Math.max(...resetTimes.map(d => d.getTime())));
}

export interface QuotaCheck {
  hasEnoughQuota: boolean;
  hourlyRemaining: number;
  monthlyRemaining: number;
  hourlyLimit: number;
  monthlyLimit: number;
}

/**
 * Generate a standardized error message for insufficient quota.
 * Use this to ensure consistent error messages across the application.
 */
export function formatQuotaErrorMessage(quotaCheck: QuotaCheck, requestedCount: number): string {
  const limitingFactor = quotaCheck.hourlyRemaining < requestedCount
    ? `hourly quota (${quotaCheck.hourlyRemaining} of ${quotaCheck.hourlyLimit} remaining)`
    : `monthly quota (${quotaCheck.monthlyRemaining} of ${quotaCheck.monthlyLimit} remaining)`;

  const remaining = Math.min(quotaCheck.hourlyRemaining, quotaCheck.monthlyRemaining);

  return `Insufficient quota. You requested ${requestedCount} evaluation${requestedCount > 1 ? 's' : ''} ` +
         `but only have ${remaining} remaining in your ${limitingFactor}.`;
}

/**
 * Validates user has sufficient quota, throws formatted error if not.
 * Use this in server actions before expensive operations.
 *
 * This is a convenience wrapper around checkAvailableQuota + formatQuotaErrorMessage.
 *
 * @throws {Error} With formatted quota error message if insufficient quota
 * @throws {NotFoundError} If user not found
 */
export async function validateQuota({
  userId,
  prisma,
  requestedCount
}: {
  userId: string;
  prisma: typeof defaultPrisma;
  requestedCount: number;
}): Promise<void> {
  const quotaCheck = await checkAvailableQuota(userId, prisma, requestedCount);

  if (!quotaCheck.hasEnoughQuota) {
    throw new Error(formatQuotaErrorMessage(quotaCheck, requestedCount));
  }
}

/**
 * Check if a user has enough available quota for a requested number of evaluations.
 * This is a lightweight check that does NOT increment counters.
 * Use this before expensive operations to provide early feedback to users.
 *
 * For server actions, consider using validateQuota() instead which throws on insufficient quota.
 */
export async function checkAvailableQuota(
  userId: string,
  prisma: typeof defaultPrisma,
  requestedCount: number
): Promise<QuotaCheck> {
  console.log(`[RateLimit] Checking available quota for userId=${userId}, requestedCount=${requestedCount}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      evalsThisHour: true,
      evalsThisMonth: true,
      hourResetAt: true,
      monthResetAt: true
    }
  });

  if (!user) {
    console.error(`[RateLimit] User not found: userId=${userId}`);
    throw new NotFoundError("User", userId);
  }

  const userPlan: string = user.plan;
  const limits = isPlan(userPlan) ? PLAN_LIMITS[userPlan] : PLAN_LIMITS.REGULAR;

  if (!isPlan(userPlan)) {
    console.warn(`[RateLimit] Invalid plan "${userPlan}" for user ${userId}, falling back to REGULAR plan`);
  }

  const now = new Date();
  const needsHourlyReset = !user.hourResetAt || now >= user.hourResetAt;
  const needsMonthlyReset = !user.monthResetAt || now >= user.monthResetAt;

  const currentHourly = needsHourlyReset ? 0 : (user.evalsThisHour ?? 0);
  const currentMonthly = needsMonthlyReset ? 0 : (user.evalsThisMonth ?? 0);

  const hourlyRemaining = Math.max(0, limits.hourly - currentHourly);
  const monthlyRemaining = Math.max(0, limits.monthly - currentMonthly);

  const hasEnoughQuota = (currentHourly + requestedCount <= limits.hourly) &&
                         (currentMonthly + requestedCount <= limits.monthly);

  console.log(`[RateLimit] Quota check result: hasEnoughQuota=${hasEnoughQuota}, hourlyRemaining=${hourlyRemaining}/${limits.hourly}, monthlyRemaining=${monthlyRemaining}/${limits.monthly}`);

  return {
    hasEnoughQuota,
    hourlyRemaining,
    monthlyRemaining,
    hourlyLimit: limits.hourly,
    monthlyLimit: limits.monthly
  };
}

export async function incrementRateLimit(
  userId: string,
  prisma: typeof defaultPrisma,
  count: number = 1,
  now: Date = new Date()
): Promise<void> {
  console.log(`[RateLimit] Starting check for userId=${userId}, count=${count}, now=${now.toISOString()}`);
  
  await prisma.$transaction(async (tx) => {
    console.log(`[RateLimit] Fetching user data for userId=${userId}`);
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
      console.error(`[RateLimit] User not found: userId=${userId}`);
      throw new NotFoundError("User", userId);
    }

    console.log(`[RateLimit] User found: plan=${user.plan}, evalsThisHour=${user.evalsThisHour}, evalsThisMonth=${user.evalsThisMonth}`);

    const userPlan: string = user.plan;
    const limits = isPlan(userPlan) ? PLAN_LIMITS[userPlan] : PLAN_LIMITS.REGULAR;
    
    if (!isPlan(userPlan)) {
      console.warn(`[RateLimit] Invalid plan "${userPlan}" for user ${userId}, falling back to REGULAR plan`);
    } else {
      console.log(`[RateLimit] Valid plan detected: ${userPlan}, limits: hourly=${limits.hourly}, monthly=${limits.monthly}`);
    }

    const needsHourlyReset = !user.hourResetAt || now >= user.hourResetAt;
    const needsMonthlyReset = !user.monthResetAt || now >= user.monthResetAt;
    
    console.log(`[RateLimit] Hourly check: resetAt=${user.hourResetAt?.toISOString()}, needsReset=${needsHourlyReset}`);
    console.log(`[RateLimit] Monthly check: resetAt=${user.monthResetAt?.toISOString()}, needsReset=${needsMonthlyReset}`);

    const currentHourly = needsHourlyReset ? 0 : (user.evalsThisHour ?? 0);
    const currentMonthly = needsMonthlyReset ? 0 : (user.evalsThisMonth ?? 0);
    
    const hourExceeded = currentHourly + count > limits.hourly;
    const monthExceeded = currentMonthly + count > limits.monthly;
    
    console.log(`[RateLimit] Limit check: hourly ${currentHourly}+${count}=${currentHourly + count} vs ${limits.hourly} (exceeded=${hourExceeded}), monthly ${currentMonthly}+${count}=${currentMonthly + count} vs ${limits.monthly} (exceeded=${monthExceeded})`);

    if (hourExceeded || monthExceeded) {
      console.warn(`[RateLimit] Rate limit exceeded for userId=${userId}, plan=${user.plan}`);

      const retryAfter = calculateRetryAfter(hourExceeded, monthExceeded, user, now);
      console.log(`[RateLimit] Retry after: ${retryAfter.toISOString()}`);

      throw new RateLimitError(`Rate limit exceeded for ${user.plan} plan`, { retryAfter });
    }

    interface RateLimitUpdate {
      evalsThisHour: number | { increment: number };
      evalsThisMonth: number | { increment: number };
      hourResetAt?: Date;
      monthResetAt?: Date;
    }

    const successUpdates: RateLimitUpdate = {
      evalsThisHour: needsHourlyReset ? count : { increment: count },
      evalsThisMonth: needsMonthlyReset ? count : { increment: count },
    };
    if (needsHourlyReset) {
      successUpdates.hourResetAt = nextReset(now, 'hour');
    }
    if (needsMonthlyReset) {
      successUpdates.monthResetAt = nextReset(now, 'month');
    }

    console.log(`[RateLimit] Updating counters:`, successUpdates);
    await tx.user.update({ where: { id: userId }, data: successUpdates });
    console.log(`[RateLimit] Rate limit check passed for userId=${userId}`);
  }, {
    isolationLevel: 'Serializable',
  });
}
