#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTestBatches() {
  console.log('🚀 Running test batches for updated agents...\n');

  const agents = [
    { id: 'IQYnCfrwvu5-RDkO', name: 'Eliezer Simulator' },
    { id: 'MUpu1JN0oSJFxz6_', name: 'Link Verifier' },
    { id: 'iAc2aQYnJLUURDGJ', name: 'Quantitative Forecaster' }
  ];

  for (const agent of agents) {
    console.log(`Creating batch for ${agent.name}...`);

    // Get the latest agent version
    const latestVersion = await prisma.agentVersion.findFirst({
      where: { agentId: agent.id },
      orderBy: { version: 'desc' }
    });

    if (!latestVersion) {
      console.log(`❌ No version found for ${agent.name}`);
      continue;
    }

    // Create batch
    const batch = await prisma.agentEvalBatch.create({
      data: {
        name: `Test batch for new instructions - ${new Date().toISOString()}`,
        agentId: agent.id,
        targetCount: 5
      }
    });

    console.log(`✅ Created batch ${batch.id} for ${agent.name}`);

    // Find documents that haven't been evaluated by this agent's latest version
    const documentsToEvaluate = await prisma.document.findMany({
      where: {
        NOT: {
          evaluations: {
            some: {
              agentId: agent.id,
              versions: {
                some: {
                  agentVersionId: latestVersion.id
                }
              }
            }
          }
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${documentsToEvaluate.length} documents to evaluate`);

    // Create jobs for each document
    for (const doc of documentsToEvaluate) {
      // Get or create evaluation
      let evaluation = await prisma.evaluation.findFirst({
        where: {
          documentId: doc.id,
          agentId: agent.id
        }
      });

      if (!evaluation) {
        evaluation = await prisma.evaluation.create({
          data: {
            documentId: doc.id,
            agentId: agent.id
          }
        });
      }

      // Create job
      await prisma.job.create({
        data: {
          evaluationId: evaluation.id,
          agentEvalBatchId: batch.id,
          status: 'PENDING'
        }
      });
    }

    console.log(`✅ Created ${documentsToEvaluate.length} jobs for ${agent.name}\n`);
  }

  console.log('All batches created! Run npm run process-jobs to execute them.');
}

// Run the script
runTestBatches()
  .then(() => prisma.$disconnect())
  .catch(console.error);