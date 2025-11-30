/**
 * Job Reconciliation Service
 *
 * Finds and cleans up stale jobs abandoned due to worker crashes.
 */

import { JobStatus, JobRepository } from '@roast/db';
import { PgBossService } from '../core/PgBossService';
import { DOCUMENT_EVALUATION_JOB } from '../types/jobTypes';
import type { Logger } from '../types';
import { PgBoss } from 'pg-boss';

const STALE_THRESHOLDS = {
  RUNNING: 30 * 60 * 1000, // 30 minutes
  PENDING: 10 * 60 * 1000, // 10 minutes
} as const;

const ACTIVE_PG_BOSS_STATES = ['created', 'retry', 'active'] as const;
type PgBossState = typeof ACTIVE_PG_BOSS_STATES[number];

interface StaleJob {
  id: string;
  pgBossJobId: string | null;
  status: JobStatus;
  updatedAt: Date;
}

export class JobReconciliationService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly pgBossService: PgBossService,
    private readonly logger: Logger
  ) {}

  async reconcileStaleJobs(): Promise<void> {
    const boss = this.pgBossService.getBoss();
  
    let totalReconciled = 0;

    const criteria = [
      { status: JobStatus.RUNNING, thresholdMs: STALE_THRESHOLDS.RUNNING },
      { status: JobStatus.PENDING, thresholdMs: STALE_THRESHOLDS.PENDING },
    ];

    const staleJobs = await this.jobRepository.findStaleJobs(criteria);

    if (staleJobs.length > 0) {
      this.logger.info(`[Reconciliation] Found ${staleJobs.length} stale job(s)`);
      
      for (const job of staleJobs) {
        try {
          if (await this.shouldMarkFailed(boss, job)) {
            await this.markJobFailed(job);
            totalReconciled++;
          }
        } catch (error) {
          this.logger.error(`[Reconciliation] Error processing job ${job.id}:`, error);
        }
      }
    }

    if (totalReconciled > 0) {
      this.logger.info(`[Reconciliation] Reconciled ${totalReconciled} stale job(s)`);
    }
  }

  private async shouldMarkFailed(boss: PgBoss, job: StaleJob): Promise<boolean> {
    // If there is no pg-boss ID, the job is definitely lost/orphaned
    if (!job.pgBossJobId) {
      return true;
    }

    const pgBossJob = await boss.getJobById(DOCUMENT_EVALUATION_JOB, job.pgBossJobId);

    // If pg-boss doesn't know about this job (e.g. expired/archived), it's considered failed
    if (!pgBossJob) {
      return true;
    }

    // Check if the job is still in an active state in the queue
    const isJobActive = ACTIVE_PG_BOSS_STATES.includes(pgBossJob.state as PgBossState);

    // If it's not active in the queue but still marked as RUNNING/PENDING in our DB,
    // we should mark it as failed.
    return !isJobActive;
  }

  private async markJobFailed(
    job: StaleJob
  ): Promise<void> {
    const staleMinutes = Math.round((Date.now() - job.updatedAt.getTime()) / 60000);
    const reason = job.pgBossJobId ? 'pg-boss job not active' : 'no pg-boss job ID';

    await this.jobRepository.updateStatus(job.id, {
      status: JobStatus.FAILED,
      error: `Job stuck in ${job.status} for ${staleMinutes}min - ${reason}`,
      completedAt: new Date(),
    });

    this.logger.info(`[Reconciliation] Marked ${job.status} job ${job.id} as FAILED (${reason})`);
  }
}
