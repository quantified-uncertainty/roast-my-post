import { prisma } from "@/lib/prisma";

async function checkJobLogs() {
  try {
    // Get a recent job with 60s duration
    const job = await prisma.job.findFirst({
      where: {
        durationInSeconds: 60,
        status: "COMPLETED",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!job) {
      console.log("No recent 60s job found");
      process.exit(0);
    }

    console.log(`\n=== FULL LOGS FOR JOB ${job.id} ===\n`);
    console.log(job.logs);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkJobLogs();