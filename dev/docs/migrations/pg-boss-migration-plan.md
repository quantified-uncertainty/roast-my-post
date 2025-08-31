# pg-boss Migration Plan - Complete Implementation Guide

## Executive Summary
This document provides a comprehensive, actionable plan for migrating RoastMyPost's custom job queue system to pg-boss. The migration will resolve critical operational issues including worker crashes, memory inefficiency, and lack of proper queue semantics while maintaining full backward compatibility during transition.

## Current State Analysis

### Pain Points to Address
1. **Process Management**: Each job spawns new Node process (50-100MB RAM), workers crash after completion
2. **Queue Limitations**: Database polling (1000ms), no priorities/delays, manual retry logic
3. **Observability**: Basic console logging, no metrics/dashboards
4. **Scale Issues**: Limited to 20 concurrent workers, no backpressure control

### Components to Migrate
- **@roast/jobs package**: JobService, JobRepository, JobOrchestrator
- **Worker processes**: process-job.ts, process-adaptive.ts
- **API endpoints**: 11 files in apps/web/src using job creation
- **MCP server**: Job queue status endpoint
- **Database**: Job table and related schemas

## Phase 1: Foundation Setup (Week 1)

### 1.1 Install Dependencies
```bash
# Core packages
pnpm add pg-boss@^10.0.0 --filter @roast/jobs
pnpm add @types/pg-boss --filter @roast/jobs -D

# Monitoring dependencies
pnpm add prom-client@^15.0.0 --filter @roast/jobs
```

### 1.2 Create pg-boss Configuration
**File**: `internal-packages/jobs/src/pgboss/config.ts`
```typescript
import PgBoss from 'pg-boss';
import { z } from 'zod';

const pgBossConfigSchema = z.object({
  connectionString: z.string(),
  schema: z.string().default('pgboss'),
  monitorStateIntervalSeconds: z.number().default(30),
  maintenanceIntervalSeconds: z.number().default(120),
  archiveCompletedAfterSeconds: z.number().default(86400), // 24 hours
  deleteAfterDays: z.number().default(7),
  retryLimit: z.number().default(3),
  retryDelay: z.number().default(30),
  retryBackoff: z.boolean().default(true),
  expireInSeconds: z.number().default(3600), // 1 hour default timeout
});

export function createPgBossConfig() {
  return pgBossConfigSchema.parse({
    connectionString: process.env.DATABASE_URL,
    schema: 'pgboss',
    // Production-ready settings
    monitorStateIntervalSeconds: 30,
    maintenanceIntervalSeconds: 120,
    archiveCompletedAfterSeconds: 86400,
    deleteAfterDays: 7,
  });
}
```

### 1.3 Create Type-Safe Job Definitions
**File**: `internal-packages/jobs/src/pgboss/types.ts`
```typescript
import { z } from 'zod';

// Job payload schemas
export const evaluationJobSchema = z.object({
  evaluationId: z.string(),
  documentId: z.string(),
  agentId: z.string(),
  agentVersionId: z.string(),
  priority: z.number().min(0).max(10).default(5),
  timeout: z.number().optional(),
  heliconeSessionId: z.string().optional(),
});

export const batchJobSchema = z.object({
  batchId: z.string(),
  evaluationIds: z.array(z.string()),
  targetCount: z.number(),
});

export const importJobSchema = z.object({
  url: z.string().url(),
  documentId: z.string().optional(),
  agentIds: z.array(z.string()).optional(),
});

// Job type registry
export const JOB_TYPES = {
  EVALUATION: 'evaluation',
  BATCH: 'batch',
  IMPORT: 'import',
  CLEANUP: 'cleanup',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

// Type-safe job payloads
export type EvaluationJob = z.infer<typeof evaluationJobSchema>;
export type BatchJob = z.infer<typeof batchJobSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;

export type JobPayload = EvaluationJob | BatchJob | ImportJob;
```

