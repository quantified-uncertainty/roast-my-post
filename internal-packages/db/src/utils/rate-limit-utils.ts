import { Plan } from "../types";
import { nextReset } from "./date-utils";

// Rate limiting configuration
const PLAN_LIMITS = {
  FREE: { hourly: 1, monthly: 1 },
  PRO: { hourly: 100, monthly: 1000 },
} as const;

function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

export interface RateLimitResult {
  updatedUser: any;
  isLimited: boolean;
}

export async function checkAndIncrementRateLimit(userId: string, prisma: any): Promise<RateLimitResult> {
  return await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { plan: true, evalsThisHour: true, evalsThisMonth: true, hourResetAt: true, monthResetAt: true }
    });
    if (!user) throw new Error("User not found");

    const now = new Date();
    const updates: any = {};

    // Check and reset hour counter if expired
    if (user.hourResetAt && now >= user.hourResetAt) {
      updates.hourResetAt = nextReset(now, 'hour');
      updates.evalsThisHour = 0;
    } else if (!user.hourResetAt) {
      updates.hourResetAt = nextReset(now, 'hour');
    }

    // Check and reset month counter if expired
    if (user.monthResetAt && now >= user.monthResetAt) {
      updates.monthResetAt = nextReset(now, 'month');
      updates.evalsThisMonth = 0;
    } else if (!user.monthResetAt) {
      updates.monthResetAt = nextReset(now, 'month');
    }

    const currentHour = updates.evalsThisHour ?? user.evalsThisHour;
    const currentMonth = updates.evalsThisMonth ?? user.evalsThisMonth;
    const limits = getPlanLimits(user.plan);

    const hourlyLimitReached = currentHour >= limits.hourly;
    const monthlyLimitReached = currentMonth >= limits.monthly;

    if (hourlyLimitReached || monthlyLimitReached) {
      // Still update reset timestamps if they are due, even if limited
      if (Object.keys(updates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: updates });
      }
      return { updatedUser: null, isLimited: true };
    }

    // Increment counters
    updates.evalsThisHour = currentHour + 1;
    updates.evalsThisMonth = currentMonth + 1;

    const updatedUser = await tx.user.update({ where: { id: userId }, data: updates });
    return { updatedUser, isLimited: false };
  });
}
