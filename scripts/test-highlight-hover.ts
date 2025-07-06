import { prisma } from '../src/lib/prisma';

async function testHighlightHover() {
  console.log('Testing highlight hover functionality...\n');

  // Get a document with evaluations
  const document = await prisma.document.findFirst({
    where: {
      evaluations: {
        some: {}
      }
    },
    include: {
      evaluations: {
        include: {
          agent: true,
          comments: true
        }
      }
    }
  });

  if (!document) {
    console.log('No document with evaluations found');
    return;
  }

  console.log(`Document: ${document.title}`);
  console.log(`Number of evaluations: ${document.evaluations.length}`);
  
  // Check comments and their indices
  let commentIndex = 0;
  for (const evaluation of document.evaluations) {
    console.log(`\nAgent: ${evaluation.agent.name}`);
    console.log(`Comments: ${evaluation.comments.length}`);
    
    for (const comment of evaluation.comments) {
      console.log(`  Comment ${commentIndex}: "${comment.description?.substring(0, 50)}..."`);
      console.log(`    Highlight: ${comment.highlight.startOffset}-${comment.highlight.endOffset}`);
      console.log(`    Tag (index): ${commentIndex.toString()}`);
      commentIndex++;
    }
  }
}

testHighlightHover()
  .catch(console.error)
  .finally(() => prisma.$disconnect());