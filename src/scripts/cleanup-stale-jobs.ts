#!/usr/bin/env tsx

import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

const STALE_JOB_TIMEOUT_MINUTES = 30;

async function cleanupStaleJobs() {
  try {
    console.log("🔍 Looking for stale running jobs...");
    
    // Calculate the cutoff time (30 minutes ago)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - STALE_JOB_TIMEOUT_MINUTES);
    
    // Find all jobs that are RUNNING and started more than 30 minutes ago
    const staleJobs = await prisma.job.findMany({
      where: {
        status: JobStatus.RUNNING,
        startedAt: {
          lt: cutoffTime
        }
      },
      include: {
        evaluation: {
          include: {
            document: true,
            agent: true
          }
        }
      }
    });
    
    if (staleJobs.length === 0) {
      console.log("✅ No stale jobs found.");
      return;
    }
    
    console.log(`⚠️  Found ${staleJobs.length} stale job(s) to clean up.`);
    
    // Update each stale job to FAILED status
    for (const job of staleJobs) {
      const runningTime = job.startedAt ? 
        Math.round((Date.now() - job.startedAt.getTime()) / 1000 / 60) : 
        'unknown';
      
      const errorMessage = `Job terminated: Running for ${runningTime} minutes (exceeded ${STALE_JOB_TIMEOUT_MINUTES} minute timeout). Process likely interrupted or crashed.`;
      
      console.log(`❌ Marking job ${job.id} as FAILED`);
      console.log(`   - Document: ${job.evaluation.document.id}`);
      console.log(`   - Agent: ${job.evaluation.agent.id}`);
      console.log(`   - Started: ${job.startedAt?.toISOString()}`);
      console.log(`   - Running time: ${runningTime} minutes`);
      
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          error: errorMessage,
          completedAt: new Date()
        }
      });
    }
    
    console.log(`✅ Cleaned up ${staleJobs.length} stale job(s).`);
    
  } catch (error) {
    console.error("❌ Error cleaning up stale jobs:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupStaleJobs().catch(console.error);