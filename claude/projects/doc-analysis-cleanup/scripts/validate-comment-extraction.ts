#!/usr/bin/env tsx

/**
 * Script to validate comment extraction logic and identify mismatches
 */

import { prisma } from '@/lib/prisma';

async function validateCommentExtraction() {
  console.log('🔍 Analyzing comment extraction patterns...\n');

  // Get recent evaluations with their comments
  const evaluations = await prisma.evaluation.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    include: {
      comments: true,
      agentVersion: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  });

  console.log(`📊 Analyzing ${evaluations.length} recent evaluations:\n`);

  const stats = {
    totalEvaluations: evaluations.length,
    evaluationsWithComments: 0,
    totalComments: 0,
    commentCounts: {} as Record<number, number>,
    agentCommentStats: {} as Record<string, { total: number, count: number }>
  };

  for (const evaluation of evaluations) {
    const commentCount = evaluation.comments.length;
    stats.totalComments += commentCount;
    
    if (commentCount > 0) {
      stats.evaluationsWithComments++;
    }

    // Track distribution
    stats.commentCounts[commentCount] = (stats.commentCounts[commentCount] || 0) + 1;

    // Track by agent
    const agentName = evaluation.agentVersion.name;
    if (!stats.agentCommentStats[agentName]) {
      stats.agentCommentStats[agentName] = { total: 0, count: 0 };
    }
    stats.agentCommentStats[agentName].total += commentCount;
    stats.agentCommentStats[agentName].count++;

    // Check for analysis text patterns
    if (evaluation.analysis) {
      const highlightMatches = evaluation.analysis.match(/### Highlight \[/g);
      const highlightCount = highlightMatches ? highlightMatches.length : 0;
      
      if (highlightCount > 0 && highlightCount !== commentCount) {
        console.log(`⚠️  Mismatch found:`);
        console.log(`   Evaluation ID: ${evaluation.id}`);
        console.log(`   Agent: ${agentName}`);
        console.log(`   Highlights in text: ${highlightCount}`);
        console.log(`   Actual comments: ${commentCount}`);
        console.log(`   Difference: ${highlightCount - commentCount} missing comments\n`);
      }
    }
  }

  // Print statistics
  console.log('\n📈 Comment Distribution:');
  Object.entries(stats.commentCounts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([count, freq]) => {
      const percentage = (freq / stats.totalEvaluations * 100).toFixed(1);
      console.log(`   ${count} comments: ${freq} evaluations (${percentage}%)`);
    });

  console.log('\n🤖 Average Comments by Agent:');
  Object.entries(stats.agentCommentStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([agent, data]) => {
      const avg = (data.total / data.count).toFixed(1);
      console.log(`   ${agent}: ${avg} comments/evaluation`);
    });

  const avgComments = stats.totalComments / stats.totalEvaluations;
  console.log(`\n📊 Overall Statistics:`);
  console.log(`   Average comments per evaluation: ${avgComments.toFixed(1)}`);
  console.log(`   Evaluations with 0 comments: ${stats.commentCounts[0] || 0}`);
  console.log(`   Evaluations with 5+ comments: ${
    Object.entries(stats.commentCounts)
      .filter(([count]) => Number(count) >= 5)
      .reduce((sum, [, freq]) => sum + freq, 0)
  }`);
}

validateCommentExtraction()
  .catch(console.error)
  .finally(() => prisma.$disconnect());