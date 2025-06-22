import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listAgents() {
  const agents = await prisma.agent.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });

  console.log('AGENTS IN DATABASE:\n');
  for (const agent of agents) {
    const latestVersion = agent.versions[0];
    console.log(`ID: ${agent.id}`);
    console.log(`Name: ${latestVersion.name}`);
    console.log(`Type: ${latestVersion.agentType}`);
    console.log(`Description: ${latestVersion.description}`);
    console.log(`Has README: ${latestVersion.readme ? 'YES' : 'NO'}`);
    console.log('---');
  }
  
  await prisma.$disconnect();
}

listAgents().catch(console.error);