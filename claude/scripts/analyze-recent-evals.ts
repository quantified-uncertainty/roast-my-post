#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRecentEvals() {
  console.log('📊 Analyzing last 200 evaluations...\n');

  // Get recent evaluations with all related data
  const recentEvals = await prisma.evaluationVersion.findMany({
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      agentVersion: {
        include: {
          agent: true
        }
      },
      documentVersion: true,
      comments: {
        include: {
          highlight: true
        }
      },
      job: {
        include: {
          tasks: true
        }
      }
    }
  });

  // Basic stats
  const totalEvals = recentEvals.length;
  const timeRange = {
    start: recentEvals[recentEvals.length - 1]?.createdAt,
    end: recentEvals[0]?.createdAt
  };

  console.log(`📅 Time range: ${timeRange.start?.toLocaleDateString()} - ${timeRange.end?.toLocaleDateString()}`);
  console.log(`📈 Total evaluations: ${totalEvals}\n`);

  // Agent distribution
  const agentStats = new Map<string, {
    name: string;
    type: string;
    count: number;
    avgGrade: number;
    avgComments: number;
    failureRate: number;
    avgCost: number;
    avgTime: number;
  }>();

  for (const evaluation of recentEvals) {
    const agentId = evaluation.agentVersion.agentId;
    
    if (!agentStats.has(agentId)) {
      agentStats.set(agentId, {
        name: evaluation.agentVersion.name,
        type: evaluation.agentVersion.agentType,
        count: 0,
        avgGrade: 0,
        avgComments: 0,
        failureRate: 0,
        avgCost: 0,
        avgTime: 0
      });
    }

    const stats = agentStats.get(agentId)!;
    stats.count++;
    
    if (evaluation.grade !== null) {
      stats.avgGrade += evaluation.grade;
    }
    
    stats.avgComments += evaluation.comments.length;
    
    if (evaluation.job?.status === 'FAILED') {
      stats.failureRate++;
    }
    
    if (evaluation.job?.costInCents) {
      stats.avgCost += evaluation.job.costInCents;
    }
    
    if (evaluation.job?.durationInSeconds) {
      stats.avgTime += evaluation.job.durationInSeconds;
    }
  }

  // Calculate averages
  console.log('🤖 Agent Performance:\n');
  const agentArray = Array.from(agentStats.entries()).map(([id, stats]) => ({
    id,
    ...stats,
    avgGrade: stats.count > 0 ? stats.avgGrade / stats.count : 0,
    avgComments: stats.count > 0 ? stats.avgComments / stats.count : 0,
    failureRate: stats.count > 0 ? (stats.failureRate / stats.count) * 100 : 0,
    avgCost: stats.count > 0 ? stats.avgCost / stats.count / 100 : 0,
    avgTime: stats.count > 0 ? stats.avgTime / stats.count : 0
  }));

  agentArray.sort((a, b) => b.count - a.count);

  for (const agent of agentArray) {
    console.log(`${agent.name} (${agent.type}):`);
    console.log(`  Evaluations: ${agent.count}`);
    console.log(`  Avg Grade: ${agent.avgGrade.toFixed(1)}`);
    console.log(`  Avg Comments: ${agent.avgComments.toFixed(1)}`);
    console.log(`  Failure Rate: ${agent.failureRate.toFixed(1)}%`);
    console.log(`  Avg Cost: $${agent.avgCost.toFixed(2)}`);
    console.log(`  Avg Time: ${agent.avgTime.toFixed(0)}s\n`);
  }

  // Comment quality analysis
  console.log('💬 Comment Analysis:\n');
  
  const allComments = recentEvals.flatMap(e => e.comments);
  const highlightErrors = allComments.filter(c => c.highlight && !c.highlight.isValid);
  
  console.log(`Total comments: ${allComments.length}`);
  console.log(`Avg comments per eval: ${(allComments.length / totalEvals).toFixed(1)}`);
  console.log(`Highlight errors: ${highlightErrors.length} (${((highlightErrors.length / allComments.length) * 100).toFixed(1)}%)\n`);

  // Grade distribution
  const grades = recentEvals.filter(e => e.grade !== null).map(e => e.grade!);
  if (grades.length > 0) {
    const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
    const stdDev = Math.sqrt(grades.reduce((sq, n) => sq + Math.pow(n - avgGrade, 2), 0) / grades.length);
    
    console.log('📊 Grade Distribution:');
    console.log(`  Average: ${avgGrade.toFixed(1)}`);
    console.log(`  Std Dev: ${stdDev.toFixed(1)}`);
    console.log(`  Min: ${Math.min(...grades)}`);
    console.log(`  Max: ${Math.max(...grades)}\n`);
  }

  // Failure analysis
  const failures = recentEvals.filter(e => e.job?.status === 'FAILED');
  console.log(`\n❌ Failures: ${failures.length} (${((failures.length / totalEvals) * 100).toFixed(1)}%)`);
  
  if (failures.length > 0) {
    const errorMessages = failures
      .map(f => f.job?.error)
      .filter(Boolean)
      .reduce((acc, error) => {
        const key = error!.includes('timeout') ? 'Timeout' : 
                   error!.includes('rate limit') ? 'Rate Limit' :
                   error!.includes('validation') ? 'Validation' : 'Other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    console.log('Error types:', errorMessages);
  }

  // Document type analysis
  console.log('\n📄 Document Analysis:');
  const docLengths = recentEvals.map(e => e.documentVersion.content.length);
  const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;
  
  console.log(`  Avg document length: ${(avgDocLength / 1000).toFixed(1)}k chars`);
  console.log(`  Shortest: ${(Math.min(...docLengths) / 1000).toFixed(1)}k chars`);
  console.log(`  Longest: ${(Math.max(...docLengths) / 1000).toFixed(1)}k chars`);

  // Performance patterns
  console.log('\n🔍 Patterns Detected:\n');
  
  // Check for grade consistency issues
  const gradesByAgent = new Map<string, number[]>();
  for (const evaluation of recentEvals) {
    if (evaluation.grade !== null) {
      const agentId = evaluation.agentVersion.agentId;
      if (!gradesByAgent.has(agentId)) {
        gradesByAgent.set(agentId, []);
      }
      gradesByAgent.get(agentId)!.push(evaluation.grade);
    }
  }

  for (const [agentId, grades] of gradesByAgent.entries()) {
    if (grades.length > 5) {
      const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
      const stdDev = Math.sqrt(grades.reduce((sq, n) => sq + Math.pow(n - avgGrade, 2), 0) / grades.length);
      
      if (stdDev > 15) {
        const agent = agentStats.get(agentId)!;
        console.log(`⚠️  ${agent.name} has high grade variance (σ=${stdDev.toFixed(1)})`);
      }
    }
  }

  // Check for agents with low comment rates
  for (const agent of agentArray) {
    if (agent.avgComments < 3 && agent.count > 5) {
      console.log(`⚠️  ${agent.name} averages only ${agent.avgComments.toFixed(1)} comments per doc`);
    }
  }

  // Check for high failure rates
  for (const agent of agentArray) {
    if (agent.failureRate > 10 && agent.count > 5) {
      console.log(`⚠️  ${agent.name} has ${agent.failureRate.toFixed(0)}% failure rate`);
    }
  }

  // Cost analysis
  const costlyAgents = agentArray.filter(a => a.avgCost > 0.50 && a.count > 5);
  if (costlyAgents.length > 0) {
    console.log(`\n💰 High-cost agents (>$0.50 avg):`);
    for (const agent of costlyAgents) {
      console.log(`  ${agent.name}: $${agent.avgCost.toFixed(2)} avg`);
    }
  }

  return {
    totalEvals,
    agentStats: agentArray,
    avgGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
    failureRate: (failures.length / totalEvals) * 100,
    avgDocLength
  };
}

// Run analysis
analyzeRecentEvals()
  .then(() => prisma.$disconnect())
  .catch(console.error);