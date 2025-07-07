#!/usr/bin/env tsx

/**
 * Scheduled cleanup service that runs periodically
 * Can be configured with environment variables:
 * - CLEANUP_INTERVAL_MINUTES (default: 60)
 * - CLEANUP_DRY_RUN (default: false)
 */

import { prisma } from "../src/lib/prisma";
import { logger } from "../src/lib/logger";
import { cleanupExpiredBatches } from "./cleanup-expired-batches";

const INTERVAL_MINUTES = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || "60", 10);
const DRY_RUN = process.env.CLEANUP_DRY_RUN === "true";

async function runScheduledCleanup() {
  logger.info(`Starting scheduled cleanup service (interval: ${INTERVAL_MINUTES} minutes, dry run: ${DRY_RUN})`);

  // Run cleanup immediately on startup
  await runCleanup();

  // Schedule periodic runs
  setInterval(async () => {
    await runCleanup();
  }, INTERVAL_MINUTES * 60 * 1000);

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully");
    await prisma.$disconnect();
    process.exit(0);
  });
}

async function runCleanup() {
  try {
    const startTime = Date.now();
    logger.info("Running scheduled cleanup");

    if (DRY_RUN) {
      // Dry run mode - just report what would be deleted
      const expiredBatches = await prisma.agentEvalBatch.findMany({
        where: {
          isEphemeral: true,
          expiresAt: { lt: new Date() },
        },
        include: {
          jobs: {
            where: { status: "RUNNING" },
            select: { id: true },
          },
          ephemeralAgent: {
            select: { id: true },
          },
          ephemeralDocuments: {
            select: { id: true },
          },
        },
      });

      logger.info(`[DRY RUN] Would process ${expiredBatches.length} expired batches`);
      
      for (const batch of expiredBatches) {
        const wouldDelete = batch.jobs.length === 0;
        logger.info(`[DRY RUN] Batch ${batch.id} (${batch.trackingId})`, {
          wouldDelete,
          runningJobs: batch.jobs.length,
          ephemeralAgent: batch.ephemeralAgent?.id,
          ephemeralDocuments: batch.ephemeralDocuments.length,
          expiresAt: batch.expiresAt,
        });
      }
    } else {
      // Real cleanup
      await cleanupExpiredBatches();
    }

    const duration = Date.now() - startTime;
    logger.info(`Cleanup cycle completed in ${duration}ms`);
  } catch (error) {
    logger.error("Error during scheduled cleanup", error);
  }
}

// Run if called directly
if (require.main === module) {
  runScheduledCleanup();
}

export { runScheduledCleanup };