### 1.4 Create JobManager Wrapper
**File**: `internal-packages/jobs/src/pgboss/JobManager.ts`
```typescript
import PgBoss from 'pg-boss';
import { createPgBossConfig } from './config';
import { JOB_TYPES, type JobPayload, evaluationJobSchema, batchJobSchema, importJobSchema } from './types';
import { logger } from '../utils/logger';
import { MetricsCollector } from './metrics';

export class JobManager {
  private boss: PgBoss;
  private metrics: MetricsCollector;
  private isStarted = false;
  private handlers = new Map<string, (job: PgBoss.Job) => Promise<void>>();

  constructor() {
    const config = createPgBossConfig();
    this.boss = new PgBoss(config);
    this.metrics = new MetricsCollector();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.boss.on('error', (error) => {
      logger.error('pg-boss error', { error });
      this.metrics.incrementError('pgboss_error');
    });

    this.boss.on('job-created', (job) => {
      logger.info('Job created', { jobId: job.id, type: job.name });
      this.metrics.incrementJobCreated(job.name);
    });

    this.boss.on('job-completed', (job) => {
      logger.info('Job completed', { jobId: job.id, type: job.name });
      this.metrics.incrementJobCompleted(job.name);
    });

    this.boss.on('job-failed', (job) => {
      logger.error('Job failed', { jobId: job.id, type: job.name, error: job.output });
      this.metrics.incrementJobFailed(job.name);
    });
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    
    await this.boss.start();
    this.isStarted = true;
    logger.info('pg-boss started');
  }

  async stop(): Promise<void> {
    if (!this.isStarted) return;
    
    await this.boss.stop({ graceful: true, wait: true });
    this.isStarted = false;
    logger.info('pg-boss stopped');
  }

  // Job creation methods
  async createEvaluationJob(payload: EvaluationJob, options?: PgBoss.SendOptions): Promise<string> {
    const validated = evaluationJobSchema.parse(payload);
    const jobOptions: PgBoss.SendOptions = {
      priority: validated.priority,
      expireInSeconds: validated.timeout || 3600,
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      ...options,
    };
    
    return await this.boss.send(JOB_TYPES.EVALUATION, validated, jobOptions);
  }

  async createBatchJob(payload: BatchJob): Promise<string> {
    const validated = batchJobSchema.parse(payload);
    return await this.boss.send(JOB_TYPES.BATCH, validated, {
      priority: 10, // High priority for batches
      singletonKey: validated.batchId, // Prevent duplicate batches
    });
  }

  async createImportJob(payload: ImportJob): Promise<string> {
    const validated = importJobSchema.parse(payload);
    return await this.boss.send(JOB_TYPES.IMPORT, validated, {
      priority: 5,
      singletonKey: validated.url, // Prevent duplicate imports of same URL
    });
  }

  // Worker registration
  async registerHandler(jobType: string, handler: (job: PgBoss.Job) => Promise<void>, options?: PgBoss.WorkOptions) {
    const defaultOptions: PgBoss.WorkOptions = {
      teamSize: 5,
      teamConcurrency: 2,
      newJobCheckInterval: 1000,
      ...options,
    };

    await this.boss.work(jobType, defaultOptions, handler);
    this.handlers.set(jobType, handler);
    logger.info(`Registered handler for ${jobType}`);
  }

  // Monitoring methods
  async getQueueStatus() {
    const states = await this.boss.getQueueSize();
    const completedCount = await this.boss.getCompletedCount();
    const failedCount = await this.boss.getFailedCount();
    
    return {
      pending: states,
      completed: completedCount,
      failed: failedCount,
      metrics: this.metrics.getMetrics(),
    };
  }

  // Utility methods
  async retryJob(jobId: string): Promise<void> {
    await this.boss.retry(jobId);
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.boss.cancel(jobId);
  }

  async getJob(jobId: string): Promise<PgBoss.Job | null> {
    return await this.boss.getJobById(jobId);
  }
}
```

## Phase 2: Worker Migration (Week 1-2)

### 2.1 Create New Worker Implementation
**File**: `internal-packages/jobs/src/pgboss/workers/EvaluationWorker.ts`
```typescript
import PgBoss from 'pg-boss';
import { JobOrchestrator } from '../../core/JobOrchestrator';
import { prisma } from '@roast/db';
import { logger } from '../../utils/logger';
import { EvaluationJob, evaluationJobSchema } from '../types';
import { withHeliconeSession } from '@roast/ai';

export class EvaluationWorker {
  private orchestrator: JobOrchestrator;

  constructor() {
    this.orchestrator = new JobOrchestrator();
  }

  async handle(job: PgBoss.Job<EvaluationJob>): Promise<void> {
    const startTime = Date.now();
    const payload = evaluationJobSchema.parse(job.data);
    
    logger.info('Processing evaluation job', {
      jobId: job.id,
      evaluationId: payload.evaluationId,
      attempt: job.retryCount + 1,
    });

    try {
      // Update evaluation status
      await prisma.evaluation.update({
        where: { id: payload.evaluationId },
        data: { 
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // Process with Helicone session if provided
      const result = payload.heliconeSessionId
        ? await withHeliconeSession(payload.heliconeSessionId, () =>
            this.orchestrator.processEvaluation(payload.evaluationId)
          )
        : await this.orchestrator.processEvaluation(payload.evaluationId);

      // Update evaluation with results
      await prisma.evaluation.update({
        where: { id: payload.evaluationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: result as any, // Type assertion for Prisma JSON
          processingTimeMs: Date.now() - startTime,
        },
      });

      logger.info('Evaluation completed', {
        jobId: job.id,
        evaluationId: payload.evaluationId,
        duration: Date.now() - startTime,
      });

    } catch (error) {
      logger.error('Evaluation failed', {
        jobId: job.id,
        evaluationId: payload.evaluationId,
        error,
        attempt: job.retryCount + 1,
      });

      // Update evaluation status
      await prisma.evaluation.update({
        where: { id: payload.evaluationId },
        data: {
          status: job.retryCount >= job.retryLimit ? 'FAILED' : 'PENDING',
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Re-throw to trigger pg-boss retry
      throw error;
    }
  }
}
```

