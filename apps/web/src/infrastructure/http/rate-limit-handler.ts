import { NextResponse } from "next/server";

import { prisma, checkAndIncrementRateLimit, RateLimitError } from "@roast/db";

export async function handleRateLimitCheck(userId: string, count: number) {
  try {
    await checkAndIncrementRateLimit(userId, prisma, count);
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      const headers: Record<string, string> = {};
      if (error.details?.retryAfter) {
        const seconds = Math.max(
          1,
          Math.ceil((error.details.retryAfter.getTime() - Date.now()) / 1000)
        );
        headers["Retry-After"] = String(seconds);
      }
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }
    throw error;
  }
}
