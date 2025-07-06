import { prisma } from "@/lib/prisma";

async function checkTimeoutJobs() {
  try {
    // Get jobs with exactly 60s duration (likely timeouts)
    const timeoutJobs = await prisma.job.findMany({
      where: {
        durationInSeconds: 60,
        status: "COMPLETED",
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10,
      include: {
        evaluationVersion: {
          select: {
            analysis: true,
            summary: true
          }
        },
        tasks: {
          select: {
            name: true,
            priceInCents: true,
            log: true
          }
        }
      }
    });

    console.log(`\n=== JOBS WITH 60s DURATION (${timeoutJobs.length} found) ===\n`);

    for (const job of timeoutJobs) {
      console.log(`Job ID: ${job.id}`);
      console.log(`Created: ${job.createdAt.toISOString()}`);
      console.log(`Status: ${job.status}`);
      console.log(`Cost: $${((job.costInCents || 0) / 100).toFixed(4)}`);
      console.log(`Logs Preview: ${job.logs?.substring(0, 200)}...`);
      
      if (job.evaluationVersion) {
        console.log(`Analysis length: ${job.evaluationVersion.analysis?.length || 0}`);
        console.log(`Summary: "${job.evaluationVersion.summary}"`);
      }
      
      console.log(`Tasks: ${job.tasks.length}`);
      for (const task of job.tasks) {
        console.log(`  - ${task.name}: $${(task.priceInCents / 100).toFixed(4)}`);
        console.log(`    Log: ${task.log}`);
      }
      
      // Check if logs mention timeout
      if (job.logs?.includes('timeout') || job.logs?.includes('timed out')) {
        console.log(`⚠️  TIMEOUT DETECTED IN LOGS`);
      }
      
      console.log("\n" + "-".repeat(80) + "\n");
    }

    // Also check for failed jobs with timeout errors
    const failedTimeoutJobs = await prisma.job.findMany({
      where: {
        status: "FAILED",
        error: {
          contains: "timeout",
          mode: "insensitive"
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      take: 5
    });

    if (failedTimeoutJobs.length > 0) {
      console.log(`\n=== FAILED JOBS WITH TIMEOUT ERRORS (${failedTimeoutJobs.length} found) ===\n`);
      for (const job of failedTimeoutJobs) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Created: ${job.createdAt.toISOString()}`);
        console.log(`Error: ${job.error}`);
        console.log(`Duration: ${job.durationInSeconds}s`);
        console.log("\n");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking timeout jobs:", error);
    process.exit(1);
  }
}

checkTimeoutJobs();