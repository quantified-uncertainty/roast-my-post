#!/usr/bin/env tsx

import { config } from "dotenv";

// Load environment variables with proper precedence BEFORE importing Prisma
config({ path: ".env.local", override: false }); // Development
config({ path: ".env", override: false });       // Production/fallback
// System environment variables take highest precedence (already loaded)

import { JobModel } from "../models/Job";
import { logger } from "@/lib/logger";

async function main() {
  const startTime = Date.now();
  logger.info('🚀 Starting job processor...');
  
  const jobProcessor = new JobModel();

  try {
    await jobProcessor.run();
    
    const endTime = Date.now();
    console.log(`🏁 Total execution time: ${Math.round((endTime - startTime) / 1000)}s`);
  } catch (error) {
    logger.error('🔥 Fatal error:', error);
    // Give database operations time to complete before exiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(1);
  } finally {
    await jobProcessor.disconnect();
    logger.info('👋 Process exiting...');
    // Force exit to ensure the process terminates
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
