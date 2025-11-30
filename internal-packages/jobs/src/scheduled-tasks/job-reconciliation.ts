/**
 * Job Reconciliation Scheduled Task
 *
 * Runs periodically to find and clean up stale jobs that may have been
 * abandoned due to worker crashes or other failures.
 *
 * A job is considered stale if:
 * - It has RUNNING status in our Job table
 * - It hasn't been updated for more than STALE_THRESHOLD_MS
 * - There's no corresponding active job in pg-boss
 */

import { prisma, JobStatus, JobRepository } from '@roast/db';
import { PgBossService } from '../core/PgBossService';
import { DOCUMENT_EVALUATION_JOB } from '../types/jobTypes';
import type { Logger } from '../types';

// Jobs are considered stale after 30 minutes without updates
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Reconcile stale jobs by checking pg-boss state and marking abandoned jobs as failed
 */
export async function reconcileStaleJobs(
  jobRepository: JobRepository,
  pgBossService: PgBossService,
  logger: Logger
): Promise<void> {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  // Find jobs that are RUNNING but haven't been updated recently
  const staleJobs = await prisma.job.findMany({
    where: {
      status: JobStatus.RUNNING,
      updatedAt: { lt: staleThreshold },
    },
    select: {
      id: true,
      updatedAt: true,
      attempts: true,
    },
  });

  if (staleJobs.length === 0) {
    return;
  }

  logger.info(`[Reconciliation] Found ${staleJobs.length} potentially stale job(s)`);

  const boss = pgBossService.getBoss();
  let reconciledCount = 0;

  for (const job of staleJobs) {
    try {
      // Check if pg-boss has this job in an active state
      // getJobById requires both queue name and job id
      const pgBossJob = await boss.getJobById(DOCUMENT_EVALUATION_JOB, job.id);

      // Job states in pg-boss: created, retry, active, completed, cancelled, failed
      const isActiveInPgBoss =
        pgBossJob &&
        (pgBossJob.state === 'created' ||
          pgBossJob.state === 'retry' ||
          pgBossJob.state === 'active');

      if (isActiveInPgBoss) {
        // Job is still active in pg-boss, don't touch it
        logger.debug(
          `[Reconciliation] Job ${job.id} is still active in pg-boss (state: ${pgBossJob.state})`
        );
        continue;
      }

      // No active pg-boss job found - mark as failed
      const staleMinutes = Math.round((Date.now() - job.updatedAt.getTime()) / 60000);
      const pgBossState = pgBossJob?.state || 'not found';

      await jobRepository.updateStatus(job.id, {
        status: JobStatus.FAILED,
        error: `Job abandoned after ${staleMinutes} minutes - pg-boss state: ${pgBossState}`,
        completedAt: new Date(),
      });

      logger.info(
        `[Reconciliation] Marked job ${job.id} as FAILED (stale for ${staleMinutes}min, pg-boss: ${pgBossState})`
      );
      reconciledCount++;
    } catch (error) {
      // Log but don't throw - continue processing other jobs
      logger.error(`[Reconciliation] Error processing job ${job.id}:`, error);
    }
  }

  if (reconciledCount > 0) {
    logger.info(`[Reconciliation] Reconciled ${reconciledCount} stale job(s)`);
  }
}
