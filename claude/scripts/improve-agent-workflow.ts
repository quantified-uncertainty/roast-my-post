#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function improveAgentWorkflow(agentId: string) {
  console.log(`🤖 Starting improvement workflow for agent ${agentId}\n`);
  
  // 1. Get latest batch results
  const latestBatch = await prisma.agentEvalBatch.findFirst({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: {
      jobs: {
        include: {
          evaluationVersion: {
            include: {
              documentVersion: true,
              comments: true
            }
          }
        }
      }
    }
  });

  if (!latestBatch) {
    console.log('No batches found for this agent');
    return;
  }

  console.log(`📊 Analyzing batch ${latestBatch.id} (${latestBatch.jobs.length} evaluations)\n`);

  // 2. Calculate metrics
  const completedJobs = latestBatch.jobs.filter(j => j.status === 'COMPLETED');
  const grades = completedJobs
    .map(j => j.evaluationVersion?.grade)
    .filter((g): g is number => g !== null);
  
  const avgGrade = grades.length > 0 
    ? grades.reduce((a, b) => a + b, 0) / grades.length 
    : 0;
  
  const stdDev = Math.sqrt(
    grades.reduce((sq, n) => sq + Math.pow(n - avgGrade, 2), 0) / grades.length
  );

  console.log(`Average grade: ${avgGrade.toFixed(1)}`);
  console.log(`Std deviation: ${stdDev.toFixed(1)}`);
  console.log(`Failed jobs: ${latestBatch.jobs.filter(j => j.status === 'FAILED').length}`);
  
  // 3. Analyze common issues
  const allComments = completedJobs.flatMap(j => 
    j.evaluationVersion?.comments || []
  );
  
  console.log(`\n💭 Total comments: ${allComments.length}`);
  console.log(`Comments per doc: ${(allComments.length / completedJobs.length).toFixed(1)}`);

  // 4. Get current agent instructions
  const currentVersion = await prisma.agentVersion.findFirst({
    where: { agentId },
    orderBy: { version: 'desc' }
  });

  console.log(`\n📝 Current version: ${currentVersion?.version}`);
  console.log(`\nCurrent instructions preview:`);
  console.log(currentVersion?.genericInstructions?.slice(0, 200) + '...\n');

  // 5. Export data for LLM analysis
  const exportData = {
    agentId,
    currentVersion: currentVersion?.version,
    metrics: {
      avgGrade,
      stdDev,
      completedEvals: completedJobs.length,
      failedEvals: latestBatch.jobs.length - completedJobs.length,
      commentsPerDoc: allComments.length / completedJobs.length
    },
    sampleEvaluations: completedJobs.slice(0, 3).map(j => ({
      document: j.evaluationVersion?.documentVersion?.title,
      grade: j.evaluationVersion?.grade,
      summary: j.evaluationVersion?.summary?.slice(0, 150) + '...',
      commentCount: j.evaluationVersion?.comments.length
    })),
    currentInstructions: {
      generic: currentVersion?.genericInstructions,
      grading: currentVersion?.gradeInstructions
    }
  };

  // Save for LLM analysis
  const fs = require('fs');
  fs.writeFileSync(
    `/tmp/agent-analysis-${agentId}.json`, 
    JSON.stringify(exportData, null, 2)
  );

  console.log(`\n✅ Analysis complete! Exported to /tmp/agent-analysis-${agentId}.json`);
  console.log('\nNext steps:');
  console.log('1. Feed this data to Claude/GPT-4 for improvement suggestions');
  console.log('2. Create new agent version with improvements');
  console.log('3. Run new batch to compare performance');
}

// Run
const agentId = process.argv[2];
if (!agentId) {
  console.error('Usage: npm run improve-agent <agent-id>');
  process.exit(1);
}

improveAgentWorkflow(agentId)
  .then(() => prisma.$disconnect())
  .catch(console.error);