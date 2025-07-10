#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugInfrastructure() {
  console.log('🔍 Infrastructure Health Check\n');
  
  // 1. Check recent batches
  console.log('📦 Recent Batches:');
  const batches = await prisma.agentEvalBatch.findMany({
    where: { isEphemeral: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      jobs: {
        select: {
          id: true,
          status: true,
          evaluationId: true,
          evaluationVersionId: true,
        }
      }
    }
  });
  
  for (const batch of batches) {
    console.log(`\nBatch: ${batch.id} (${batch.trackingId})`);
    console.log(`  Jobs: ${batch.jobs.length}`);
    
    for (const job of batch.jobs) {
      console.log(`  Job ${job.id}: ${job.status}`);
      console.log(`    Evaluation: ${job.evaluationId}`);
      console.log(`    EvaluationVersion: ${job.evaluationVersionId}`);
      
      // Check if evaluation version exists and has data
      if (job.evaluationVersionId) {
        const evalVersion = await prisma.evaluationVersion.findUnique({
          where: { id: job.evaluationVersionId },
          include: {
            comments: {
              select: { id: true, description: true }
            }
          }
        });
        
        if (evalVersion) {
          console.log(`    ✅ EvaluationVersion found`);
          console.log(`    Analysis: ${evalVersion.analysis ? 'YES' : 'NO'} (${evalVersion.analysis?.length || 0} chars)`);
          console.log(`    Comments: ${evalVersion.comments.length}`);
          console.log(`    Grade: ${evalVersion.grade}`);
        } else {
          console.log(`    ❌ EvaluationVersion NOT FOUND`);
        }
      }
    }
  }
  
  // 2. Check evaluation versions from recent experiments
  console.log('\n📊 Recent Evaluation Versions:');
  const recentEvaluations = await prisma.evaluationVersion.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      comments: true,
      agentVersion: {
        include: {
          agent: {
            select: { id: true, ephemeralBatchId: true }
          }
        }
      }
    }
  });
  
  for (const evalVersion of recentEvaluations) {
    console.log(`\nEvaluationVersion: ${evalVersion.id}`);
    console.log(`  Created: ${evalVersion.createdAt.toISOString()}`);
    console.log(`  Analysis: ${evalVersion.analysis ? 'YES' : 'NO'} (${evalVersion.analysis?.length || 0} chars)`);
    console.log(`  Comments: ${evalVersion.comments.length}`);
    console.log(`  Agent: ${evalVersion.agentVersion.agent.id}`);
    console.log(`  Ephemeral: ${evalVersion.agentVersion.agent.ephemeralBatchId ? 'YES' : 'NO'}`);
    
    if (evalVersion.comments.length > 0) {
      console.log(`  Sample comment: ${evalVersion.comments[0].description.substring(0, 100)}...`);
    }
  }
  
  // 3. Test API endpoints
  console.log('\n🌐 API Endpoint Test:');
  
  const apiUrl = 'http://localhost:4000';
  const apiKey = process.env.ROAST_MY_POST_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found');
    return;
  }
  
  try {
    // Test batches endpoint
    const batchResponse = await fetch(`${apiUrl}/api/batches?type=experiment&limit=1`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    console.log(`Batches API: ${batchResponse.status}`);
    
    if (batchResponse.ok) {
      const batchData = await batchResponse.json();
      console.log(`  Found ${batchData.batches?.length || 0} batches`);
      
      if (batchData.batches?.[0]) {
        const batch = batchData.batches[0];
        console.log(`  Sample batch: ${batch.id}`);
        console.log(`  Job stats: ${JSON.stringify(batch.jobStats)}`);
      }
    }
    
  } catch (error) {
    console.log(`API Error: ${error}`);
  }
}

debugInfrastructure()
  .catch(console.error)
  .finally(() => prisma.$disconnect());