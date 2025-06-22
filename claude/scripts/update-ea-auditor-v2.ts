#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

const prisma = new PrismaClient();

async function updateEAEpistemicAuditor() {
  console.log('🔧 Updating EA Epistemic Auditor with v2 configuration...\n');

  // Read the v2 YAML file
  const yamlContent = readFileSync('/Users/ozziegooen/Documents/Github/open-annotate/ea-epistemic-auditor-v2.yaml', 'utf8');
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
  console.log(`Current name: ${latestVersion.name}`);

  // Create new version with updated instructions
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
      readme: agentData.readme,
      // Keep existing fields that aren't in v2
      summaryInstructions: latestVersion.summaryInstructions,
      commentInstructions: latestVersion.commentInstructions,
      analysisInstructions: latestVersion.analysisInstructions,
      extendedCapabilityId: latestVersion.extendedCapabilityId
    }
  });

  console.log(`✅ EA Epistemic Auditor updated to version ${newVersion.version}`);
  console.log('\nKey changes:');
  console.log('- Added context calibration system');
  console.log('- Implemented third-person voice requirements');
  console.log('- Recalibrated grading to be less harsh');
  console.log('- Added epistemic virtue recognition');
  console.log('- Updated to constructive feedback approach');
}

// Run the update
updateEAEpistemicAuditor()
  .then(() => prisma.$disconnect())
  .catch(console.error);