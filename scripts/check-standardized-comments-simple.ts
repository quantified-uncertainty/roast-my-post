import { prisma } from '@roast/db';

async function checkStandardizedComments() {
  console.log('Checking for evaluations with standardized comment fields...\n');

  try {
    // Simple query to get recent comments with standardized fields
    const recentComments = await prisma.evaluationComment.findMany({
      where: {
        OR: [
          { header: { not: null } },
          { level: { not: null } },
          { source: { not: null } },
          { metadata: { not: null } }
        ]
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        evaluationVersion: {
          include: {
            evaluation: {
              include: {
                document: {
                  include: {
                    versions: {
                      orderBy: { version: 'desc' },
                      take: 1,
                      select: {
                        title: true
                      }
                    }
                  }
                }
              }
            },
            agentVersion: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${recentComments.length} comments with standardized fields.\n`);

    // Group by evaluation
    const evaluationMap = new Map();
    
    for (const comment of recentComments) {
      const evalId = comment.evaluationVersion.evaluation.id;
      if (!evaluationMap.has(evalId)) {
        evaluationMap.set(evalId, {
          docTitle: comment.evaluationVersion.evaluation.document.versions[0]?.title || 'Unknown',
          agentName: comment.evaluationVersion.agentVersion.name,
          comments: []
        });
      }
      evaluationMap.get(evalId).comments.push(comment);
    }

    // Display results
    for (const [evalId, data] of evaluationMap) {
      console.log(`Document: ${data.docTitle}`);
      console.log(`Agent: ${data.agentName}`);
      console.log(`Comments with standardized fields: ${data.comments.length}`);
      
      for (const comment of data.comments.slice(0, 3)) { // Show max 3 comments per eval
        console.log(`\n  Comment ${comment.id.slice(0, 8)}...`);
        console.log(`  - Header: ${comment.header || 'null'}`);
        console.log(`  - Level: ${comment.level || 'null'}`);
        console.log(`  - Source: ${comment.source || 'null'}`);
        console.log(`  - Has metadata: ${comment.metadata ? 'yes' : 'no'}`);
      }
      
      if (data.comments.length > 3) {
        console.log(`  ... and ${data.comments.length - 3} more comments`);
      }
      console.log('---\n');
    }

    // Count total standardized comments
    const totalStandardized = await prisma.evaluationComment.count({
      where: {
        OR: [
          { header: { not: null } },
          { level: { not: null } },
          { source: { not: null } },
          { metadata: { not: null } }
        ]
      }
    });

    const totalComments = await prisma.evaluationComment.count();
    
    console.log(`\nTotal standardized comments: ${totalStandardized}/${totalComments}`);
    console.log(`Percentage with standardized fields: ${((totalStandardized/totalComments) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStandardizedComments();