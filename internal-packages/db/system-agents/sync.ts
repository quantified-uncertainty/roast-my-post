#!/usr/bin/env tsx

import { PrismaClient } from '../generated';
import { systemAgents } from './agents';
import { SystemAgentDefinition } from './types';

const prisma = new PrismaClient();

async function getOrCreateSystemUser(): Promise<string> {
  const systemUserId = 'system-admin';
  
  let systemUser = await prisma.user.findUnique({
    where: { id: systemUserId }
  });

  if (!systemUser) {
    console.log('Creating system admin user...');
    systemUser = await prisma.user.create({
      data: {
        id: systemUserId,
        email: 'system@roastmypost.internal',
        name: 'System Administrator',
        role: 'ADMIN',
      }
    });
  }

  return systemUser.id;
}

async function syncAgent(agent: SystemAgentDefinition, userId: string) {
  console.log(`Syncing agent: ${agent.name} (${agent.id})`);

  // Check if agent exists
  const existingAgent = await prisma.agent.findUnique({
    where: { id: agent.id },
    include: { versions: true }
  });

  if (existingAgent) {
    // Check if agent is system-managed
    if (!existingAgent.isSystemManaged) {
      console.warn(`⚠️  Agent ${agent.id} exists but is not system-managed. Skipping.`);
      return;
    }

    // Always update agent-level fields
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        isRecommended: agent.isRecommended || false,
        isDeprecated: agent.isDeprecated || false,
        isLlmCostTracked: agent.isLlmCostTracked ?? true,
      }
    });

    // Get the latest version
    const latestVersion = existingAgent.versions
      .sort((a, b) => b.version - a.version)[0];

    // Check if content has changed
    // Note: We need to handle undefined vs null comparison properly
    // Database stores null, but TypeScript code may have undefined
    const normalizeValue = (val: any) => val === undefined ? null : val;
    
    const contentChanged = 
      latestVersion?.name !== agent.name ||
      latestVersion?.description !== agent.description ||
      normalizeValue(latestVersion?.readme) !== normalizeValue(agent.readme) ||
      normalizeValue(latestVersion?.primaryInstructions) !== normalizeValue(agent.primaryInstructions) ||
      normalizeValue(latestVersion?.selfCritiqueInstructions) !== normalizeValue(agent.selfCritiqueInstructions) ||
      latestVersion?.providesGrades !== agent.providesGrades ||
      JSON.stringify(latestVersion?.pluginIds || []) !== JSON.stringify(agent.pluginIds || []) ||
      normalizeValue(latestVersion?.extendedCapabilityId) !== normalizeValue(agent.extendedCapabilityId);

    if (contentChanged) {
      console.log(`  → Updating agent with new version ${(latestVersion?.version || 0) + 1}`);
      
      await prisma.agentVersion.create({
        data: {
          agentId: agent.id,
          version: (latestVersion?.version || 0) + 1,
          name: agent.name,
          description: agent.description,
          readme: agent.readme,
          primaryInstructions: agent.primaryInstructions,
          selfCritiqueInstructions: agent.selfCritiqueInstructions,
          providesGrades: agent.providesGrades,
          pluginIds: agent.pluginIds || [],
          extendedCapabilityId: agent.extendedCapabilityId,
        }
      });

      console.log(`  ✓ Updated to version ${(latestVersion?.version || 0) + 1}`);
    } else {
      console.log(`  ✓ Agent is up to date (version ${latestVersion?.version})`);
    }
  } else {
    console.log(`  → Creating new system agent`);
    
    await prisma.agent.create({
      data: {
        id: agent.id,
        submittedById: userId,
        isSystemManaged: true,
        isRecommended: agent.isRecommended || false,
        isDeprecated: agent.isDeprecated || false,
        isLlmCostTracked: agent.isLlmCostTracked ?? true,
        versions: {
          create: {
            version: 1,
            name: agent.name,
            description: agent.description,
            readme: agent.readme,
            primaryInstructions: agent.primaryInstructions,
            selfCritiqueInstructions: agent.selfCritiqueInstructions,
            providesGrades: agent.providesGrades,
            pluginIds: agent.pluginIds || [],
            extendedCapabilityId: agent.extendedCapabilityId,
          }
        }
      }
    });

    console.log(`  ✓ Created agent with version 1`);
  }
}

async function main() {
  console.log('🔄 Starting system agents synchronization...\n');

  try {
    // Get or create system user
    const systemUserId = await getOrCreateSystemUser();
    console.log(`Using system user: ${systemUserId}\n`);

    // Sync each agent
    for (const agent of systemAgents) {
      await syncAgent(agent, systemUserId);
    }

    console.log('\n✅ System agents synchronization complete!');
    console.log(`Synchronized ${systemAgents.length} agents.`);

    // List all system-managed agents
    const systemManagedAgents = await prisma.agent.findMany({
      where: { isSystemManaged: true },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    console.log('\n📋 Current system-managed agents:');
    for (const agent of systemManagedAgents) {
      const latestVersion = agent.versions[0];
      console.log(`  - ${latestVersion?.name} (${agent.id}) v${latestVersion?.version}`);
    }

  } catch (error) {
    console.error('\n❌ Error during synchronization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { syncAgent, getOrCreateSystemUser };
