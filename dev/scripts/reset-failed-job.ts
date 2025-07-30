#!/usr/bin/env tsx
/**
 * Reset a failed job back to pending status
 */

import { prisma } from '@roast/db';

const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: tsx scripts/reset-failed-job.ts <job-id>');
  process.exit(1);
}

async function resetJob() {
  try {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        error: null,
        attempts: 0,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Reset job ${job.id} to pending status`);
  } catch (error) {
    console.error('❌ Error resetting job:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetJob();