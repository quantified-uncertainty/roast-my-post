/**
 * Job Reconciliation Scheduled Task
 *
 * Runs periodically to find and clean up stale jobs that may have been
 * abandoned due to worker crashes or other failures.
 *
 * Handles two cases:
 * 1. RUNNING jobs - Worker crashed mid-processing
 * 2. PENDING jobs - Worker crashed before marking as running, or pg-boss job failed to start
 */

import { prisma, JobStatus, JobRepository } from '@roast/db';
import { PgBossService } from '../core/PgBossService';
import { DOCUMENT_EVALUATION_JOB } from '../types/jobTypes';
import type { Logger } from '../types';

// RUNNING jobs are stale after 30 minutes
const RUNNING_STALE_THRESHOLD_MS = 30 * 60 * 1000;

// PENDING jobs are stale after 10 minutes (allows for queue backlog)
const PENDING_STALE_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Reconcile stale jobs by checking pg-boss state and marking abandoned jobs as failed
 */
export async function reconcileStaleJobs(
  jobRepository: JobRepository,
  pgBossService: PgBossService,
  logger: Logger
): Promise<void> {
  const boss = pgBossService.getBoss();

  const runningCount = await reconcileStaleRunningJobs(jobRepository, boss, logger);
  const pendingCount = await reconcileStalePendingJobs(jobRepository, boss, logger);

  const total = runningCount + pendingCount;
  if (total > 0) {
    logger.info(`[Reconciliation] Reconciled ${total} stale job(s)`);
  }
}

async function reconcileStaleRunningJobs(
  jobRepository: JobRepository,
  boss: ReturnType<PgBossService['getBoss']>,
  logger: Logger
): Promise<number> {
  const threshold = new Date(Date.now() - RUNNING_STALE_THRESHOLD_MS);

  const staleJobs = await prisma.job.findMany({
    where: {
      status: JobStatus.RUNNING,
      updatedAt: { lt: threshold },
    },
    select: { id: true, updatedAt: true },
  });

  if (staleJobs.length === 0) return 0;

  logger.info(`[Reconciliation] Found ${staleJobs.length} stale RUNNING job(s)`);

  let count = 0;
  for (const job of staleJobs) {
    if (await reconcileJob(jobRepository, boss, job, 'RUNNING', logger)) {
      count++;
    }
  }
  return count;
}

async function reconcileStalePendingJobs(
  jobRepository: JobRepository,
  boss: ReturnType<PgBossService['getBoss']>,
  logger: Logger
): Promise<number> {
  const threshold = new Date(Date.now() - PENDING_STALE_THRESHOLD_MS);

  const staleJobs = await prisma.job.findMany({
    where: {
      status: JobStatus.PENDING,
      updatedAt: { lt: threshold },
    },
    select: { id: true, updatedAt: true },
  });

  if (staleJobs.length === 0) return 0;

  logger.info(`[Reconciliation] Found ${staleJobs.length} stale PENDING job(s)`);

  let count = 0;
  for (const job of staleJobs) {
    if (await reconcileJob(jobRepository, boss, job, 'PENDING', logger)) {
      count++;
    }
  }
  return count;
}

async function reconcileJob(
  jobRepository: JobRepository,
  boss: ReturnType<PgBossService['getBoss']>,
  job: { id: string; updatedAt: Date },
  status: string,
  logger: Logger
): Promise<boolean> {
  try {
    const pgBossJob = await boss.getJobById(DOCUMENT_EVALUATION_JOB, job.id);

    // Job states in pg-boss: created, retry, active, completed, cancelled, failed
    const isActiveInPgBoss =
      pgBossJob &&
      (pgBossJob.state === 'created' || pgBossJob.state === 'retry' || pgBossJob.state === 'active');

    if (isActiveInPgBoss) {
      logger.debug(`[Reconciliation] Job ${job.id} still active in pg-boss (${pgBossJob.state})`);
      return false;
    }

    const staleMinutes = Math.round((Date.now() - job.updatedAt.getTime()) / 60000);
    const pgBossState = pgBossJob?.state || 'not found';

    await jobRepository.updateStatus(job.id, {
      status: JobStatus.FAILED,
      error: `Job stuck in ${status} for ${staleMinutes}min - pg-boss: ${pgBossState}`,
      completedAt: new Date(),
    });

    logger.info(`[Reconciliation] Marked ${status} job ${job.id} as FAILED (pg-boss: ${pgBossState})`);
    return true;
  } catch (error) {
    logger.error(`[Reconciliation] Error processing job ${job.id}:`, error);
    return false;
  }
}