### 2.2 Create Batch Worker
**File**: `internal-packages/jobs/src/pgboss/workers/BatchWorker.ts`
```typescript
import PgBoss from 'pg-boss';
import { JobManager } from '../JobManager';
import { BatchJob, batchJobSchema, EvaluationJob } from '../types';
import { prisma } from '@roast/db';
import { logger } from '../../utils/logger';

export class BatchWorker {
  constructor(private jobManager: JobManager) {}

  async handle(job: PgBoss.Job<BatchJob>): Promise<void> {
    const payload = batchJobSchema.parse(job.data);
    
    logger.info('Processing batch job', {
      jobId: job.id,
      batchId: payload.batchId,
      count: payload.evaluationIds.length,
    });

    try {
      // Create individual evaluation jobs
      const jobIds: string[] = [];
      
      for (const evaluationId of payload.evaluationIds) {
        const evaluation = await prisma.evaluation.findUnique({
          where: { id: evaluationId },
          include: { agent: true },
        });

        if (!evaluation) {
          logger.warn(`Evaluation ${evaluationId} not found`);
          continue;
        }

        const jobPayload: EvaluationJob = {
          evaluationId: evaluation.id,
          documentId: evaluation.documentId,
          agentId: evaluation.agentId,
          agentVersionId: evaluation.agentVersionId,
          priority: 5,
          timeout: evaluation.agent.timeout || 3600,
        };

        const jobId = await this.jobManager.createEvaluationJob(jobPayload);
        jobIds.push(jobId);
      }

      // Update batch status
      await prisma.batch.update({
        where: { id: payload.batchId },
        data: {
          status: 'PROCESSING',
          jobIds,
        },
      });

      logger.info('Batch jobs created', {
        batchId: payload.batchId,
        jobCount: jobIds.length,
      });

    } catch (error) {
      logger.error('Batch processing failed', {
        jobId: job.id,
        batchId: payload.batchId,
        error,
      });
      throw error;
    }
  }
}
```

### 2.3 Create Worker Manager
**File**: `internal-packages/jobs/src/pgboss/WorkerManager.ts`
```typescript
import { JobManager } from './JobManager';
import { EvaluationWorker } from './workers/EvaluationWorker';
import { BatchWorker } from './workers/BatchWorker';
import { ImportWorker } from './workers/ImportWorker';
import { JOB_TYPES } from './types';
import { logger } from '../utils/logger';

export class WorkerManager {
  private jobManager: JobManager;
  private evaluationWorker: EvaluationWorker;
  private batchWorker: BatchWorker;
  private importWorker: ImportWorker;
  private isRunning = false;

  constructor() {
    this.jobManager = new JobManager();
    this.evaluationWorker = new EvaluationWorker();
    this.batchWorker = new BatchWorker(this.jobManager);
    this.importWorker = new ImportWorker(this.jobManager);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('WorkerManager already running');
      return;
    }

    try {
      // Start pg-boss
      await this.jobManager.start();

      // Register handlers with appropriate concurrency
      await this.jobManager.registerHandler(
        JOB_TYPES.EVALUATION,
        this.evaluationWorker.handle.bind(this.evaluationWorker),
        {
          teamSize: 10, // Number of workers
          teamConcurrency: 2, // Jobs per worker
          newJobCheckInterval: 500,
        }
      );

      await this.jobManager.registerHandler(
        JOB_TYPES.BATCH,
        this.batchWorker.handle.bind(this.batchWorker),
        {
          teamSize: 2,
          teamConcurrency: 1,
        }
      );

      await this.jobManager.registerHandler(
        JOB_TYPES.IMPORT,
        this.importWorker.handle.bind(this.importWorker),
        {
          teamSize: 3,
          teamConcurrency: 1,
        }
      );

      this.isRunning = true;
      logger.info('WorkerManager started successfully');

      // Setup graceful shutdown
      this.setupShutdownHandlers();

    } catch (error) {
      logger.error('Failed to start WorkerManager', { error });
      throw error;
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping WorkerManager');
    await this.jobManager.stop();
    this.isRunning = false;
    logger.info('WorkerManager stopped');
  }

  getJobManager(): JobManager {
    return this.jobManager;
  }
}
```

## Phase 3: API Integration (Week 2)

### 3.1 Update Job Service
**File**: `apps/web/src/application/services/JobService.ts`
```typescript
import { JobManager } from '@roast/jobs/pgboss';
import { EvaluationJob } from '@roast/jobs/pgboss/types';
import { prisma } from '@roast/db';

export class JobService {
  private jobManager: JobManager;
  private usePgBoss: boolean;

  constructor() {
    this.jobManager = new JobManager();
    // Feature flag for gradual rollout
    this.usePgBoss = process.env.USE_PGBOSS === 'true';
  }

  async initialize(): Promise<void> {
    if (this.usePgBoss) {
      await this.jobManager.start();
    }
  }

  async createEvaluationJob(
    evaluationId: string,
    options?: { priority?: number; timeout?: number }
  ): Promise<string> {
    if (!this.usePgBoss) {
      // Legacy path - use existing system
      return await this.createLegacyJob(evaluationId);
    }

    // Fetch evaluation details
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { agent: true },
    });

    if (!evaluation) {
      throw new Error(`Evaluation ${evaluationId} not found`);
    }

    // Create pg-boss job
    const jobPayload: EvaluationJob = {
      evaluationId: evaluation.id,
      documentId: evaluation.documentId,
      agentId: evaluation.agentId,
      agentVersionId: evaluation.agentVersionId,
      priority: options?.priority ?? 5,
      timeout: options?.timeout ?? evaluation.agent.timeout ?? 3600,
    };

    const jobId = await this.jobManager.createEvaluationJob(jobPayload);

    // Update evaluation with job ID
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { jobId },
    });

    return jobId;
  }

  async createBatchJobs(batchId: string, evaluationIds: string[]): Promise<string> {
    if (!this.usePgBoss) {
      // Legacy batch creation
      return await this.createLegacyBatch(batchId, evaluationIds);
    }

    return await this.jobManager.createBatchJob({
      batchId,
      evaluationIds,
      targetCount: evaluationIds.length,
    });
  }

  async getJobStatus(jobId: string): Promise<any> {
    if (!this.usePgBoss) {
      return await this.getLegacyJobStatus(jobId);
    }

    const job = await this.jobManager.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: job.state,
      createdAt: job.createdOn,
      completedAt: job.completedOn,
      failedAt: job.failedOn,
      retryCount: job.retryCount,
      output: job.output,
    };
  }

  async retryJob(jobId: string): Promise<void> {
    if (!this.usePgBoss) {
      return await this.retryLegacyJob(jobId);
    }

    await this.jobManager.retryJob(jobId);
  }

  // Legacy methods for backward compatibility
  private async createLegacyJob(evaluationId: string): Promise<string> {
    // Existing implementation
    const job = await prisma.job.create({
      data: {
        evaluationId,
        status: 'PENDING',
      },
    });
    return job.id;
  }

  private async createLegacyBatch(batchId: string, evaluationIds: string[]): Promise<string> {
    // Existing batch implementation
    // ...existing code...
    return batchId;
  }

  private async getLegacyJobStatus(jobId: string): Promise<any> {
    // Existing status check
    return await prisma.job.findUnique({ where: { id: jobId } });
  }

  private async retryLegacyJob(jobId: string): Promise<void> {
    // Existing retry logic
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PENDING', attempts: { increment: 1 } },
    });
  }
}
```

### 3.2 Update API Routes
**File**: `apps/web/src/app/api/batches/route.ts` (example)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { JobService } from '@/application/services/JobService';
import { z } from 'zod';

const jobService = new JobService();

// Initialize on server start
if (process.env.USE_PGBOSS === 'true') {
  jobService.initialize().catch(console.error);
}

const createBatchSchema = z.object({
  agentId: z.string(),
  targetCount: z.number().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, targetCount } = createBatchSchema.parse(body);

    // Create batch record
    const batch = await prisma.batch.create({
      data: {
        agentId,
        targetCount,
        status: 'PENDING',
      },
    });

    // Create evaluation records
    const evaluationIds = await createEvaluations(batch.id, agentId, targetCount);

    // Create jobs (will use pg-boss if enabled)
    const jobId = await jobService.createBatchJobs(batch.id, evaluationIds);

    return NextResponse.json({
      batchId: batch.id,
      jobId,
      evaluationCount: evaluationIds.length,
    });

  } catch (error) {
    console.error('Failed to create batch', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}
```

## Phase 4: Database Migration (Week 2-3)

### 4.1 Create pg-boss Schema
**File**: `internal-packages/db/prisma/migrations/20240XXX_add_pgboss/migration.sql`
```sql
-- Create pg-boss schema (pg-boss will create its own tables)
CREATE SCHEMA IF NOT EXISTS pgboss;

-- Add job tracking columns to existing tables
ALTER TABLE "Evaluation" ADD COLUMN IF NOT EXISTS "pgBossJobId" TEXT;
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "pgBossJobIds" TEXT[];

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Evaluation_pgBossJobId_idx" ON "Evaluation"("pgBossJobId");
CREATE INDEX IF NOT EXISTS "Batch_pgBossJobIds_idx" ON "Batch" USING GIN("pgBossJobIds");

-- Add migration status tracking
CREATE TABLE IF NOT EXISTS "JobMigrationStatus" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "legacyJobId" TEXT NOT NULL,
  "pgBossJobId" TEXT,
  "migratedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING'
);
```

### 4.2 Create Migration Script
**File**: `internal-packages/jobs/src/migration/migrate-to-pgboss.ts`
```typescript
import { prisma } from '@roast/db';
import { JobManager } from '../pgboss/JobManager';
import { logger } from '../utils/logger';

export class JobMigrator {
  private jobManager: JobManager;
  private batchSize = 100;

  constructor() {
    this.jobManager = new JobManager();
  }

  async migrate(): Promise<void> {
    logger.info('Starting job migration to pg-boss');

    try {
      await this.jobManager.start();

      // Migrate pending jobs
      await this.migratePendingJobs();

      // Update configuration
      await this.updateConfiguration();

      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    } finally {
      await this.jobManager.stop();
    }
  }

  private async migratePendingJobs(): Promise<void> {
    const pendingJobs = await prisma.job.findMany({
      where: { status: 'PENDING' },
      take: this.batchSize,
      include: { evaluation: true },
    });

    logger.info(`Found ${pendingJobs.length} pending jobs to migrate`);

    for (const job of pendingJobs) {
      try {
        // Create pg-boss job
        const pgBossJobId = await this.jobManager.createEvaluationJob({
          evaluationId: job.evaluationId,
          documentId: job.evaluation.documentId,
          agentId: job.evaluation.agentId,
          agentVersionId: job.evaluation.agentVersionId,
          priority: 5,
        });

        // Track migration
        await prisma.jobMigrationStatus.create({
          data: {
            legacyJobId: job.id,
            pgBossJobId,
            migratedAt: new Date(),
            status: 'MIGRATED',
          },
        });

        // Update evaluation
        await prisma.evaluation.update({
          where: { id: job.evaluationId },
          data: { pgBossJobId },
        });

        logger.info(`Migrated job ${job.id} -> ${pgBossJobId}`);
      } catch (error) {
        logger.error(`Failed to migrate job ${job.id}`, { error });
      }
    }
  }

  private async updateConfiguration(): Promise<void> {
    // Update feature flags or configuration
    // This could be in database, environment variables, or config files
    logger.info('Updating configuration to use pg-boss');
  }
}

