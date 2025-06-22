#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatchResults() {
  console.log('📊 Checking batch results for updated agents...\n');

  const batchIds = [
    '331d1a02-22e5-4726-b937-759d99e60991', // Eliezer
    '24a5c329-53bf-4308-b990-c0ebbe307f6f', // Link Verifier
    '7fbb2f26-0947-4880-a784-cdc09b2c1c02'  // Quantitative Forecaster
  ];

  for (const batchId of batchIds) {
    const batch = await prisma.agentEvalBatch.findUnique({
      where: { id: batchId },
      include: {
        agent: {
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1
            }
          }
        },
        jobs: {
          include: {
            evaluationVersion: {
              include: {
                comments: true
              }
            }
          }
        }
      }
    });

    if (!batch) continue;

    const agentName = batch.agent.versions[0].name;
    console.log(`\n📋 ${agentName} (Batch: ${batchId})`);
    console.log('═'.repeat(60));

    // Job status summary
    const jobStats = {
      total: batch.jobs.length,
      completed: batch.jobs.filter(j => j.status === 'COMPLETED').length,
      failed: batch.jobs.filter(j => j.status === 'FAILED').length,
      pending: batch.jobs.filter(j => j.status === 'PENDING').length,
      running: batch.jobs.filter(j => j.status === 'RUNNING').length
    };

    console.log(`\nJob Status:`);
    console.log(`  Total: ${jobStats.total}`);
    console.log(`  ✅ Completed: ${jobStats.completed}`);
    console.log(`  ❌ Failed: ${jobStats.failed}`);
    console.log(`  ⏳ Pending: ${jobStats.pending}`);
    console.log(`  🔄 Running: ${jobStats.running}`);

    // Check if new fields are being used
    const completedJobs = batch.jobs.filter(j => j.status === 'COMPLETED' && j.evaluationVersion);
    
    if (completedJobs.length > 0) {
      console.log(`\n✨ New Instructions Usage:`);
      
      // Check for analysis content
      const hasAnalysis = completedJobs.filter(j => 
        j.evaluationVersion?.analysis && j.evaluationVersion.analysis.length > 100
      ).length;
      console.log(`  Analysis populated: ${hasAnalysis}/${completedJobs.length}`);

      // Check for self-critique
      const hasSelfCritique = completedJobs.filter(j => 
        j.evaluationVersion?.selfCritique && j.evaluationVersion.selfCritique.length > 50
      ).length;
      console.log(`  Self-critique populated: ${hasSelfCritique}/${completedJobs.length}`);

      // Average comment count
      const avgComments = completedJobs.reduce((sum, j) => 
        sum + (j.evaluationVersion?.comments.length || 0), 0
      ) / completedJobs.length;
      console.log(`  Avg comments per eval: ${avgComments.toFixed(1)}`);

      // Sample a completed evaluation
      if (completedJobs.length > 0) {
        const sample = completedJobs[0];
        console.log(`\n📝 Sample Evaluation:`);
        if (sample.evaluationVersion?.analysis) {
          console.log(`  Analysis preview: "${sample.evaluationVersion.analysis.slice(0, 150)}..."`);
        }
        if (sample.evaluationVersion?.selfCritique) {
          console.log(`  Self-critique preview: "${sample.evaluationVersion.selfCritique.slice(0, 150)}..."`);
        }
      }
    }

    // Check for failures
    const failedJobs = batch.jobs.filter(j => j.status === 'FAILED');
    if (failedJobs.length > 0) {
      console.log(`\n⚠️  Failures:`);
      failedJobs.slice(0, 3).forEach(job => {
        console.log(`  - ${job.error?.slice(0, 100)}...`);
      });
    }
  }

  console.log('\n\n📊 Summary Recommendations:');
  console.log('1. Check if analysis and self-critique are being populated');
  console.log('2. Review any failures for validation issues');
  console.log('3. Compare comment quality before/after changes');
  console.log('4. Run larger batches if initial results look good');
}

// Run the check
checkBatchResults()
  .then(() => prisma.$disconnect())
  .catch(console.error);