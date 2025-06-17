#!/usr/bin/env tsx

import { JobModel } from "../models/Job";

async function main() {
  const startTime = Date.now();
  console.log("🚀 Starting job processor...");
  
  const jobProcessor = new JobModel();

  try {
    await jobProcessor.run();
    
    const endTime = Date.now();
    console.log(`🏁 Total execution time: ${Math.round((endTime - startTime) / 1000)}s`);
  } catch (error) {
    console.error("🔥 Fatal error:", error);
    process.exit(1);
  } finally {
    await jobProcessor.disconnect();
    console.log("👋 Process exiting...");
    // Force exit to ensure the process terminates
    process.exit(0);
  }
}

// Run the job processor
main().catch((error) => {
  console.error("🔥 Fatal error:", error);
  process.exit(1);
});
