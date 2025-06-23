#!/usr/bin/env tsx

import { prisma } from "../lib/prisma";
import { JobModel } from "../models/Job";
import { JobStatus } from "@prisma/client";

async function testRetryLogic() {
  const jobModel = new JobModel();
  
  console.log("🧪 Testing Job Retry Logic\n");

  // Find a recent failed job to test with
  const recentFailedJob = await prisma.job.findFirst({
    where: { 
      status: JobStatus.FAILED,
      originalJobId: null, // Original job, not a retry
    },
    orderBy: { createdAt: 'desc' },
    include: {
      evaluation: {
        select: {
          id: true,
          document: { select: { id: true, versions: { take: 1 } } },
          agent: { select: { id: true, versions: { take: 1 } } }
        }
      }
    }
  });

  if (!recentFailedJob) {
    console.log("❌ No failed jobs found to test with");
    return;
  }

  console.log(`Found failed job: ${recentFailedJob.id}`);
  console.log(`- Error: ${recentFailedJob.error}`);
  console.log(`- Attempts: ${recentFailedJob.attempts}`);
  console.log(`- Document: ${recentFailedJob.evaluation.document.versions[0]?.title}`);
  console.log(`- Agent: ${recentFailedJob.evaluation.agent.versions[0]?.name}\n`);

  // Test 1: Check if error is retryable
  const isRetryable = jobModel['isRetryableError'](recentFailedJob.error || '');
  console.log(`✓ Error retryable: ${isRetryable}`);

  // Test 2: Get all attempts for this job
  const attempts = await jobModel.getJobAttempts(recentFailedJob.id);
  console.log(`✓ Total attempts found: ${attempts.length}`);
  attempts.forEach((attempt, i) => {
    console.log(`  ${i + 1}. Job ${attempt.id} - Status: ${attempt.status}, Attempts: ${attempt.attempts}`);
  });

  // Test 3: Simulate creating a retry
  if (isRetryable && recentFailedJob.attempts < 3) {
    console.log("\n🔄 Simulating retry creation...");
    
    // Create a test retry (we'll delete it after)
    const testRetry = await prisma.job.create({
      data: {
        status: JobStatus.PENDING,
        evaluationId: recentFailedJob.evaluationId,
        originalJobId: recentFailedJob.originalJobId || recentFailedJob.id,
        attempts: recentFailedJob.attempts + 1,
      },
    });

    console.log(`✓ Created test retry job: ${testRetry.id}`);
    console.log(`  - Original job: ${testRetry.originalJobId}`);
    console.log(`  - Attempt number: ${testRetry.attempts + 1}`);

    // Verify the retry appears in getJobAttempts
    const updatedAttempts = await jobModel.getJobAttempts(recentFailedJob.id);
    console.log(`✓ Updated attempts count: ${updatedAttempts.length}`);

    // Clean up test retry
    await prisma.job.delete({ where: { id: testRetry.id } });
    console.log("✓ Cleaned up test retry");
  }

  // Test 4: Check pending job filtering
  console.log("\n🔍 Testing pending job filtering...");
  const nextPendingJob = await jobModel.findNextPendingJob();
  if (nextPendingJob) {
    console.log(`✓ Next pending job: ${nextPendingJob.id}`);
    console.log(`  - Is retry: ${!!nextPendingJob.originalJobId}`);
    console.log(`  - Attempts: ${nextPendingJob.attempts}`);
  } else {
    console.log("✓ No pending jobs found");
  }

  console.log("\n✅ Retry logic tests completed!");
}

testRetryLogic()
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });