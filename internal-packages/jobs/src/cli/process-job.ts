#!/usr/bin/env tsx

import { findWorkspaceRoot, loadWebAppEnvironment } from '../utils/workspace';

// Find workspace root and load environment variables BEFORE importing anything else
const workspaceRoot = findWorkspaceRoot(__dirname);
loadWebAppEnvironment(workspaceRoot);

import { JobRepository } from '@roast/db/cli';
import { JobService } from '../core/JobService';
import { JobOrchestrator } from '../core/JobOrchestrator';
import { initializeAI } from '@roast/ai';
import { logger } from '../utils/logger';

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting job processor...');
  
  // Initialize AI package with environment variables
  initializeAI({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    heliconeApiKey: process.env.HELICONE_API_KEY,
  });
  
  // Create services
  const jobRepository = new JobRepository();
  const jobService = new JobService(jobRepository, logger);
  const jobOrchestrator = new JobOrchestrator(jobService, logger);
  
  let hasProcessedJob = false;

  try {
    hasProcessedJob = await jobOrchestrator.run();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (hasProcessedJob) {
      console.log(`✅ Job completed successfully`);
      console.log(`🏁 Total execution time: ${duration}s`);
    } else {
      console.log(`💤 No pending jobs found (checked in ${duration}s)`);
    }
  } catch (error) {
    console.error('🔥 Fatal error:', error);
    console.error('💥 Process failed with error:', error instanceof Error ? error.message : String(error));
    // Give database operations time to complete before exiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(1);
  } finally {
    try {
      // Graceful shutdown - Prisma will disconnect automatically
      console.log('👋 Process exiting cleanly...');
    } catch (disconnectError) {
      console.warn('⚠️  Error during shutdown:', disconnectError);
    }
    // Exit with 0 to indicate success
    process.exit(0);
  }
}

// Run the job processor
main().catch(async (error) => {
  console.error('🔥 Fatal error:', error);
  // Give database operations time to complete before exiting
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(1);
});