// CLI runner
if (require.main === module) {
  const migrator = new JobMigrator();
  migrator.migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
```

## Phase 5: Monitoring & Observability (Week 3)

### 5.1 Create Metrics Collector
**File**: `internal-packages/jobs/src/pgboss/metrics.ts`
```typescript
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;
  private jobsCreated: Counter;
  private jobsCompleted: Counter;
  private jobsFailed: Counter;
  private jobDuration: Histogram;
  private queueSize: Gauge;
  private activeWorkers: Gauge;

  constructor() {
    this.registry = new Registry();

    // Define metrics
    this.jobsCreated = new Counter({
      name: 'pgboss_jobs_created_total',
      help: 'Total number of jobs created',
      labelNames: ['job_type'],
      registers: [this.registry],
    });

    this.jobsCompleted = new Counter({
      name: 'pgboss_jobs_completed_total',
      help: 'Total number of jobs completed',
      labelNames: ['job_type'],
      registers: [this.registry],
    });

    this.jobsFailed = new Counter({
      name: 'pgboss_jobs_failed_total',
      help: 'Total number of jobs failed',
      labelNames: ['job_type'],
      registers: [this.registry],
    });

    this.jobDuration = new Histogram({
      name: 'pgboss_job_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['job_type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.queueSize = new Gauge({
      name: 'pgboss_queue_size',
      help: 'Current queue size',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.activeWorkers = new Gauge({
      name: 'pgboss_active_workers',
      help: 'Number of active workers',
      labelNames: ['job_type'],
      registers: [this.registry],
    });
  }

  incrementJobCreated(jobType: string): void {
    this.jobsCreated.inc({ job_type: jobType });
  }

  incrementJobCompleted(jobType: string): void {
    this.jobsCompleted.inc({ job_type: jobType });
  }

  incrementJobFailed(jobType: string): void {
    this.jobsFailed.inc({ job_type: jobType });
  }

  recordJobDuration(jobType: string, durationSeconds: number): void {
    this.jobDuration.observe({ job_type: jobType }, durationSeconds);
  }

  setQueueSize(state: string, size: number): void {
    this.queueSize.set({ state }, size);
  }

  setActiveWorkers(jobType: string, count: number): void {
    this.activeWorkers.set({ job_type: jobType }, count);
  }

  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  incrementError(errorType: string): void {
    // Additional error tracking if needed
  }
}
```

### 5.2 Create Monitoring Dashboard
**File**: `apps/web/src/app/api/admin/jobs/metrics/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { JobManager } from '@roast/jobs/pgboss';
import { requireAdmin } from '@/lib/auth';

const jobManager = new JobManager();

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const metrics = await jobManager.getQueueStatus();
    
    return NextResponse.json({
      queue: metrics,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

### 5.3 Create Health Check Endpoint
**File**: `apps/web/src/app/api/health/jobs/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { JobManager } from '@roast/jobs/pgboss';
import { prisma } from '@roast/db';

const jobManager = new JobManager();

export async function GET() {
  try {
    // Check pg-boss connection
    const queueStatus = await jobManager.getQueueStatus();
    
    // Check for stuck jobs
    const stuckJobs = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM pgboss.job
      WHERE state = 'active'
      AND startedon < NOW() - INTERVAL '1 hour'
    `;

    // Check worker health
    const lastProcessed = await prisma.$queryRaw`
      SELECT MAX(completedon) as last_completed
      FROM pgboss.job
      WHERE state = 'completed'
    `;

    const isHealthy = 
      queueStatus.pending < 1000 && // Queue not backed up
      stuckJobs[0].count === 0 && // No stuck jobs
      Date.now() - new Date(lastProcessed[0].last_completed).getTime() < 300000; // Processed in last 5 min

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      details: {
        queue: queueStatus,
        stuckJobs: stuckJobs[0].count,
        lastProcessed: lastProcessed[0].last_completed,
      },
    }, {
      status: isHealthy ? 200 : 503,
    });

  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 503 }
    );
  }
}
```

## Phase 6: Deployment & Rollout (Week 3-4)

### 6.1 Environment Configuration
**File**: `.env.example` additions
```bash
# pg-boss Configuration
USE_PGBOSS=false                    # Feature flag for gradual rollout
PGBOSS_SCHEMA=pgboss                # Schema name for pg-boss tables
PGBOSS_MONITOR_INTERVAL=30          # State monitoring interval in seconds
PGBOSS_MAINTENANCE_INTERVAL=120     # Maintenance interval in seconds
PGBOSS_ARCHIVE_COMPLETED_AFTER=86400 # Archive completed jobs after (seconds)
PGBOSS_DELETE_AFTER_DAYS=7          # Delete archived jobs after (days)

# Worker Configuration
PGBOSS_EVALUATION_WORKERS=10        # Number of evaluation workers
PGBOSS_EVALUATION_CONCURRENCY=2     # Jobs per evaluation worker
PGBOSS_BATCH_WORKERS=2              # Number of batch workers
PGBOSS_IMPORT_WORKERS=3             # Number of import workers
```

### 6.2 Docker Configuration
**File**: `Dockerfile` updates
```dockerfile
# Add pg-boss initialization
RUN pnpm --filter @roast/jobs run build

# Add health check for job system
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/jobs || exit 1
```

### 6.3 Deployment Script
**File**: `dev/scripts/deploy-pgboss.sh`
```bash
#!/bin/bash
set -e

echo "Starting pg-boss deployment..."

# 1. Backup database
echo "Creating database backup..."
pg_dump -U postgres -d roast_my_post > backup_pgboss_$(date +%Y%m%d_%H%M%S).sql

# 2. Run database migrations
echo "Running database migrations..."
pnpm --filter @roast/db run db:push

