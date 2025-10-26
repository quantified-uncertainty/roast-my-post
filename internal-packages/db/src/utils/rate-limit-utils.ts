import { Plan } from "../types";

function nextReset(now: Date, interval: 'hour' | 'month'): Date {
  const next = new Date(now);
  switch (interval) {
    case 'hour':
      next.setHours(next.getHours() + 1, 0, 0, 0);
      break;
    case 'month':
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      next.setHours(0, 0, 0, 0);
      break;
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
  FREE: { hourly: 1, monthly: 1 },
  PRO: { hourly: 100, monthly: 1000 },
};

export async function checkAndIncrementRateLimit(
  userId: string,
  prisma: any,
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

    const limits = PLAN_LIMITS[user.plan as Plan] ?? PLAN_LIMITS.FREE;
    const updates: any = {};

    // Reset hourly counter if needed
    let hourlyCount = user.evalsThisHour;
    if (!user.hourResetAt || now >= user.hourResetAt) {
      updates.hourResetAt = nextReset(now, "hour");
      updates.evalsThisHour = 0;
      hourlyCount = 0;
    }

    // Reset monthly counter if needed
    let monthlyCount = user.evalsThisMonth;
    if (!user.monthResetAt || now >= user.monthResetAt) {
      updates.monthResetAt = nextReset(now, "month");
      updates.evalsThisMonth = 0;
      monthlyCount = 0;
    }

    // Check limits
    if (hourlyCount >= limits.hourly || monthlyCount >= limits.monthly) {
      if (Object.keys(updates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: updates });
      }
      const retryAfter = user.hourResetAt && user.hourResetAt > now
        ? user.hourResetAt
        : nextReset(now, "hour");
      throw new RateLimitError(`Rate limit exceeded for ${user.plan} plan`, { retryAfter });
    }

    // Increment and update
    updates.evalsThisHour = hourlyCount + 1;
    updates.evalsThisMonth = monthlyCount + 1;
    await tx.user.update({ where: { id: userId }, data: updates });
  });
}
