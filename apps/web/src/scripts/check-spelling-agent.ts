import { prisma } from '@roast/db';

async function checkSpellingAgent() {
  const agentVersions = await prisma.agentVersion.findMany({
    where: { 
      name: { contains: 'Test Spelling' }
    },
    select: {
      id: true,
      name: true,
      extendedCapabilityId: true,
      version: true
    },
    orderBy: { version: 'desc' },
    take: 5
  });
  
  console.log('Test Spelling Agent versions:');
  agentVersions.forEach(av => {
    console.log(`- ${av.name} (v${av.version}): extendedCapabilityId = ${av.extendedCapabilityId || 'null'}`);
  });
  
  await prisma.$disconnect();
}

checkSpellingAgent().catch(console.error);