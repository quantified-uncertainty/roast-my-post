import { Plan } from "../types";
import { prisma as defaultPrisma } from "../cli-client";

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

/**
 * Error thrown when a resource is not found.
 */
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when rate limit is exceeded.
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public details?: { retryAfter?: Date }
  ) {
    super(message);
    this.name = "RateLimitError";
  }
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

  // Return the earliest reset time
  return resetTimes.sort((a, b) => a.getTime() - b.getTime())[0];
}

export async function checkAndIncrementRateLimit(
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
      
      const resetUpdates: any = {};
      if (needsHourlyReset) {
        resetUpdates.hourResetAt = nextReset(now, 'hour');
        resetUpdates.evalsThisHour = 0;
      }
      if (needsMonthlyReset) {
        resetUpdates.monthResetAt = nextReset(now, 'month');
        resetUpdates.evalsThisMonth = 0;
      }
      
      if (Object.keys(resetUpdates).length > 0) {
        console.log('[RateLimit] Saving pending reset updates before throwing error');
        await tx.user.update({ where: { id: userId }, data: resetUpdates });
      }

      const retryAfter = calculateRetryAfter(hourExceeded, monthExceeded, user, now);
      console.log(`[RateLimit] Retry after: ${retryAfter.toISOString()}`);
      
      throw new RateLimitError(`Rate limit exceeded for ${user.plan} plan`, { retryAfter });
    }

    const successUpdates: any = {
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
