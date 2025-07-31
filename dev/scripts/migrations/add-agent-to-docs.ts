#!/usr/bin/env npx tsx

import { prisma } from '@roast/db';

async function addAgentToDocuments() {
  const documentIds = [
    "03JYFfhOzAHWK1AS", // A Defense of Mid-Tier EA/LW Writing
    "BdPyQAu4Mongayul", // Information-Dense Conference Badges
    "Qo1yr16v72FYsYj3", // EA could use better internal communications infrastructure
    "aQD9-nHxQ_eKfww9", // $1,000 Squiggle Experimentation Challenge
  ];
  
  const agentId = "8ZG6RyEzfxzIPa9h"; // EA Epistemic Auditor

  for (const documentId of documentIds) {
    console.log(`Processing document ${documentId}...`);
    
    try {
      // Get document and its latest version
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
          evaluations: true,
        },
      });

      if (!document) {
        console.error(`Document ${documentId} not found`);
        continue;
      }

      const latestVersion = document.versions[0];
      if (!latestVersion) {
        console.error(`Document ${documentId} has no versions`);
        continue;
      }

      // Update intended agents
      await prisma.documentVersion.update({
        where: { id: latestVersion.id },
        data: {
          intendedAgents: [agentId],
        },
      });

      // Check if evaluation already exists
      const existingEvaluation = document.evaluations.find((e: any) => e.agentId === agentId);
      
      if (!existingEvaluation) {
        // Create evaluation and job
        const result = await prisma.$transaction(async (tx: any) => {
          const evaluation = await tx.evaluation.create({
            data: {
              documentId: documentId,
              agentId: agentId,
            },
          });

          const job = await tx.job.create({
            data: {
              evaluationId: evaluation.id,
            },
          });

          return { evaluation, job };
        });

        console.log(`✅ Created evaluation ${result.evaluation.id} and job ${result.job.id}`);
      } else {
        console.log(`⏭️  Evaluation already exists for agent ${agentId}`);
      }
    } catch (error) {
      console.error(`❌ Error processing document ${documentId}:`, error);
    }
  }

  console.log("\n✨ Done!");
  await prisma.$disconnect();
}

addAgentToDocuments().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});