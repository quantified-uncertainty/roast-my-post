#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { logger } from "../src/lib/logger";

/**
 * Cleanup job for expired ephemeral batches
 * This job:
 * 1. Finds all expired ephemeral batches
 * 2. Checks if they have any running jobs
 * 3. Deletes them if safe (cascade deletes related resources)
 */
async function cleanupExpiredBatches() {
  const startTime = Date.now();
  logger.info("Starting cleanup of expired ephemeral batches");

  try {
    // Find expired ephemeral batches
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

    logger.info(`Found ${expiredBatches.length} expired ephemeral batches`);

    let deletedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ batchId: string; error: string }> = [];

    // Process each expired batch
    for (const batch of expiredBatches) {
      try {
        // Skip if there are running jobs
        if (batch.jobs.length > 0) {
          logger.warn(
            `Skipping batch ${batch.id} (trackingId: ${batch.trackingId}) - has ${batch.jobs.length} running jobs`
          );
          skippedCount++;
          continue;
        }

        // Log what will be deleted
        logger.info(`Deleting batch ${batch.id} (trackingId: ${batch.trackingId})`, {
          ephemeralAgent: batch.ephemeralAgent?.id,
          ephemeralDocumentCount: batch.ephemeralDocuments.length,
          expiresAt: batch.expiresAt,
        });

        // Delete the batch (cascade will handle related resources)
        await prisma.agentEvalBatch.delete({
          where: { id: batch.id },
        });

        deletedCount++;
        logger.info(`Successfully deleted batch ${batch.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to delete batch ${batch.id}: ${errorMessage}`);
        errors.push({ batchId: batch.id, error: errorMessage });
      }
    }

    const duration = Date.now() - startTime;
    
    // Summary
    logger.info("Cleanup completed", {
      duration: `${duration}ms`,
      found: expiredBatches.length,
      deleted: deletedCount,
      skipped: skippedCount,
      errors: errors.length,
    });

    if (errors.length > 0) {
      logger.error("Cleanup encountered errors", { errors });
    }

    // Exit with appropriate code
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (error) {
    logger.error("Fatal error during cleanup", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupExpiredBatches();
}

export { cleanupExpiredBatches };