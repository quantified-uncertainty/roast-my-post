#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables with proper precedence BEFORE importing Prisma
// Note: When run via npm script from apps/web, we need to go up to root
config({ path: "../../.env.local", override: false }); // Development (workspace root)
config({ path: "../../.env", override: false });        // Production/fallback (workspace root)
// System environment variables take highest precedence (already loaded)

import { JobModel } from "../models/Job";
import { logger } from "@/infrastructure/logging/logger";
import { initializeAIPackage } from "../lib/ai-init";

async function main() {
  const startTime = Date.now();
  logger.info('🚀 Starting job processor...');
  
  // Initialize AI package with environment variables
  initializeAIPackage();
  
  const jobProcessor = new JobModel();
  let hasProcessedJob = false;

  try {
    hasProcessedJob = await jobProcessor.run();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (hasProcessedJob) {
      console.log(`✅ Job completed successfully`);
      console.log(`🏁 Total execution time: ${duration}s`);
    } else {
      console.log(`💤 No pending jobs found (checked in ${duration}s)`);
    }
  } catch (error) {
    logger.error('🔥 Fatal error:', error);
    console.error('💥 Process failed with error:', error instanceof Error ? error.message : String(error));
    // Give database operations time to complete before exiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(1);
  } finally {
    try {
      await jobProcessor.disconnect();
      logger.info('👋 Process exiting cleanly...');
    } catch (disconnectError) {
      console.warn('⚠️  Error during disconnect:', disconnectError);
    }
    // Exit with 0 to indicate success
    process.exit(0);
  }
}

// Run the job processor
main().catch(async (error) => {
  logger.error('🔥 Fatal error:', error);
  // Give database operations time to complete before exiting
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(1);
});