# 3. Initialize pg-boss schema
echo "Initializing pg-boss schema..."
npx pg-boss migrate --schema pgboss

# 4. Deploy with feature flag disabled
echo "Deploying with pg-boss disabled..."
USE_PGBOSS=false npm run deploy

# 5. Run migration script for existing jobs
echo "Migrating existing jobs..."
pnpm --filter @roast/jobs run migrate:pgboss

# 6. Enable for 10% of traffic (canary)
echo "Enabling pg-boss for canary (10%)..."
# Update load balancer or feature flag service

# 7. Monitor metrics
echo "Monitoring deployment..."
curl http://localhost:3000/api/admin/jobs/metrics

echo "Deployment complete. Monitor metrics and gradually increase rollout."
```

### 6.4 Rollback Plan
**File**: `dev/scripts/rollback-pgboss.sh`
```bash
#!/bin/bash
set -e

echo "Rolling back pg-boss deployment..."

# 1. Disable pg-boss feature flag
export USE_PGBOSS=false

# 2. Stop pg-boss workers
pkill -f "pgboss-worker" || true

# 3. Restore database if needed
if [ -f "$1" ]; then
  echo "Restoring database from $1..."
  psql -U postgres -d roast_my_post < "$1"
fi

# 4. Restart application with legacy system
npm run deploy

echo "Rollback complete. Legacy job system restored."
```

## Phase 7: Testing Strategy (Throughout)

### 7.1 Unit Tests
**File**: `internal-packages/jobs/src/pgboss/__tests__/JobManager.test.ts`
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JobManager } from '../JobManager';
import { EvaluationJob } from '../types';

describe('JobManager', () => {
  let jobManager: JobManager;

  beforeEach(async () => {
    jobManager = new JobManager();
    await jobManager.start();
  });

  afterEach(async () => {
    await jobManager.stop();
  });

  describe('createEvaluationJob', () => {
    it('should create evaluation job with correct payload', async () => {
      const payload: EvaluationJob = {
        evaluationId: 'eval-123',
        documentId: 'doc-456',
        agentId: 'agent-789',
        agentVersionId: 'version-001',
        priority: 5,
      };

      const jobId = await jobManager.createEvaluationJob(payload);
      expect(jobId).toBeTruthy();

      const job = await jobManager.getJob(jobId);
      expect(job?.data).toMatchObject(payload);
    });

    it('should handle priority correctly', async () => {
      const highPriority: EvaluationJob = {
        evaluationId: 'eval-high',
        documentId: 'doc-1',
        agentId: 'agent-1',
        agentVersionId: 'v1',
        priority: 10,
      };

      const lowPriority: EvaluationJob = {
        evaluationId: 'eval-low',
        documentId: 'doc-2',
        agentId: 'agent-2',
        agentVersionId: 'v2',
        priority: 1,
      };

      const highId = await jobManager.createEvaluationJob(highPriority);
      const lowId = await jobManager.createEvaluationJob(lowPriority);

      // High priority job should be processed first
      // Add assertions based on processing order
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed jobs', async () => {
      // Test retry logic
    });
  });
});
```

### 7.2 Integration Tests
**File**: `apps/web/src/app/api/batches/__tests__/pgboss-integration.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JobManager } from '@roast/jobs/pgboss';
import { WorkerManager } from '@roast/jobs/pgboss/WorkerManager';
import { prisma } from '@roast/db';

describe('pg-boss Integration', () => {
  let jobManager: JobManager;
  let workerManager: WorkerManager;

  beforeAll(async () => {
    jobManager = new JobManager();
    workerManager = new WorkerManager();
    await jobManager.start();
    await workerManager.start();
  });

  afterAll(async () => {
    await workerManager.stop();
    await jobManager.stop();
  });

  it('should process evaluation end-to-end', async () => {
    // Create test data
    const document = await prisma.document.create({
      data: { title: 'Test Doc', content: 'Test content' },
    });

    const agent = await prisma.agent.create({
      data: { name: 'Test Agent', purpose: 'ASSESSOR' },
    });

    const evaluation = await prisma.evaluation.create({
      data: {
        documentId: document.id,
        agentId: agent.id,
        agentVersionId: agent.latestVersionId,
        status: 'PENDING',
      },
    });

    // Create job
    const jobId = await jobManager.createEvaluationJob({
      evaluationId: evaluation.id,
      documentId: document.id,
      agentId: agent.id,
      agentVersionId: agent.latestVersionId,
      priority: 5,
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check results
    const updatedEval = await prisma.evaluation.findUnique({
      where: { id: evaluation.id },
    });

    expect(updatedEval?.status).toBe('COMPLETED');
    expect(updatedEval?.pgBossJobId).toBe(jobId);
  });
});
```

