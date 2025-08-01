import { prisma } from '@roast/db';

async function checkStandardizedComments() {
  console.log('Checking for evaluations with standardized comment fields...\n');

  try {
    // Get recent evaluation versions with comments
    const evaluationVersions = await prisma.evaluationVersion.findMany({
      where: {
        comments: {
          some: {}
        }
      },
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
            },
            agent: {
              select: {
                name: true
              }
            }
          }
        },
        comments: {
          select: {
            id: true,
            description: true,
            header: true,
            level: true,
            source: true,
            metadata: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${evaluationVersions.length} recent evaluation versions with comments.\n`);

    for (const evalVersion of evaluationVersions) {
      const docTitle = evalVersion.evaluation.document.versions[0]?.title || 'Unknown';
      console.log(`Document: ${docTitle}`);
      console.log(`Agent: ${evalVersion.evaluation.agent.name}`);
      console.log(`Version: ${evalVersion.version}`);
      console.log(`Comments: ${evalVersion.comments.length}`);
      
      let standardizedCount = 0;
      for (const comment of evalVersion.comments) {
        if (comment.header || comment.level || comment.source || comment.metadata) {
          standardizedCount++;
          console.log(`\n  Comment ${comment.id.slice(0, 8)}...`);
          console.log(`  - Header: ${comment.header || 'null'}`);
          console.log(`  - Level: ${comment.level || 'null'}`);
          console.log(`  - Source: ${comment.source || 'null'}`);
          console.log(`  - Has metadata: ${comment.metadata ? 'yes' : 'no'}`);
          if (comment.metadata && Object.keys(comment.metadata).length > 0) {
            console.log(`  - Metadata keys: ${Object.keys(comment.metadata).join(', ')}`);
          }
        }
      }
      
      console.log(`\nStandardized comments: ${standardizedCount}/${evalVersion.comments.length}`);
      console.log('---\n');
    }

    // Check our test document specifically
    const testDoc = await prisma.document.findFirst({
      where: {
        id: '-w4jGoHk3EHaYfG5'
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: {
            title: true
          }
        },
        evaluations: {
          include: {
            agent: {
              select: {
                name: true
              }
            },
            jobs: {
              select: {
                status: true
              },
              take: 1,
              orderBy: {
                createdAt: 'desc'
              }
            },
            versions: {
              include: {
                comments: {
                  select: {
                    header: true,
                    level: true,
                    source: true,
                    metadata: true
                  }
                }
              },
              take: 1,
              orderBy: {
                version: 'desc'
              }
            }
          }
        }
      }
    });

    if (testDoc) {
      console.log('\nTest Document Status:');
      console.log(`Title: ${testDoc.versions[0]?.title || 'Unknown'}`);
      for (const evaluation of testDoc.evaluations) {
        console.log(`\n- Agent: ${evaluation.agent.name}`);
        console.log(`  Job Status: ${evaluation.jobs[0]?.status || 'No job'}`);
        const latestVersion = evaluation.versions[0];
        if (latestVersion) {
          console.log(`  Comments: ${latestVersion.comments.length}`);
          const standardized = latestVersion.comments.filter(c => c.header || c.level || c.source).length;
          console.log(`  Standardized: ${standardized}/${latestVersion.comments.length}`);
        } else {
          console.log(`  No evaluation version found`);
        }
      }
    }

    // Check for evaluations created after our PR
    const recentDate = new Date('2025-08-01T00:00:00Z');
    const recentCount = await prisma.evaluationVersion.count({
      where: {
        createdAt: { gte: recentDate },
        comments: {
          some: {
            OR: [
              { header: { not: null } },
              { level: { not: null } },
              { source: { not: null } },
              { metadata: { not: null } }
            ]
          }
        }
      }
    });

    console.log(`\nEvaluations with standardized comments created after 2025-08-01: ${recentCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStandardizedComments();