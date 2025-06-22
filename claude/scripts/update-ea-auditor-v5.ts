#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

const prisma = new PrismaClient();

async function updateToV5() {
  console.log('🚀 Updating EA Epistemic Auditor to v5...\n');

  // Read the v5 YAML file
  const yamlContent = readFileSync('/Users/ozziegooen/Documents/Github/open-annotate/ea-epistemic-auditor-v5.yaml', 'utf8');
  const agentData = load(yamlContent) as any;

  // Find the EA Epistemic Auditor
  const agent = await prisma.agent.findUnique({
    where: { id: 'xFXdema-aCSUqbxl' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (!agent) {
    console.error('❌ EA Epistemic Auditor not found!');
    return;
  }

  const latestVersion = agent.versions[0];
  console.log(`Current version: ${latestVersion.version}`);

  // Create new version with v5 updates
  const newVersion = await prisma.agentVersion.create({
    data: {
      agentId: agent.id,
      version: latestVersion.version + 1,
      name: agentData.name,
      agentType: agentData.purpose,
      description: agentData.description,
      genericInstructions: agentData.genericInstructions,
      gradeInstructions: agentData.gradeInstructions,
      selfCritiqueInstructions: agentData.selfCritiqueInstructions,
      analysisInstructions: agentData.analysisInstructions,
      commentInstructions: agentData.commentInstructions,
      readme: agentData.readme,
      // Keep existing fields if not in v5
      summaryInstructions: latestVersion.summaryInstructions,
      extendedCapabilityId: latestVersion.extendedCapabilityId
    }
  });

  console.log(`✅ EA Epistemic Auditor updated to version ${newVersion.version}`);
  console.log('\n🎯 Major v5 improvements:');
  console.log('- Audience analysis framework for calibrated evaluation');
  console.log('- Meta-critique detection for clear critique handling');
  console.log('- Focus on non-obvious, valuable insights');
  console.log('- 10+ modular analysis types with visual formatting');
  console.log('- Analysis-to-comments content flow');
  console.log('- Hidden assumptions and confidence evaluation');
  console.log('- Improved epistemic virtue recognition');
}

// Run the update
updateToV5()
  .then(() => prisma.$disconnect())
  .catch(console.error);