#!/usr/bin/env tsx

import { JobModel } from "../models/Job";

async function main() {
  const jobProcessor = new JobModel();
  
  try {
    await jobProcessor.run();
  } catch (error) {
    console.error("🔥 Fatal error:", error);
    process.exit(1);
  } finally {
    await jobProcessor.disconnect();
  }
}

// Run the job processor
main();