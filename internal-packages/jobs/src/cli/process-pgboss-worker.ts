#!/usr/bin/env tsx

/**
 * pg-boss Worker Process
 *
 * Registers workers for document evaluation jobs using pg-boss.
 * Reuses existing JobOrchestrator for job processing logic.
 * Handles scheduled tasks like Helicone cost updates and job reconciliation.
 */

import { findWorkspaceRoot, loadWebAppEnvironment } from '../utils/workspace';

// Find workspace root and load environment variables BEFORE importing anything else
const workspaceRoot = findWorkspaceRoot(__dirname);
loadWebAppEnvironment(workspaceRoot);

// Default AI log level to 'warn' in worker to reduce noise
process.env.AI_LOG_LEVEL ??= 'warn';

import { config } from '@roast/domain';
import { JobRepository } from '@roast/db';
import { JobOrchestrator } from '../core/JobOrchestrator';
import { JobService } from '../core/JobService';
import { PgBossService } from '../core/PgBossService';
import { initializeAI } from '@roast/ai';
import { initWorkerContext, runWithJobContext, JobTimeoutError, getWorkerId } from '@roast/ai/server';
import { logger } from '../utils/logger';
import { DOCUMENT_EVALUATION_JOB, type DocumentEvaluationJobData } from '../types/jobTypes';
import type { JobWithMetadata } from 'pg-boss';
import { isRetryableError } from '../errors/retryableErrors';
import { getAgentTimeout, formatTimeout } from '../config/agentTimeouts';
import { updateJobCostsFromHelicone } from '../scheduled-tasks/helicone-poller';
import { JobReconciliationService } from '../scheduled-tasks/job-reconciliation';

// Schedule constants
const HELICONE_POLLER_SCHEDULE = '*/30 * * * * *'; // Every 30 seconds
const JOB_RECONCILIATION_SCHEDULE = '0 * * * * *'; // Every minute

class PgBossWorker {
  private pgBossService: PgBossService;
  private jobRepository: JobRepository;
  private jobService: JobService;
  private jobOrchestrator: JobOrchestrator;
  private jobReconciliationService: JobReconciliationService;
  private isShuttingDown = false;

  constructor() {
    this.pgBossService = new PgBossService(logger);
    this.jobRepository = new JobRepository();
    this.jobService = new JobService(this.jobRepository, logger, this.pgBossService);
    this.jobOrchestrator = new JobOrchestrator(this.jobRepository, logger, this.jobService);
    this.jobReconciliationService = new JobReconciliationService(this.jobRepository, this.pgBossService, logger);
  }

  public async start() {
    logger.info('🚀 Starting pg-boss worker...');

    // Initialize worker context for logging (generates worker ID)
    initWorkerContext();

    this.initializeAI();
    await this.initializePgBoss();
    await this.registerDocumentEvaluationWorker();
    await this.registerScheduledTasks();

    this.logStartupComplete();
  }

