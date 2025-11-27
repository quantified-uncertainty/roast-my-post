#!/usr/bin/env tsx

/**
 * pg-boss Worker Process
 *
 * Registers workers for document evaluation jobs using pg-boss.
 * Reuses existing JobOrchestrator for job processing logic.
 * Handles scheduled tasks like Helicone cost updates.
 */

import { findWorkspaceRoot, loadWebAppEnvironment } from '../utils/workspace';

// Find workspace root and load environment variables BEFORE importing anything else
const workspaceRoot = findWorkspaceRoot(__dirname);
loadWebAppEnvironment(workspaceRoot);

import { config } from '@roast/domain';
import { JobRepository } from '@roast/db';
import { JobOrchestrator } from '../core/JobOrchestrator';
import { PgBossService } from '../core/PgBossService';
import { initializeAI } from '@roast/ai';
import { logger } from '../utils/logger';
import {
  DOCUMENT_EVALUATION_JOB,
} from '../types/jobTypes';

/**
 * Graceful shutdown handler
 */
let isShuttingDown = false;
let pgBossService: PgBossService | undefined;

async function gracefulShutdown() {
  if (isShuttingDown) {
    logger.warn('Already shutting down, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info('🛑 Graceful shutdown initiated...');

  try {
    if (pgBossService) {
      await pgBossService.shutdown();
    }
    logger.info('✅ Worker shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Main worker process
 */
async function main() {
  logger.info('🚀 Starting pg-boss worker...');

  // Initialize AI package
  logger.info('🤖 Initializing AI package...');
  initializeAI({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    heliconeApiKey: process.env.HELICONE_API_KEY,
  });

  // Initialize pg-boss
  logger.info('📦 Initializing pg-boss...');
  pgBossService = new PgBossService(logger);
  await pgBossService.initialize();

  // Create dependencies for job processing
  const jobRepository = new JobRepository();
  const jobOrchestrator = new JobOrchestrator(jobRepository, logger);

  // Register document evaluation worker
  logger.info(
    `👷 Registering workers for ${DOCUMENT_EVALUATION_JOB} (batch size: ${config.jobs.pgBoss.teamSize})...`
  );

  const batchHandler = createBatchHandler(jobRepository, jobOrchestrator);

  await pgBossService.work(
    DOCUMENT_EVALUATION_JOB,
    {
      batchSize: config.jobs.pgBoss.teamSize, // Process multiple jobs in parallel
    },
    batchHandler
  );

  // Register scheduled tasks
  await registerScheduledTasks(pgBossService);

  logger.info('✅ pg-boss worker started successfully');
  logger.info(`📊 Configuration:`);
  logger.info(`   - Team size: ${config.jobs.pgBoss.teamSize}`);
  logger.info(`   - Retry limit: ${config.jobs.pgBoss.retryLimit}`);
  logger.info(`   - Retry delay: ${config.jobs.pgBoss.retryDelay}s`);
  logger.info(`   - Retry backoff: ${config.jobs.pgBoss.retryBackoff}`);
  logger.info('🎧 Listening for jobs...');
}

/**
 * Register scheduled tasks
 */
async function registerScheduledTasks(pgBossService: PgBossService) {
  logger.info('📅 Registering scheduled tasks...');

  // Import Helicone poller
  const { updateJobCostsFromHelicone } = await import(
    '../scheduled-tasks/helicone-poller'
  );

  // Schedule Helicone cost updates every 30 seconds
  const HELICONE_POLLER_SCHEDULE = '*/30 * * * * *'; // Every 30 seconds

  await pgBossService.work(
    'helicone-cost-update',
    {
      batchSize: 1, // Process one scheduled task at a time
    },
    async (jobs: any[]) => {
      // Even for scheduled tasks, handler receives an array
      logger.info('[Scheduled] Running Helicone cost update...');
      try {
        await updateJobCostsFromHelicone();
        logger.info('[Scheduled] ✅ Helicone cost update completed');
      } catch (error) {
        logger.error('[Scheduled] ❌ Helicone cost update failed:', error);
        throw error;
      }
    }
  );

  // Schedule the job to run every 30 seconds
  await pgBossService.schedule('helicone-cost-update', HELICONE_POLLER_SCHEDULE);

  logger.info(
    `✅ Scheduled task registered: helicone-cost-update (${HELICONE_POLLER_SCHEDULE})`
  );
}

/**
 * Create a batch job handler with dependencies injected
 */
function createBatchHandler(
  jobRepository: JobRepository,
  jobOrchestrator: JobOrchestrator
) {
  return async (pgBossJobs: any[]) => {
    // pg-boss passes an array of jobs
    logger.info(`[Batch] Processing ${pgBossJobs.length} jobs`);

    // Process all jobs in the batch in parallel
    await Promise.all(
      pgBossJobs.map(async (pgBossJob: any) => {
        const { jobId } = pgBossJob.data;

        logger.info(`[Job ${jobId}] Worker picked up job`);

        try {
          // Get full job record with relations
          const job = await jobRepository.findByIdWithRelations(jobId);

          if (!job) {
            throw new Error(`Job ${jobId} not found in database`);
          }

          // Mark as running
          await jobOrchestrator.markAsRunning(jobId);

          // Process the job using existing orchestrator
          const result = await jobOrchestrator.processJob(job);

          if (!result.success) {
            throw result.error || new Error('Job processing failed');
          }

          logger.info(`[Job ${jobId}] ✅ Completed successfully`);

          // pg-boss will mark as completed automatically
        } catch (error) {
          logger.error(`[Job ${jobId}] ❌ Failed:`, error);
          // Mark job as failed in our database
          await jobOrchestrator.markAsFailed(jobId, error);
          // Re-throw so pg-boss can handle retry logic
          throw error;
        }
      })
    );
  };
}

// Run the worker
main().catch(async (error) => {
  logger.error('🔥 Fatal error:', error);
  await gracefulShutdown();
});
