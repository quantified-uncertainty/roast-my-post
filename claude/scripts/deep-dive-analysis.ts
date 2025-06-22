#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepDiveAnalysis() {
  console.log('🔍 Deep Dive Analysis of Agent Architecture\n');

  // Get unique agents with their latest versions
  const agents = await prisma.agent.findMany({
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });

  // Analyze instruction patterns
  console.log('📝 Instruction Analysis:\n');
  
  for (const agent of agents) {
    const latestVersion = agent.versions[0];
    if (!latestVersion) continue;

    console.log(`${latestVersion.name} (${latestVersion.agentType}):`);
    
    // Check instruction lengths
    const instructionLengths = {
      generic: latestVersion.genericInstructions?.length || 0,
      summary: latestVersion.summaryInstructions?.length || 0,
      analysis: latestVersion.analysisInstructions?.length || 0,
      comment: latestVersion.commentInstructions?.length || 0,
      grade: latestVersion.gradeInstructions?.length || 0,
      selfCritique: latestVersion.selfCritiqueInstructions?.length || 0
    };

    console.log(`  Total instruction chars: ${Object.values(instructionLengths).reduce((a, b) => a + b, 0)}`);
    
    // Check for missing instructions
    const missingInstructions = Object.entries(instructionLengths)
      .filter(([_, length]) => length === 0)
      .map(([type]) => type);
    
    if (missingInstructions.length > 0) {
      console.log(`  ⚠️  Missing: ${missingInstructions.join(', ')}`);
    }

    // Check for extended capabilities
    if (latestVersion.extendedCapabilityId) {
      console.log(`  🔧 Extended capability: ${latestVersion.extendedCapabilityId}`);
    }

    console.log('');
  }

  // Analyze recent failures in detail
  console.log('❌ Recent Failure Analysis:\n');
  
  const recentFailures = await prisma.job.findMany({
    where: { 
      status: 'FAILED',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      evaluation: {
        include: {
          agent: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    }
  });

  const errorPatterns = new Map<string, number>();
  
  for (const failure of recentFailures) {
    const error = failure.error || 'Unknown error';
    const agentName = failure.evaluation.agent.versions[0]?.name || 'Unknown';
    
    console.log(`Job ${failure.id} (${agentName}):`);
    console.log(`  Error: ${error.slice(0, 100)}...`);
    console.log(`  Duration: ${failure.durationInSeconds || 0}s`);
    console.log('');

    // Categorize errors
    const errorType = 
      error.includes('timeout') ? 'Timeout' :
      error.includes('rate limit') ? 'Rate Limit' :
      error.includes('token') || error.includes('context') ? 'Context Length' :
      error.includes('validation') ? 'Validation' :
      error.includes('parse') || error.includes('JSON') ? 'Parsing' :
      'Other';
    
    errorPatterns.set(errorType, (errorPatterns.get(errorType) || 0) + 1);
  }

  console.log('Error Pattern Summary:');
  for (const [type, count] of errorPatterns.entries()) {
    console.log(`  ${type}: ${count}`);
  }

  // Analyze comment quality
  console.log('\n💬 Comment Quality Analysis:\n');
  
  const recentComments = await prisma.evaluationComment.findMany({
    take: 100,
    orderBy: { 
      evaluationVersion: {
        createdAt: 'desc'
      }
    },
    include: {
      evaluationVersion: {
        include: {
          agentVersion: true
        }
      },
      highlight: true
    }
  });

  // Analyze comment patterns
  const commentLengths = recentComments.map(c => c.description.length);
  const avgCommentLength = commentLengths.reduce((a, b) => a + b, 0) / commentLengths.length;
  
  console.log(`Average comment length: ${avgCommentLength.toFixed(0)} chars`);
  console.log(`Shortest comment: ${Math.min(...commentLengths)} chars`);
  console.log(`Longest comment: ${Math.max(...commentLengths)} chars`);

  // Check for very short comments
  const shortComments = recentComments.filter(c => c.description.length < 50);
  if (shortComments.length > 0) {
    console.log(`\n⚠️  ${shortComments.length} very short comments (<50 chars):`);
    for (const comment of shortComments.slice(0, 3)) {
      console.log(`  "${comment.description}" - ${comment.evaluationVersion.agentVersion.name}`);
    }
  }

  // Check highlight accuracy
  const highlightIssues = recentComments.filter(c => c.highlight && !c.highlight.isValid);
  if (highlightIssues.length > 0) {
    console.log(`\n⚠️  ${highlightIssues.length} comments with highlight errors`);
  }

  // Cost efficiency analysis
  console.log('\n💰 Cost Efficiency Analysis:\n');
  
  const recentJobs = await prisma.job.findMany({
    where: {
      status: 'COMPLETED',
      costInCents: { not: null }
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      evaluation: {
        include: {
          agent: true
        }
      },
      evaluationVersion: {
        include: {
          comments: true
        }
      }
    }
  });

  const costEfficiency = recentJobs.map(job => ({
    agentId: job.evaluation.agentId,
    agentName: job.evaluation.agent.versions?.[0]?.name || 'Unknown',
    cost: job.costInCents! / 100,
    comments: job.evaluationVersion?.comments.length || 0,
    grade: job.evaluationVersion?.grade,
    costPerComment: job.evaluationVersion?.comments.length 
      ? (job.costInCents! / 100) / job.evaluationVersion.comments.length 
      : Infinity
  }));

  // Group by agent
  const agentEfficiency = new Map<string, { totalCost: number; totalComments: number; count: number }>();
  
  for (const job of costEfficiency) {
    const current = agentEfficiency.get(job.agentId) || { totalCost: 0, totalComments: 0, count: 0 };
    current.totalCost += job.cost;
    current.totalComments += job.comments;
    current.count++;
    agentEfficiency.set(job.agentId, current);
  }

  console.log('Cost per comment by agent:');
  for (const [agentId, stats] of agentEfficiency.entries()) {
    const agent = agents.find(a => a.id === agentId);
    const costPerComment = stats.totalComments > 0 
      ? stats.totalCost / stats.totalComments 
      : Infinity;
    
    console.log(`  ${agent?.versions[0]?.name || agentId}: $${costPerComment.toFixed(3)} per comment`);
  }

  return {
    agents: agents.length,
    recentFailures: recentFailures.length,
    errorPatterns,
    avgCommentLength,
    shortComments: shortComments.length
  };
}

// Run analysis
deepDiveAnalysis()
  .then(() => prisma.$disconnect())
  .catch(console.error);