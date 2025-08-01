#!/usr/bin/env tsx
/**
 * Generate cost reports from Helicone data
 * 
 * Usage: 
 *   npm run helicone-cost-report                    # Last 7 days
 *   npm run helicone-cost-report -- --days 30       # Last 30 days
 *   npm run helicone-cost-report -- --job <jobId>   # Specific job
 */

import 'dotenv/config';
import { heliconeAPI } from '@roast/ai';
import { prisma } from '@roast/db';

async function generateCostReport() {
  const args = process.argv.slice(2);
  const daysIndex = args.indexOf('--days');
  const jobIndex = args.indexOf('--job');
  
  const days = daysIndex >= 0 ? parseInt(args[daysIndex + 1]) : 7;
  const jobId = jobIndex >= 0 ? args[jobIndex + 1] : null;

  console.log('💰 Helicone Cost Report\n');

  try {
    if (jobId) {
      // Report for specific job
      await generateJobReport(jobId);
    } else {
      // General usage report
      await generateUsageReport(days);
    }
  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

async function generateJobReport(jobId: string) {
  console.log(`📋 Cost Report for Job: ${jobId}\n`);

  // Get job details from database
  const job = await prisma.job.findFirst({
    where: { id: jobId },
    include: {
      evaluationVersion: {
        include: {
          agentVersion: {
            include: {
              agent: true
            }
          },
          documentVersion: {
            include: {
              document: true
            }
          }
        }
      }
    }
  });

  if (!job) {
    console.log('❌ Job not found');
    return;
  }

  if (!job.evaluationVersion) {
    console.log('⚠️  Job has no evaluation version data');
    return;
  }

  console.log(`Agent: ${job.evaluationVersion.agentVersion.name}`);
  console.log(`Document Version: ${job.evaluationVersion.documentVersion.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Created: ${job.createdAt.toLocaleString()}\n`);

  // Get session ID for this job
  const sessionId = `job-${job.id}`;
  
  try {
    const costs = await heliconeAPI.getSessionCosts(sessionId);
    
    console.log('💵 Cost Summary:');
    console.log(`   Total Cost: $${costs.totalCost.toFixed(4)}`);
    console.log(`   Total Tokens: ${costs.totalTokens.toLocaleString()}`);
    console.log(`   API Calls: ${costs.requestCount}`);
    
    if (costs.breakdown.length > 0) {
      console.log('\n📊 Model Breakdown:');
      costs.breakdown.forEach(model => {
        console.log(`   ${model.model}:`);
        console.log(`      Cost: $${model.cost.toFixed(4)}`);
        console.log(`      Tokens: ${model.tokens.toLocaleString()}`);
        console.log(`      Calls: ${model.count}`);
        if (model.count > 0) {
          console.log(`      Avg tokens/call: ${Math.round(model.tokens / model.count).toLocaleString()}`);
        }
      });
    }

    // Get detailed request timeline
    const requests = await heliconeAPI.getSessionRequests(sessionId);
    if (requests.length > 0) {
      console.log('\n📈 Request Timeline:');
      const pathCosts = new Map<string, { cost: number; count: number }>();
      
      requests.forEach(req => {
        const path = req.session?.path || req.properties?.['Helicone-Session-Path'] || 'unknown';
        const existing = pathCosts.get(path) || { cost: 0, count: 0 };
        pathCosts.set(path, {
          cost: existing.cost + (req.cost || 0),
          count: existing.count + 1
        });
      });

      Array.from(pathCosts.entries())
        .sort((a, b) => b[1].cost - a[1].cost)
        .forEach(([path, data]) => {
          console.log(`   ${path}:`);
          console.log(`      Cost: $${data.cost.toFixed(4)}`);
          console.log(`      Calls: ${data.count}`);
        });
    }

  } catch (error) {
    console.log('⚠️  Could not fetch session data from Helicone');
    console.log('   Make sure the job was run with session tracking enabled');
  }
}

async function generateUsageReport(days: number) {
  console.log(`📊 Usage Report for Last ${days} Days\n`);

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const usage = await heliconeAPI.getUsageStats(startDate, endDate);

  console.log('📈 Overall Statistics:');
  console.log(`   Total Requests: ${usage.totalRequests.toLocaleString()}`);
  console.log(`   Total Cost: $${usage.totalCost.toFixed(2)}`);
  console.log(`   Total Tokens: ${usage.totalTokens.toLocaleString()}`);
  
  if (usage.totalRequests > 0) {
    console.log(`   Avg Cost/Request: $${(usage.totalCost / usage.totalRequests).toFixed(4)}`);
    console.log(`   Avg Tokens/Request: ${Math.round(usage.totalTokens / usage.totalRequests).toLocaleString()}`);
  }

  if (usage.byModel.size > 0) {
    console.log('\n🤖 By Model:');
    const modelArray = Array.from(usage.byModel.entries())
      .sort((a, b) => b[1].cost - a[1].cost);
    
    modelArray.forEach(([model, stats]) => {
      console.log(`   ${model}:`);
      console.log(`      Requests: ${stats.requests.toLocaleString()}`);
      console.log(`      Cost: $${stats.cost.toFixed(4)}`);
      console.log(`      Tokens: ${stats.tokens.toLocaleString()}`);
      if (stats.requests > 0) {
        console.log(`      Avg cost/request: $${(stats.cost / stats.requests).toFixed(4)}`);
      }
    });
  }

  if (usage.byDay.length > 0) {
    console.log('\n📅 Daily Breakdown:');
    usage.byDay.forEach(day => {
      console.log(`   ${day.date}: ${day.requests} requests, $${day.cost.toFixed(4)}`);
    });
    
    // Calculate daily average
    const totalDailyCost = usage.byDay.reduce((sum, day) => sum + day.cost, 0);
    const avgDailyCost = totalDailyCost / usage.byDay.length;
    console.log(`\n   Average daily cost: $${avgDailyCost.toFixed(4)}`);
    console.log(`   Projected monthly cost: $${(avgDailyCost * 30).toFixed(2)}`);
  }

  // Get recent job sessions for context
  console.log('\n🏃 Recent Job Sessions:');
  const jobSessions = await heliconeAPI.getRecentJobSessions(5);
  
  if (jobSessions.length > 0) {
    jobSessions.forEach(session => {
      console.log(`   ${session.agentName} on "${session.documentTitle}"`);
      console.log(`      Cost: $${session.totalCost.toFixed(4)}, Requests: ${session.requestCount}`);
      console.log(`      ${new Date(session.createdAt).toLocaleString()}`);
    });
  } else {
    console.log('   No recent job sessions found');
  }

  // Cost optimization tips
  console.log('\n💡 Cost Optimization Tips:');
  
  // Find most expensive model
  const expensiveModel = Array.from(usage.byModel.entries())
    .sort((a, b) => b[1].cost - a[1].cost)[0];
  
  if (expensiveModel) {
    const [model, stats] = expensiveModel;
    const costPercentage = (stats.cost / usage.totalCost * 100).toFixed(1);
    console.log(`   - ${model} accounts for ${costPercentage}% of costs`);
    
    if (model.includes('opus') || model.includes('gpt-4')) {
      console.log('     Consider using cheaper models for simpler tasks');
    }
  }
  
  // Check for high token usage
  if (usage.totalRequests > 0) {
    const avgTokens = usage.totalTokens / usage.totalRequests;
    if (avgTokens > 2000) {
      console.log(`   - High average tokens per request (${Math.round(avgTokens).toLocaleString()})`);
      console.log('     Consider chunking documents or summarizing inputs');
    }
  }
  
  console.log('   - Enable caching for repeated queries');
  console.log('   - Use session tracking to identify expensive workflows');
}

// Run the report
generateCostReport().catch(console.error);