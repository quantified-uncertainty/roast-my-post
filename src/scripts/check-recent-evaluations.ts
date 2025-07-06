import { prisma } from "@/lib/prisma";

async function checkRecentEvaluations() {
  try {
    // Get recent evaluation versions
    const recentEvaluations = await prisma.evaluationVersion.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      include: {
        agentVersion: {
          select: {
            name: true,
            agentId: true
          }
        },
        documentVersion: {
          select: {
            title: true
          }
        },
        job: {
          select: {
            id: true,
            status: true,
            costInCents: true,
            durationInSeconds: true,
            error: true,
            createdAt: true,
            completedAt: true
          }
        }
      }
    });

    console.log(`\n=== RECENT EVALUATIONS (${recentEvaluations.length} found) ===\n`);

    for (const evaluation of recentEvaluations) {
      console.log(`Evaluation ID: ${evaluation.id}`);
      console.log(`Created: ${evaluation.createdAt.toISOString()}`);
      console.log(`Agent: ${evaluation.agentVersion.name} (v${evaluation.version})`);
      console.log(`Document: ${evaluation.documentVersion.title}`);
      
      if (evaluation.job) {
        console.log(`Job Status: ${evaluation.job.status}`);
        console.log(`Duration: ${evaluation.job.durationInSeconds?.toFixed(1)}s`);
        console.log(`Cost: $${((evaluation.job.costInCents || 0) / 100).toFixed(4)}`);
        if (evaluation.job.error) {
          console.log(`Error: ${evaluation.job.error}`);
        }
      }
      
      console.log(`Analysis length: ${evaluation.analysis?.length || 0} chars`);
      console.log(`Summary length: ${evaluation.summary?.length || 0} chars`);
      console.log(`Grade: ${evaluation.grade || 'N/A'}`);
      
      // Show first 200 chars of analysis
      if (evaluation.analysis) {
        console.log(`Analysis preview: ${evaluation.analysis.substring(0, 200)}...`);
      } else {
        console.log(`Analysis: EMPTY OR NULL`);
      }
      
      console.log("\n" + "-".repeat(80) + "\n");
    }

    // Check for evaluations with empty analysis
    const emptyAnalysisCount = await prisma.evaluationVersion.count({
      where: {
        OR: [
          { analysis: null },
          { analysis: "" }
        ]
      }
    });

    console.log(`\nTotal evaluations with empty analysis: ${emptyAnalysisCount}`);

    // Check for recent jobs with zero cost
    const zeroCostJobs = await prisma.job.findMany({
      where: {
        status: "COMPLETED",
        costInCents: 0,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 5,
      include: {
        evaluation: {
          select: {
            id: true
          }
        }
      }
    });

    if (zeroCostJobs.length > 0) {
      console.log(`\n=== ZERO COST COMPLETED JOBS (${zeroCostJobs.length} found) ===\n`);
      for (const job of zeroCostJobs) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Evaluation ID: ${job.evaluation?.id}`);
        console.log(`Created: ${job.createdAt.toISOString()}`);
        console.log(`Duration: ${job.durationInSeconds?.toFixed(1)}s`);
        console.log(`Logs length: ${job.logs?.length || 0} chars`);
        console.log("\n");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking evaluations:", error);
    process.exit(1);
  }
}

checkRecentEvaluations();