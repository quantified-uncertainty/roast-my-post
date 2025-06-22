#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupLinkVerifier() {
  console.log('🧹 Cleaning up Link Verifier agent...\n');

  const linkVerifier = await prisma.agent.findUnique({
    where: { id: 'MUpu1JN0oSJFxz6_' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (!linkVerifier) {
    console.log('❌ Link Verifier not found');
    return;
  }

  const latestVersion = linkVerifier.versions[0];
  console.log(`Current version: ${latestVersion.version}`);
  console.log(`Current description: "${latestVersion.description}"`);

  // Create new version with cleaned up instructions
  const newVersion = await prisma.agentVersion.create({
    data: {
      agentId: linkVerifier.id,
      version: latestVersion.version + 1,
      name: latestVersion.name,
      agentType: latestVersion.agentType,
      description: 'Verifies the status and accuracy of all links in a document using a specialized non-LLM workflow. Note: This agent uses a custom implementation and does not support analysis or self-critique instructions.',
      genericInstructions: latestVersion.genericInstructions,
      summaryInstructions: latestVersion.summaryInstructions,
      commentInstructions: latestVersion.commentInstructions,
      gradeInstructions: latestVersion.gradeInstructions,
      // Explicitly set these to null
      analysisInstructions: null,
      selfCritiqueInstructions: null,
      extendedCapabilityId: latestVersion.extendedCapabilityId
    }
  });

  console.log(`\n✅ Created version ${newVersion.version}`);
  console.log(`📝 New description: "${newVersion.description}"`);
  console.log('🗑️  Removed analysisInstructions');
  console.log('🗑️  Removed selfCritiqueInstructions');
  console.log('\nLink Verifier cleaned up successfully!');
}

// Run the cleanup
cleanupLinkVerifier()
  .then(() => prisma.$disconnect())
  .catch(console.error);