import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeAgent(agentId: string) {
  // Get latest agent version with all evaluations
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          evaluations: {
            include: {
              documentVersion: true,
              comments: true,
              job: true
            }
          }
        }
      }
    }
  });

  console.log(`Agent: ${agent?.versions[0].name}`);
  console.log(`Total evaluations: ${agent?.versions[0].evaluations.length}`);
  
  // Calculate average grade
  const grades = agent?.versions[0].evaluations
    .map(e => e.grade)
    .filter(g => g !== null) as number[];
  
  const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
  console.log(`Average grade: ${avgGrade.toFixed(1)}`);
}

// Run if called directly
if (require.main === module) {
  analyzeAgent(process.argv[2])
    .then(() => process.exit(0))
    .catch(console.error);
}