### 7.3 Load Testing
**File**: `dev/scripts/load-test-pgboss.ts`
```typescript
import { JobManager } from '@roast/jobs/pgboss';
import { performance } from 'perf_hooks';

async function loadTest() {
  const jobManager = new JobManager();
  await jobManager.start();

  const jobCount = 1000;
  const startTime = performance.now();
  const jobIds: string[] = [];

  console.log(`Creating ${jobCount} jobs...`);

  // Create jobs
  for (let i = 0; i < jobCount; i++) {
    const jobId = await jobManager.createEvaluationJob({
      evaluationId: `eval-${i}`,
      documentId: `doc-${i}`,
      agentId: 'agent-test',
      agentVersionId: 'v1',
      priority: Math.floor(Math.random() * 10),
    });
    jobIds.push(jobId);
  }

  const creationTime = performance.now() - startTime;
  console.log(`Created ${jobCount} jobs in ${creationTime}ms`);
  console.log(`Average: ${creationTime / jobCount}ms per job`);

  // Monitor completion
  let completed = 0;
  const checkInterval = setInterval(async () => {
    const status = await jobManager.getQueueStatus();
    completed = status.completed;
    console.log(`Progress: ${completed}/${jobCount} completed`);
    
    if (completed >= jobCount) {
      clearInterval(checkInterval);
      const totalTime = performance.now() - startTime;
      console.log(`All jobs completed in ${totalTime}ms`);
      console.log(`Throughput: ${jobCount / (totalTime / 1000)} jobs/sec`);
      await jobManager.stop();
      process.exit(0);
    }
  }, 1000);
}

loadTest().catch(console.error);
```

## Phase 8: Cleanup & Optimization (Week 4)

### 8.1 Remove Legacy Code
After successful migration and verification:
1. Remove old Job table and related models
2. Remove legacy JobRepository and JobService
3. Remove process-job.ts and process-adaptive.ts
4. Clean up unused dependencies

### 8.2 Performance Tuning
```typescript
// Optimize pg-boss configuration based on metrics
const optimizedConfig = {
  // Connection pool
  max: 20,                     // Max pool connections
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  
  // Job processing
  newJobCheckInterval: 200,    // Faster for real-time
  teamSize: 15,                // Based on load testing
  teamConcurrency: 3,          // Jobs per worker
  
  // Maintenance
  archiveCompletedAfterSeconds: 3600,  // 1 hour
  deleteAfterDays: 3,          // Reduce storage
};
```

### 8.3 Documentation Updates
1. Update README with pg-boss information
2. Create runbooks for common operations
3. Document monitoring and alerting setup
4. Update API documentation

## Success Metrics

### Performance Targets
- Job creation latency: < 10ms (from ~50ms)
- Worker startup time: < 100ms (from ~2s)
- Memory per worker: < 50MB (from 100MB)
- Queue throughput: > 100 jobs/sec
- Failure rate: < 0.1%

### Operational Improvements
- Zero worker crashes (from daily crashes)
- Real-time job processing (from 1s polling)
- Automatic retries with backoff
- Built-in metrics and monitoring
- Graceful shutdown and recovery

## Risk Mitigation

### Gradual Rollout Strategy
1. **Week 1**: Deploy to staging, run parallel with legacy
2. **Week 2**: Enable for 10% production traffic
3. **Week 3**: Increase to 50% if metrics good
4. **Week 4**: Full rollout with legacy fallback ready

### Monitoring Checklist
- [ ] Queue depth stays under 1000
- [ ] No jobs stuck > 1 hour
- [ ] Worker memory stable
- [ ] Database connections < 80% of pool
- [ ] Error rate < 1%
- [ ] P95 latency < 30s for evaluations

### Rollback Triggers
- Error rate > 5%
- Queue depth > 5000
- Worker crashes > 10/hour
- Database connection exhaustion
- P95 latency > 2 minutes

## Conclusion

This comprehensive migration plan addresses all aspects of moving from the custom job system to pg-boss:

1. **Foundation**: Type-safe wrappers and configuration
2. **Workers**: Modern, efficient worker implementation
3. **API**: Seamless integration with feature flags
4. **Database**: Safe migration with rollback capability
5. **Monitoring**: Complete observability solution
6. **Testing**: Comprehensive test coverage
7. **Deployment**: Gradual rollout with safety checks
8. **Documentation**: Full operational runbooks

The migration can be completed in 4 weeks with minimal risk, providing immediate operational improvements and setting the foundation for future scaling.