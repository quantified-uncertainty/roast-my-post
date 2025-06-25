#!/usr/bin/env tsx

import { prisma } from "../lib/prisma";
import { logger } from "@/lib/logger";
import { JobStatus } from "@prisma/client";

async function monitorRetries() {
  logger.info('📊 Job Retry Monitor\n');

  // Get all jobs with retries
  const jobsWithRetries = await prisma.job.findMany({
    where: {
      originalJobId: null,
      retryJobs: {
        some: {}
      }
    },
    include: {
      retryJobs: {
        orderBy: { createdAt: 'asc' },
        include: {
          evaluationVersion: {
            select: { id: true }
          }
        }
      },
      evaluation: {
        include: {
          document: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1
              }
            }
          },
          agent: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (jobsWithRetries.length === 0) {
    logger.info('No jobs with retries found.');
    return;
  }

  console.log(`Found ${jobsWithRetries.length} jobs with retries:\n`);

  for (const job of jobsWithRetries) {
    const doc = job.evaluation.document.versions[0];
    const agent = job.evaluation.agent.versions[0];
    
    console.log(`📄 Document: "${doc?.title || 'Unknown'}" | 🤖 Agent: ${agent?.name || 'Unknown'}`);
    console.log(`Original Job: ${job.id}`);
    console.log(`- Status: ${job.status}`);
    console.log(`- Error: ${job.error || 'N/A'}`);
    console.log(`- Created: ${job.createdAt.toISOString()}`);
    
    const allAttempts = [job, ...job.retryJobs];
    const successfulAttempt = allAttempts.find(j => j.status === JobStatus.COMPLETED);
    
    console.log(`\nRetry Chain (${job.retryJobs.length} retries):`);
    job.retryJobs.forEach((retry, index) => {
      const icon = retry.status === JobStatus.COMPLETED ? '✅' : 
                   retry.status === JobStatus.FAILED ? '❌' : 
                   retry.status === JobStatus.RUNNING ? '🏃' : '⏳';
      console.log(`  ${icon} Attempt ${index + 2}: ${retry.id}`);
      console.log(`     - Status: ${retry.status}`);
      console.log(`     - Error: ${retry.error || 'N/A'}`);
      console.log(`     - Has result: ${!!retry.evaluationVersion}`);
    });
    
    if (successfulAttempt) {
      console.log(`\n✅ Eventually succeeded on attempt ${allAttempts.indexOf(successfulAttempt) + 1}`);
    } else {
      console.log(`\n❌ All ${allAttempts.length} attempts failed`);
    }
    
    console.log('\n' + '─'.repeat(80) + '\n');
  }

  // Summary statistics
  const stats = await prisma.$queryRaw<Array<{
    total_retries: bigint;
    successful_retries: bigint;
    failed_retries: bigint;
    pending_retries: bigint;
  }>>`
    SELECT 
      COUNT(*) as total_retries,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_retries,
      COUNT(*) FILTER (WHERE status = 'FAILED') as failed_retries,
      COUNT(*) FILTER (WHERE status = 'PENDING') as pending_retries
    FROM "Job"
    WHERE "originalJobId" IS NOT NULL
  `;

  const stat = stats[0];
  logger.info('📈 Retry Statistics:');
  console.log(`- Total retries: ${stat.total_retries}`);
  console.log(`- Successful: ${stat.successful_retries} (${Math.round(Number(stat.successful_retries) / Number(stat.total_retries) * 100)}%)`);
  console.log(`- Failed: ${stat.failed_retries}`);
  console.log(`- Pending: ${stat.pending_retries}`);
}

monitorRetries()
  .catch((error) => {
    logger.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });