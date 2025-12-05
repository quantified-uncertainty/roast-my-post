/**
 * pg-boss Service
 *
 * Simple wrapper around pg-boss for job queue management.
 * Provides singleton instance and clean APIs for job operations.
 */

import { PgBoss } from 'pg-boss';
import type { WorkOptions, WorkHandler, WorkWithMetadataHandler, SendOptions } from 'pg-boss';
import { config } from '@roast/domain';
import type { Logger } from '../types';

/**
 * pg-boss Service
 * Manages pg-boss instance and job operations
 */
export class PgBossService {
  private boss: PgBoss | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private logger: Logger) {}

  /**
   * Initialize pg-boss instance
   */
  async initialize(): Promise<void> {
    if (this.boss) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.logger.info('Initializing pg-boss...');

        // TODO: Properly configure SSL with CA cert from K8s secrets
        // For now, disable SSL until DATABASE_CA_CERT is set up
        // See: https://docs.digitalocean.com/reference/terraform/reference/data-sources/database_ca/
        const caCert = process.env.DATABASE_CA_CERT;
        let sslConfig: { rejectUnauthorized: boolean; ca?: string } | false | undefined;
        let connectionString = config.database.url;

        if (config.env.isDevelopment) {
          this.logger.info('Development mode: SSL disabled');
          sslConfig = undefined;
        } else if (caCert) {
          const certPreview = caCert.substring(0, 50) + '...';
          this.logger.info(`Using DATABASE_CA_CERT for SSL (${caCert.length} chars): ${certPreview}`);
          sslConfig = { rejectUnauthorized: true, ca: caCert };
        } else {
          // TEMP WORKAROUND: Use sslmode=no-verify until CA cert is configured in K8s
          this.logger.warn('DATABASE_CA_CERT not found, using sslmode=no-verify (temporary workaround)');
          sslConfig = { rejectUnauthorized: false };
          // Replace sslmode=require with sslmode=no-verify to skip cert validation
          connectionString = connectionString.replace(/sslmode=require/, 'sslmode=no-verify');
        }

        const boss = new PgBoss({
          connectionString,
          ssl: sslConfig,
          // Configure cron worker interval for scheduled tasks
          // cronWorkerIntervalSeconds: how often cron jobs are actually executed
          // cronMonitorIntervalSeconds: how often to check if cron jobs are due (default: 30s)
          // Note: If changing cronWorkerIntervalSeconds to something other than 30s,
          // also set cronMonitorIntervalSeconds to match for proper scheduling
          cronWorkerIntervalSeconds: config.jobs.pgBoss.cronWorkerIntervalSeconds,
        });

        await boss.start();

        this.boss = boss;

        // Create queues with policies
        await this.createQueues();

        this.logger.info('pg-boss initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize pg-boss:', error);
        this.initPromise = null;
        throw new Error(
          `pg-boss initialization failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })();

    return this.initPromise;
  }

  /**
   * Get the pg-boss instance
   */
  getBoss(): PgBoss {
    if (!this.boss) {
      throw new Error('pg-boss not initialized. Call PgBossService.initialize() first.');
    }
    return this.boss;
  }

  /**
   * Shutdown pg-boss gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.boss) {
      return;
    }

    try {
      this.logger.info('Shutting down pg-boss...');
      await this.boss.stop();
      this.logger.info('pg-boss shut down successfully');
      this.boss = null;
    } catch (error) {
      this.logger.error('Error shutting down pg-boss:', error);
      throw error;
    }
  }
  /**
   * Send a job to the queue
   * Note: Retry and expiration config is set at queue level in createQueues()
   */
  async send<T extends object>(queue: string, data: T, options: SendOptions = {}): Promise<string | null> {
    const boss = this.getBoss();

    try {
      const jobId = await boss.send(queue, data, options);

      this.logger.info(`Sent job to queue ${queue} with ID ${jobId}`);
      return jobId;
    } catch (error) {
      this.logger.error(`Failed to send job to queue ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancel(queue: string, jobId: string): Promise<void> {
    const boss = this.getBoss();

    try {
      await boss.cancel(queue, jobId);
      this.logger.info(`Cancelled pg-boss job ${jobId} in queue ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to cancel pg-boss job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Register a worker for a queue.
   * Call multiple times to create multiple concurrent workers.
   * Handler receives array with 1 job by default (batchSize=1).
   */
  async work<T>(
    name: string,
    options: WorkOptions & { includeMetadata: true },
    handler: WorkWithMetadataHandler<T>
  ): Promise<string>;
  async work<T>(
    name: string,
    options: WorkOptions,
    handler: WorkHandler<T>
  ): Promise<string>;
  async work<T>(
    name: string,
    options: WorkOptions,
    handler: WorkHandler<T> | WorkWithMetadataHandler<T>
  ): Promise<string> {
    const boss = this.getBoss();
    return await boss.work(name, options, handler as WorkHandler<T>);
  }

  /**
   * Explicitly fail a job (still allows retries based on retryLimit)
   */
  async fail(queue: string, jobId: string, error?: unknown): Promise<void> {
    const boss = this.getBoss();
    const errorData = error instanceof Error ? { message: error.message } : { message: String(error) };
    await boss.fail(queue, jobId, errorData);
  }

  /**
   * Complete a job - use for non-retryable errors to prevent pg-boss from retrying.
   * Marks the job as "completed" in pg-boss so it won't be picked up again.
   */
  async complete(queue: string, jobId: string, data?: object): Promise<void> {
    const boss = this.getBoss();
    await boss.complete(queue, jobId, data);
  }

  /**
   * Schedule a job
   */
  async schedule(name: string, cron: string): Promise<void> {
    const boss = this.getBoss();
    await boss.schedule(name, cron);
  }

  /**
   * Create queues with appropriate policies
   * Called during initialization to set up queue behavior
   */
  private async createQueues(): Promise<void> {
    const boss = this.getBoss();

    // Document evaluation queue - standard policy with retry config from config
    await boss.createQueue('document-evaluation', {
      policy: 'standard',
      retryLimit: config.jobs.pgBoss.retryLimit,
      retryDelay: config.jobs.pgBoss.retryDelay,
      retryBackoff: config.jobs.pgBoss.retryBackoff,
      expireInSeconds: config.jobs.pgBoss.expireInSeconds,
    });

    // Helicone cost update - exclusive policy to prevent overlapping runs
    // If a scheduled job is already running, skip the next trigger
    await boss.createQueue('helicone-cost-update', {
      policy: 'exclusive',
    });

    // Job reconciliation - exclusive policy to prevent overlapping runs
    // Cleans up stale jobs that may have been abandoned due to worker crashes
    await boss.createQueue('job-reconciliation', {
      policy: 'exclusive',
    });

    this.logger.info('Created job queues with policies');
  }
}
