#!/usr/bin/env tsx

/**
 * Scheduled cleanup service that runs periodically
 * Can be configured with environment variables:
 * - CLEANUP_INTERVAL_MINUTES (default: 60)
 * - CLEANUP_DRY_RUN (default: false)
 */

import { prisma } from '@roast/db';
import { logger } from '@roast/web/src/lib/logger';
import { cleanupExpiredBatches } from "./cleanup-expired-batches";

// Configuration with validation
const MIN_INTERVAL = 5; // Minimum 5 minutes
const MAX_INTERVAL = 1440; // Maximum 24 hours

const INTERVAL_MINUTES = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || "60", 10);
const DRY_RUN = process.env.CLEANUP_DRY_RUN === "true";

// Validate interval
if (isNaN(INTERVAL_MINUTES) || INTERVAL_MINUTES < MIN_INTERVAL || INTERVAL_MINUTES > MAX_INTERVAL) {
  logger.error(`Invalid CLEANUP_INTERVAL_MINUTES: ${process.env.CLEANUP_INTERVAL_MINUTES}. Must be between ${MIN_INTERVAL} and ${MAX_INTERVAL}.`);
  process.exit(1);
}

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

let isRunning = false;

async function runCleanup() {
  // Prevent concurrent runs
  if (isRunning) {
    logger.warn("Cleanup already in progress, skipping this cycle");
    return;
  }

  isRunning = true;
  
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
      // Real cleanup - don't exit on complete since we're running in a loop
      const result = await cleanupExpiredBatches(false);
      logger.info("Cleanup results", result);
    }

    const duration = Date.now() - startTime;
    logger.info(`Cleanup cycle completed in ${duration}ms`);
  } catch (error) {
    logger.error("Error during scheduled cleanup", error);
    
    // If database connection failed, try to reconnect
    if (error instanceof Error && error.message.includes("connect")) {
      logger.warn("Database connection error, will retry on next cycle");
      try {
        await prisma.$disconnect();
      } catch {}
    }
  } finally {
    isRunning = false;
  }
}

// Run if called directly
if (require.main === module) {
  runScheduledCleanup();
}

export { runScheduledCleanup };