  public async shutdown() {
    if (this.isShuttingDown) {
      logger.warn('Already shutting down, forcing exit...');
      process.exit(1);
    }

    this.isShuttingDown = true;
    logger.info('🛑 Graceful shutdown initiated...');

    try {
      await this.pgBossService.shutdown();
      logger.info('✅ Worker shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  private initializeAI() {
    logger.info('🤖 Initializing AI package...');
    initializeAI({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      heliconeApiKey: process.env.HELICONE_API_KEY,
    });
  }

  private async initializePgBoss() {
    logger.info('📦 Initializing pg-boss...');
    await this.jobService.initialize();
  }

  private async registerDocumentEvaluationWorker() {
    logger.info(
      `👷 Registering worker for ${DOCUMENT_EVALUATION_JOB} (batch size: ${config.jobs.pgBoss.teamSize})...`
    );

    await this.pgBossService.work(
      DOCUMENT_EVALUATION_JOB,
      { batchSize: config.jobs.pgBoss.teamSize, includeMetadata: true },
      this.handleBatch
    );
  }

  private async registerScheduledTasks() {
    logger.info('📅 Registering scheduled tasks...');

    // Helicone cost updates
    await this.pgBossService.work('helicone-cost-update', { batchSize: 1 }, async () => {
      await updateJobCostsFromHelicone();
    });
    await this.pgBossService.schedule('helicone-cost-update', HELICONE_POLLER_SCHEDULE);
    logger.info(`✅ Scheduled: helicone-cost-update (${HELICONE_POLLER_SCHEDULE})`);

    // Job reconciliation
    await this.pgBossService.work('job-reconciliation', { batchSize: 1 }, async () => {
      await this.jobReconciliationService.reconcileStaleJobs();
    });
    await this.pgBossService.schedule('job-reconciliation', JOB_RECONCILIATION_SCHEDULE);
    logger.info(`✅ Scheduled: job-reconciliation (${JOB_RECONCILIATION_SCHEDULE})`);
  }

  private logStartupComplete() {
    logger.info('✅ pg-boss worker started successfully');
    logger.info(`📊 Configuration:`);
    logger.info(`   - Team size: ${config.jobs.pgBoss.teamSize}`);
    logger.info(`   - Retry limit: ${config.jobs.pgBoss.retryLimit}`);
    logger.info(`   - Retry delay: ${config.jobs.pgBoss.retryDelay}s`);
    logger.info(`   - Retry backoff: ${config.jobs.pgBoss.retryBackoff}`);
    logger.info('🎧 Listening for jobs...');
  }

  private handleBatch = async (pgBossJobs: JobWithMetadata<DocumentEvaluationJobData>[]) => {
    logger.info(`[pg-boss Worker] Processing batch of ${pgBossJobs.length} job(s)`);
    const jobPromises = pgBossJobs.map((job) => this.processJob(job));
    const results = await Promise.allSettled(jobPromises);

    // Re-throw retryable errors so pg-boss can schedule retries
    // Promise.allSettled swallows exceptions, so we need to propagate them manually
    for (const result of results) {
      if (result.status === 'rejected' && isRetryableError(result.reason)) {
        throw result.reason;
      }
    }
  };

  private formatLog(jobId: string, message: string): string {
    const workerId = getWorkerId();
    const workerPrefix = workerId ? `[Worker ${workerId}] ` : '';
    return `${workerPrefix}[Job ${jobId}] ${message}`;
  }

  private getJobTimeout(job: any): number {
    const agentVersion = job.evaluation.agent.versions[0];
    return getAgentTimeout(agentVersion?.extendedCapabilityId ?? undefined);
  }

  private async processJob(pgBossJob: JobWithMetadata<DocumentEvaluationJobData>) {
    const { jobId } = pgBossJob.data;
    const { retryCount, retryLimit } = pgBossJob;

    logger.info(this.formatLog(jobId, `Processing (attempt ${retryCount + 1}/${retryLimit + 1})`));

    try {
      const job = await this.jobRepository.findByIdWithRelations(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in database`);
      }

      await this.jobService.markAsRunning(jobId, retryCount + 1);

            // Get timeout based on agent capability
      const timeoutMs = this.getJobTimeout(job);


      // Run with job context (sets job ID and timeout for logging and timeout checks)
      const result = await runWithJobContext(
        { jobId, timeoutMs },
        () => this.jobOrchestrator.processJob(job)
      );

      if (!result.success) {
        throw result.error || new Error('Job processing failed');
      }

      logger.info(this.formatLog(jobId, '✅ Completed successfully'));
    } catch (error) {
      await this.handleJobError(jobId, pgBossJob.id, error, retryCount, retryLimit);
    }
  }

  private async handleJobError(
    jobId: string,
    pgBossJobId: string,
    error: unknown,
    retryCount: number,
    retryLimit: number
  ) {
    logger.error(this.formatLog(jobId, '❌ Failed:'), error);

    // Job timeout errors are not retryable - fail immediately
    if (error instanceof JobTimeoutError) {
      logger.warn(this.formatLog(jobId, 'Timed out - marking as FAILED (non-retryable)'));
      await this.jobService.markAsFailed(jobId, error);
      await this.pgBossService.fail(DOCUMENT_EVALUATION_JOB, pgBossJobId, error);
      return;
    }

    const isTransient = isRetryableError(error);
    const hasRetriesLeft = retryCount < retryLimit;

    if (isTransient && hasRetriesLeft) {
      logger.info(this.formatLog(jobId, `Transient error, will retry (${retryCount + 1}/${retryLimit + 1})`));
      throw error; // Let pg-boss handle retry
    }

    // Final failure
    const reason = !isTransient ? 'non-retryable error' : `max retries (${retryLimit}) exhausted`;
    logger.info(this.formatLog(jobId, `Marking as FAILED: ${reason}`));

    await this.jobService.markAsFailed(jobId, error);
    await this.pgBossService.fail(DOCUMENT_EVALUATION_JOB, pgBossJobId, error);
  }
}

// Bootstrap
const worker = new PgBossWorker();

process.on('SIGTERM', () => worker.shutdown());
process.on('SIGINT', () => worker.shutdown());

worker.start().catch(async (error) => {
  logger.error('🔥 Fatal error:', error);
  await worker.shutdown();
});
