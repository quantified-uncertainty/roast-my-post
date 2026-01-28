import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";

/**
 * Get status of multiple jobs by ID
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const jobIdsParam = request.nextUrl.searchParams.get("jobIds");
  if (!jobIdsParam) {
    return NextResponse.json({ error: "jobIds is required" }, { status: 400 });
  }

  const jobIds = jobIdsParam.split(",").filter(Boolean);
  if (jobIds.length === 0) {
    return NextResponse.json({ error: "jobIds cannot be empty" }, { status: 400 });
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: {
        id: true,
        status: true,
        evaluationVersionId: true,
        error: true,
      },
    });

    const completed = jobs.filter((j) => j.status === "COMPLETED").length;
    const failed = jobs.filter((j) => j.status === "FAILED").length;
    const pending = jobs.filter((j) => j.status === "PENDING").length;
    const running = jobs.filter((j) => j.status === "RUNNING").length;

    const allDone = completed + failed === jobs.length;

    return NextResponse.json({
      jobs,
      summary: {
        total: jobs.length,
        completed,
        failed,
        pending,
        running,
        allDone,
      },
    });
  } catch (error) {
    logger.error("Failed to get job status:", error);
    return commonErrors.serverError("Failed to get job status");
  }
}
