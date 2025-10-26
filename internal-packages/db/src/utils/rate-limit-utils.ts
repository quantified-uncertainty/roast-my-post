import { Plan } from "../types";

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
  prisma: any,
  count: number = 1,
  now: Date = new Date()
): Promise<void> {
  return prisma.$transaction(async (tx: any) => {
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

    // Validate plan and get limits with runtime type checking
    let limits;
    if (isPlan(user.plan)) {
      limits = PLAN_LIMITS[user.plan];
    } else {
      console.warn(`Invalid plan "${user.plan}" for user ${userId}, falling back to REGULAR plan`);
      limits = PLAN_LIMITS.REGULAR;
    }
    const updates: any = {};

    // Reset hourly counter if needed
    let hourlyCount = user.evalsThisHour ?? 0;
    if (!user.hourResetAt || now >= user.hourResetAt) {
      updates.hourResetAt = nextReset(now, "hour");
      updates.evalsThisHour = 0;
      hourlyCount = 0;
    }

    // Reset monthly counter if needed
    let monthlyCount = user.evalsThisMonth ?? 0;
    if (!user.monthResetAt || now >= user.monthResetAt) {
      updates.monthResetAt = nextReset(now, "month");
      updates.evalsThisMonth = 0;
      monthlyCount = 0;
    }
    // Check limits (accounting for the count we're about to add)
    const hourExceeded = hourlyCount + count > limits.hourly;
    const monthExceeded = monthlyCount + count > limits.monthly;
    
    if (hourExceeded || monthExceeded) {
      // Save any pending reset updates
      if (Object.keys(updates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: updates });
      }
      
      const retryAfter = calculateRetryAfter(hourExceeded, monthExceeded, user, now);
      
      throw new RateLimitError(`Rate limit exceeded for ${user.plan} plan`, { retryAfter });
    }

    // Increment and update
    updates.evalsThisHour = hourlyCount + count;
    updates.evalsThisMonth = monthlyCount + count;
    await tx.user.update({ where: { id: userId }, data: updates });
  });
}
