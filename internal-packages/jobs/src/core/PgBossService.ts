/**
 * pg-boss Service
 *
 * Simple wrapper around pg-boss for job queue management.
 * Provides singleton instance and clean APIs for job operations.
 */

import { PgBoss } from 'pg-boss';
import { config } from '@roast/domain';
import type { Logger } from '../types';

/**
 * pg-boss Service
 * Manages pg-boss instance and job operations
 */
export class PgBossService {
  private boss: PgBoss | null = null;

  constructor(private logger: Logger) {}

  /**
   * Initialize pg-boss instance
   */
  async initialize(): Promise<void> {
    if (this.boss) {
      this.logger.warn('pg-boss already initialized');
      return;
    }

    try {
      this.logger.info('Initializing pg-boss...');

      this.boss = new PgBoss({
        connectionString: config.database.url,
        // Configure cron worker interval for scheduled tasks
        // cronWorkerIntervalSeconds: how often cron jobs are actually executed
        // cronMonitorIntervalSeconds: how often to check if cron jobs are due (default: 30s)
        // Note: If changing cronWorkerIntervalSeconds to something other than 30s,
        // also set cronMonitorIntervalSeconds to match for proper scheduling
        cronWorkerIntervalSeconds: config.jobs.pgBoss.cronWorkerIntervalSeconds,
      });

      await this.boss.start();

      this.logger.info('pg-boss initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize pg-boss:', error);
      throw new Error(
        `pg-boss initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
   */
  async send(queue: string, data: any, options: any = {}): Promise<string | null> {
    const boss = this.getBoss();

    try {
      const jobId = await boss.send(queue, data, {
        retryLimit: config.jobs.pgBoss.retryLimit,
        retryDelay: config.jobs.pgBoss.retryDelay,
        retryBackoff: config.jobs.pgBoss.retryBackoff,
        expireInSeconds: 60 * 60, // 1 hour expiration
        ...options,
      });

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
   * Register a worker for a queue
   */
  async work(name: string, options: any, handler: (jobs: any[]) => Promise<void>): Promise<void> {
    const boss = this.getBoss();
    await boss.work(name, options, handler);
  }

  /**
   * Schedule a job
   */
  async schedule(name: string, cron: string): Promise<void> {
    const boss = this.getBoss();
    await boss.schedule(name, cron);
  }
}
